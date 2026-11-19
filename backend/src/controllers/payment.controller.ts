import { Request, Response } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import prisma from '../prisma';
import {
  createOrderPaymentIntent,
  getOrderExpirationMinutes,
  stripe,
} from '../services/stripe';
import { saveUserAddress, saveUserContact } from '../utils/address';
import { AuthRequest } from '../middlewares/auth.middleware';
import { calculateShipping } from '../utils/shipping';
import { applyOrderRefundInDb } from './order.controller';
import { sendOrderConfirmedEmail } from '../services/mailer';
import { isValidCpf } from '../utils/cpf';
import {
  calculateCouponDiscountCents,
  getCouponValidationError,
} from './coupon.controller';

class InsufficientStockError extends Error {
  constructor(public productName: string) {
    super(`Estoque insuficiente para o produto: ${productName}`);
    this.name = 'InsufficientStockError';
  }
}

class CouponLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CouponLimitError';
  }
}

// Apenas ids, quantidades e código opcional de cupom são aceitos do cliente. NUNCA preço/desconto/total.
const createIntentSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
      })
    )
    .min(1),
  couponCode: z.string().trim().optional(),
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

const toCents = (value: unknown) => Math.round(Number(value) * 100);

/**
 * POST /api/payments/create-payment-intent
 * Reserva o estoque e o cupom atomicamente, recalcula o total no servidor e cria o PaymentIntent.
 * Retorna apenas o client_secret (nenhum dado de cartão passa por aqui).
 */
export const createPaymentIntent = async (req: AuthRequest, res: Response) => {
  try {
    const data = createIntentSchema.parse(req.body);

    // Consolida itens duplicados e ordena por ID para evitar deadlock em reservas concorrentes
    const qtyByProduct = new Map<string, number>();
    for (const i of data.items) {
      qtyByProduct.set(i.productId, (qtyByProduct.get(i.productId) || 0) + i.quantity);
    }
    const sortedProductIds = [...qtyByProduct.keys()].sort();

    // Valida CPF (dígitos verificadores)
    if (!isValidCpf(data.customerInfo.cpf)) {
      return res.status(400).json({ success: false, message: 'CPF inválido' });
    }

    // Frete calculado no servidor a partir do CEP (nunca aceito do cliente)
    const shipping = calculateShipping(data.customerInfo.zipCode);
    if (!shipping) {
      return res.status(400).json({ success: false, message: 'CEP inválido ou fora da área de entrega' });
    }

    // Garante que a UF informada corresponde à faixa do CEP
    const informedState = data.customerInfo.state.trim().toUpperCase();
    if (informedState !== shipping.state) {
      return res.status(400).json({
        success: false,
        message: `O estado informado (${informedState}) não corresponde ao CEP (${shipping.state})`,
      });
    }

    // Compra permitida apenas para usuários autenticados (rota protegida por `authenticate`)
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuário não encontrado. Faça login novamente.' });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: sortedProductIds }, isActive: true },
    });
    if (products.length !== sortedProductIds.length) {
      return res.status(404).json({ success: false, message: 'Um ou mais produtos não estão disponíveis' });
    }

    const productById = new Map(products.map((p) => [p.id, p]));
    let subtotalCents = 0;
    const orderItems: Array<{ productId: string; quantity: number; price: number }> = [];

    for (const productId of sortedProductIds) {
      const product = productById.get(productId)!;
      const quantity = qtyByProduct.get(productId)!;
      const unitPriceCents = toCents(product.promotionalPrice ?? product.price);
      subtotalCents += unitPriceCents * quantity;
      orderItems.push({ productId: product.id, quantity, price: unitPriceCents / 100 });
    }

    // Validação e cálculo do cupom NO SERVIDOR
    const normalizedCouponCode = data.couponCode?.trim().toUpperCase() || '';
    const coupon = normalizedCouponCode
      ? await prisma.coupon.findUnique({ where: { code: normalizedCouponCode } })
      : null;

    if (normalizedCouponCode) {
      const couponError = getCouponValidationError(coupon, new Date(), subtotalCents);
      if (couponError || !coupon) {
        return res.status(400).json({ success: false, message: couponError || 'Cupom inválido' });
      }
    }

    const discountCents = coupon
      ? calculateCouponDiscountCents(subtotalCents, coupon.discountType, coupon.discountValue)
      : 0;
    const shippingCents = toCents(shipping.amount);
    const itemsAfterDiscountCents = Math.max(0, subtotalCents - discountCents);
    const amountCents = itemsAfterDiscountCents + shippingCents;

    const c = data.customerInfo;
    const address = await saveUserAddress(user.id, c);
    await saveUserContact(user.id, c.cpf, c.phone);

    const expirationMs = getOrderExpirationMinutes() * 60 * 1000;
    const orderExpiresAt = new Date(Date.now() + expirationMs);

    // Reserva atômica de estoque + uso do cupom + criação do pedido PENDING com expiração configurável
    const order = await prisma.$transaction(async (tx) => {
      for (const productId of sortedProductIds) {
        const product = productById.get(productId)!;
        const quantity = qtyByProduct.get(productId)!;
        const reserved = await tx.product.updateMany({
          where: { id: product.id, isActive: true, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });
        if (reserved.count !== 1) {
          throw new InsufficientStockError(product.name);
        }
      }

      if (coupon) {
        const now = new Date();
        const couponReserved = await tx.coupon.updateMany({
          where: {
            id: coupon.id,
            isActive: true,
            startDate: { lte: now },
            expirationDate: { gte: now },
            ...(coupon.usageLimit !== null ? { usedCount: { lt: coupon.usageLimit } } : {}),
          },
          data: { usedCount: { increment: 1 } },
        });
        if (couponReserved.count !== 1) {
          throw new CouponLimitError('Este cupom atingiu o limite máximo de usos ou expirou');
        }
      }

      return tx.order.create({
        data: {
          userId: user.id,
          addressId: address.id,
          totalAmount: amountCents / 100,
          discountAmount: discountCents / 100,
          shippingAmount: shippingCents / 100,
          couponId: coupon ? coupon.id : null,
          expiresAt: orderExpiresAt,
          items: { create: orderItems },
        },
      });
    });

    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent = await createOrderPaymentIntent({
        orderId: order.id,
        amountCents,
        email: user.email,
        expiresAt: order.expiresAt ?? orderExpiresAt,
        idempotencyKey: `pi_order_${order.id}`,
      });
    } catch (stripeErr) {
      // Compensa a reserva de estoque e uso do cupom caso a criação do PaymentIntent na Stripe falhe
      await prisma.$transaction(async (tx) => {
        const cancelled = await tx.order.updateMany({
          where: { id: order.id, status: 'PENDING', paymentStatus: 'PENDING' },
          data: { status: 'CANCELLED', paymentStatus: 'CANCELLED', cancelledAt: new Date() },
        });
        if (cancelled.count === 1) {
          for (const item of orderItems) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            });
          }
          if (order.couponId) {
            await tx.coupon.updateMany({
              where: { id: order.couponId, usedCount: { gt: 0 } },
              data: { usedCount: { decrement: 1 } },
            });
          }
        }
      });
      throw stripeErr;
    }

    await prisma.order.update({ where: { id: order.id }, data: { paymentId: paymentIntent.id } });

    return res.status(201).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        orderId: order.id,
        amount: amountCents / 100,
        discountAmount: discountCents / 100,
        expiresAt: (order.expiresAt ?? orderExpiresAt).toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    if (error instanceof InsufficientStockError || error instanceof CouponLimitError) {
      return res.status(409).json({ success: false, message: error.message });
    }
    console.error('create-payment-intent error:', error);
    return res.status(500).json({ success: false, message: 'Erro ao iniciar pagamento' });
  }
};

/**
 * Marca o pedido como pago de forma idempotente (concorrência/retries da Stripe).
 * O estoque já foi reservado em `createPaymentIntent`.
 * Se o pedido já expirou ou foi cancelado, registra o pagamento e marca para revisão manual.
 */
export async function handlePaymentSucceeded(pi: Stripe.PaymentIntent) {
  const orderId = pi.metadata?.orderId;
  if (!orderId) return;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  // Idempotência: entrega repetida de evento já processado
  if (order.paymentStatus === 'APPROVED') return;

  // Defesa extra: valor cobrado deve bater com o total do pedido
  if (pi.amount_received !== toCents(order.totalAmount) || pi.currency !== 'brl') {
    console.error(`Divergência de valor no pedido ${orderId}: ${pi.amount_received} vs ${toCents(order.totalAmount)}`);
    return;
  }

  // Fluxo normal: pedido ainda PENDING com estoque reservado
  const updated = await prisma.order.updateMany({
    where: { id: orderId, status: 'PENDING', paymentStatus: 'PENDING' },
    data: { paymentStatus: 'APPROVED', status: 'PAID', paymentId: pi.id },
  });
  if (updated.count === 1) {
    await sendOrderConfirmedEmail(orderId);
    return;
  }

  // Pedido já havia expirado, sido cancelado ou rejeitado (estoque já devolvido):
  // preserva o registro do pagamento e sinaliza revisão manual sem abater estoque novamente.
  const reviewUpdated = await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: { not: 'APPROVED' } },
    data: {
      paymentStatus: 'APPROVED',
      paymentId: pi.id,
      needsManualReview: true,
    },
  });
  if (reviewUpdated.count === 1) {
    console.error(
      `[REVISÃO MANUAL] Pagamento aprovado (pi=${pi.id}) recebido para pedido ${orderId} já expirado/cancelado (status=${order.status}, paymentStatus=${order.paymentStatus}). Estoque NÃO foi abatido novamente; pedido marcado com needsManualReview=true.`
    );
  }
}

/**
 * Marca o pagamento como REJECTED, cancela o pedido pendente e devolve o estoque e o uso do cupom
 * uma única vez (idempotente via updateMany condicional).
 */
export async function handlePaymentFailed(pi: Stripe.PaymentIntent) {
  const orderId = pi.metadata?.orderId;
  if (!orderId) return;

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return;

    const updated = await tx.order.updateMany({
      where: { id: orderId, status: 'PENDING', paymentStatus: 'PENDING' },
      data: {
        paymentStatus: 'REJECTED',
        status: 'CANCELLED',
        cancelledAt: new Date(),
        paymentId: pi.id,
      },
    });
    if (updated.count === 0) return;

    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    if (order.couponId) {
      await tx.coupon.updateMany({
        where: { id: order.couponId, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      });
    }
  });
}

/**
 * Trata `charge.refunded` (reembolso iniciado pela API ou diretamente no painel da Stripe).
 * - Reembolso total (`charge.refunded === true` e `charge.amount_refunded === charge.amount`):
 *   atualiza paymentStatus para REFUNDED, cancela o pedido e devolve o estoque/cupom sem duplicar.
 * - Reembolso parcial: não cancela o pedido, não devolve estoque e não altera o cupom;
 *   registra aviso no log e marca `needsManualReview = true` para decisão do admin.
 */
export async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id;
  const orderIdFromMeta = charge.metadata?.orderId;

  if (!paymentIntentId && !orderIdFromMeta) return;

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        ...(paymentIntentId ? [{ paymentId: paymentIntentId }] : []),
        ...(orderIdFromMeta ? [{ id: orderIdFromMeta }] : []),
      ],
    },
    select: { id: true },
  });

  if (!order) return;

  const isFullRefund =
    charge.refunded === true &&
    typeof charge.amount === 'number' &&
    charge.amount > 0 &&
    charge.amount_refunded === charge.amount;

  if (!isFullRefund) {
    console.warn(
      `[REVISÃO MANUAL] Reembolso parcial detectado no pedido ${order.id} (charge=${charge.id}): reembolsado ${charge.amount_refunded} de ${charge.amount} centavos. Pedido mantido ativo e marcado com needsManualReview=true.`
    );
    await prisma.order.updateMany({
      where: { id: order.id },
      data: { needsManualReview: true },
    });
    return;
  }

  await applyOrderRefundInDb(order.id);
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
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
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
