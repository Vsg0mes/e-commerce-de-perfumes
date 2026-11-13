import { Request, Response } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import prisma from '../prisma';
import { stripe } from '../services/stripe';
import { saveUserAddress, saveUserContact } from '../utils/address';
import { AuthRequest } from '../middlewares/auth.middleware';
import { calculateShipping } from '../utils/shipping';


// Apenas ids e quantidades são aceitos do cliente. NUNCA preço/total.
const createIntentSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
      })
    )
    .min(1),
  customerInfo: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    cpf: z.string().min(1),
    phone: z.string().min(1),
    zipCode: z.string().min(1),
    street: z.string().min(1),
    number: z.string().min(1),
    complement: z.string().optional(),
    neighborhood: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
  }),
});

const toCents = (value: number) => Math.round(value * 100);

/**
 * POST /api/payments/create-payment-intent
 * Recalcula o total no servidor a partir do banco e cria o PaymentIntent.
 * Retorna apenas o client_secret (nenhum dado de cartão passa por aqui).
 */
export const createPaymentIntent = async (req: AuthRequest, res: Response) => {
  try {
    const data = createIntentSchema.parse(req.body);

    // Consolida itens duplicados
    const qtyByProduct = new Map<string, number>();
    for (const i of data.items) {
      qtyByProduct.set(i.productId, (qtyByProduct.get(i.productId) || 0) + i.quantity);
    }

    const products = await prisma.product.findMany({
      where: { id: { in: [...qtyByProduct.keys()] }, isActive: true },
    });
    if (products.length !== qtyByProduct.size) {
      return res.status(404).json({ success: false, message: 'Um ou mais produtos não estão disponíveis' });
    }

    let subtotalCents = 0;
    const orderItems = [];
    for (const product of products) {
      const quantity = qtyByProduct.get(product.id)!;
      if (product.stock < quantity) {
        return res.status(400).json({ success: false, message: `Estoque insuficiente: ${product.name}` });
      }
      const unitPrice = product.promotionalPrice || product.price;
      subtotalCents += toCents(unitPrice) * quantity;
      orderItems.push({ productId: product.id, quantity, price: unitPrice });
    }
    // Frete calculado no servidor a partir do CEP (nunca aceito do cliente)
    const shipping = calculateShipping(data.customerInfo.zipCode);
    if (!shipping) {
      return res.status(400).json({ success: false, message: 'CEP inválido ou fora da área de entrega' });
    }
    const amountCents = subtotalCents + toCents(shipping.amount);

    const c = data.customerInfo;
    // Compra permitida apenas para usuários autenticados (rota protegida por `authenticate`)
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuário não encontrado. Faça login novamente.' });
    }

    const address = await saveUserAddress(user.id, c);
    await saveUserContact(user.id, c.cpf, c.phone);

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        addressId: address.id,
        totalAmount: amountCents / 100,
        shippingAmount: shipping.amount,
        items: { create: orderItems },
      },
    });

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: 'brl',
        automatic_payment_methods: { enabled: true },
        receipt_email: user.email,
        metadata: { orderId: order.id },
      },
      { idempotencyKey: `pi_order_${order.id}` }
    );

    await prisma.order.update({ where: { id: order.id }, data: { paymentId: paymentIntent.id } });

    return res.status(201).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        orderId: order.id,
        amount: amountCents / 100,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('create-payment-intent error:', error);
    return res.status(500).json({ success: false, message: 'Erro ao iniciar pagamento' });
  }
};

/** Marca o pedido como pago de forma idempotente (concorrência/retries da Stripe). */
async function handlePaymentSucceeded(pi: Stripe.PaymentIntent) {
  const orderId = pi.metadata?.orderId;
  if (!orderId) return;

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return;

  // Defesa extra: valor cobrado deve bater com o total do pedido
  if (pi.amount_received !== toCents(order.totalAmount) || pi.currency !== 'brl') {
    console.error(`Divergência de valor no pedido ${orderId}: ${pi.amount_received} vs ${toCents(order.totalAmount)}`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    // updateMany condicional = lock otimista; só uma entrega do webhook "vence"
    const updated = await tx.order.updateMany({
      where: { id: orderId, paymentStatus: { not: 'APPROVED' } },
      data: { paymentStatus: 'APPROVED', status: 'PAID', paymentId: pi.id },
    });
    if (updated.count === 0) return;

    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }
  });
}

async function handlePaymentFailed(pi: Stripe.PaymentIntent) {
  const orderId = pi.metadata?.orderId;
  if (!orderId) return;
  await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: 'PENDING' },
    data: { paymentStatus: 'REJECTED', paymentId: pi.id },
  });
}

/**
 * POST /api/payments/webhook
 * Exige corpo BRUTO (express.raw) e valida a assinatura antes de qualquer lógica.
 */
export const webhook = async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return res.status(400).send('Missing signature');
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed');
    return res.status(400).send('Invalid signature');
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        break;
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).send('Internal Server Error'); // Stripe fará retry
  }
};
