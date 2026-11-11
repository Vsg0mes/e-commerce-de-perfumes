import { Response } from 'express';
import prisma from '../prisma';
import { z } from 'zod';
import Stripe from 'stripe';
import { saveUserAddress, saveUserContact } from '../utils/address';
import { AuthRequest } from '../middlewares/auth.middleware';

// Configuração do Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

const orderSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(1)
  })),
  addressId: z.string().optional(),
  customerInfo: z.object({
    name: z.string(),
    email: z.string().email(),
    cpf: z.string(),
    phone: z.string(),
    zipCode: z.string(),
    street: z.string(),
    number: z.string(),
    complement: z.string().optional(),
    neighborhood: z.string(),
    city: z.string(),
    state: z.string(),
  })
});

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const data = orderSchema.parse(req.body);
    
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuário não encontrado. Faça login novamente.' });
    }

    const address = await saveUserAddress(user.id, data.customerInfo);
    await saveUserContact(user.id, data.customerInfo.cpf, data.customerInfo.phone);

    let totalAmount = 0;
    const orderItemsData = [];

    // Validar estoque e calcular total
    for (const item of data.items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        return res.status(404).json({ success: false, message: `Produto não encontrado: ${item.productId}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `Estoque insuficiente para o produto: ${product.name}` });
      }

      const price = product.promotionalPrice || product.price;
      totalAmount += price * item.quantity;
      orderItemsData.push({
        productId: product.id,
        quantity: item.quantity,
        price: price
      });
    }

    const shippingAmount = 20.00; // Fixed shipping for now
    totalAmount += shippingAmount;

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        addressId: address.id,
        totalAmount,
        shippingAmount,
        items: {
          create: orderItemsData
        }
      },
      include: { items: { include: { product: true } } }
    });

    // Integrar com Stripe (Criar Checkout Session)
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = order.items.map(i => ({
      quantity: i.quantity,
      price_data: {
        currency: 'brl',
        unit_amount: Math.round(i.price * 100),
        product_data: { name: i.product.name },
      },
    }));

    lineItems.push({
      quantity: 1,
      price_data: {
        currency: 'brl',
        unit_amount: Math.round(shippingAmount * 100),
        product_data: { name: 'Frete Fixo' },
      },
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      customer_email: user.email,
      client_reference_id: order.id,
      metadata: { orderId: order.id },
      success_url: `${process.env.FRONTEND_URL}/orders/success?orderId=${order.id}`,
      cancel_url: `${process.env.FRONTEND_URL}/orders/failure?orderId=${order.id}`,
    });

    res.status(201).json({
      success: true,
      message: 'Pedido criado com sucesso',
      data: {
        orderId: order.id,
        paymentUrl: session.url
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

export const getOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        address: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    // Mesma resposta para "não existe" e "não é seu", evitando enumeração de IDs
    const isOwner = order?.userId === req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';
    if (!order || (!isOwner && !isAdmin)) {
      return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};
