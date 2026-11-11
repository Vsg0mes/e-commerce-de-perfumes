import { Response } from 'express';
import prisma from '../prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
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

// ---------------------------------------------------------------------------
// Meus Pedidos / Admin
// ---------------------------------------------------------------------------

// Cliente sempre com select explícito: nunca expor `password`.
const customerSelect = { id: true, name: true, email: true, phone: true } as const;
const itemsInclude = {
  include: { product: { select: { id: true, name: true, image: true, volume: true } } },
} as const;

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const orderStatusEnum = z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']);
const paymentStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REFUNDED']);

const buildPagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

/** GET /api/orders/mine — pedidos do usuário logado, mais recentes primeiro. */
export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const where = { userId: req.user!.id };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { items: itemsInclude, address: true },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ success: true, data: orders, pagination: buildPagination(page, limit, total) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Error listing my orders:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

const adminListSchema = paginationSchema.extend({
  status: orderStatusEnum.optional(),
  paymentStatus: paymentStatusEnum.optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['asc', 'desc']).default('desc'),
});

/** GET /api/orders/admin — listagem paginada de todos os pedidos (ADMIN). */
export const getAdminOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, status, paymentStatus, q, sort } = adminListSchema.parse(req.query);

    const where: Prisma.OrderWhereInput = {
      ...(status && { status }),
      ...(paymentStatus && { paymentStatus }),
      ...(q && {
        OR: [
          { id: { contains: q, mode: 'insensitive' } },
          { user: { email: { contains: q, mode: 'insensitive' } } },
          { user: { name: { contains: q, mode: 'insensitive' } } },
        ],
      }),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: sort },
        skip: (page - 1) * limit,
        take: limit,
        include: { items: itemsInclude, address: true, user: { select: customerSelect } },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ success: true, data: orders, pagination: buildPagination(page, limit, total) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Error listing admin orders:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

type OrderStatusValue = z.infer<typeof orderStatusEnum>;

// Transições que o admin pode fazer. PAID só é definido pelo webhook do Stripe.
const ALLOWED_TRANSITIONS: Record<OrderStatusValue, OrderStatusValue[]> = {
  PENDING: ['CANCELLED'],
  PAID: ['PROCESSING'],
  PROCESSING: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

const updateStatusSchema = z.object({
  status: orderStatusEnum,
  trackingCode: z.string().trim().max(100, 'Código de rastreio muito longo').optional(),
});

/** PATCH /api/orders/:id/status — muda o status do pedido (ADMIN). */
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status: next, trackingCode } = updateStatusSchema.parse(req.body);

    const order = await prisma.order.findUnique({ where: { id }, select: { status: true, paymentStatus: true } });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
    }
    const current = order.status as OrderStatusValue;
    const conflict = (message: string) => res.status(409).json({ success: false, message });

    if (current === 'DELIVERED' || current === 'CANCELLED') {
      return conflict(`Pedido ${current} é um estado final e não pode ser alterado. Não é possível ir de ${current} para ${next}`);
    }
    if (next === 'PAID') {
      return conflict('O status PAID é definido apenas pela confirmação de pagamento (webhook do Stripe)');
    }
    if (next === 'CANCELLED' && current !== 'PENDING') {
      return conflict(`Pedido ${current} já foi pago e não pode ser cancelado aqui: o cancelamento exigiria reembolso, que ainda não está disponível`);
    }
    if (!ALLOWED_TRANSITIONS[current].includes(next)) {
      return conflict(`Não é possível ir de ${current} para ${next}`);
    }
    if (next === 'SHIPPED' && !trackingCode) {
      return res.status(400).json({ success: false, message: 'Informe o código de rastreio para marcar como SHIPPED' });
    }

    const now = new Date();
    const data: Prisma.OrderUpdateManyMutationInput = { status: next };
    if (next === 'SHIPPED') {
      data.trackingCode = trackingCode;
      data.shippedAt = now;
    } else if (next === 'DELIVERED') {
      data.deliveredAt = now;
    } else if (next === 'CANCELLED') {
      data.cancelledAt = now;
      if (order.paymentStatus === 'PENDING') data.paymentStatus = 'CANCELLED';
    }

    // Atômico: só atualiza se o status ainda for o que lemos (evita corrida entre admins/webhook)
    const result = await prisma.order.updateMany({ where: { id, status: current }, data });
    if (result.count === 0) {
      return conflict('O pedido foi alterado por outra operação. Recarregue e tente novamente');
    }

    const updated = await prisma.order.findUnique({
      where: { id },
      include: { items: itemsInclude, address: true, user: { select: customerSelect } },
    });
    res.json({ success: true, message: 'Status do pedido atualizado', data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};
