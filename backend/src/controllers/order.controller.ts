import { Response } from 'express';
import prisma from '../prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth.middleware';
import { stripe } from '../services/stripe';

// Cliente sempre com select explícito: nunca expor `password`.
const customerSelect = { id: true, name: true, email: true, phone: true } as const;
const itemsInclude = {
  include: { product: { select: { id: true, name: true, image: true, volume: true } } },
} as const;

export const getOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        address: true,
        user: { select: customerSelect },
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

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
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

    if (next === 'CANCELLED') {
      if (order.paymentId) {
        try {
          await stripe.paymentIntents.cancel(order.paymentId);
        } catch {
          // Ignora erro caso o PaymentIntent já esteja finalizado/cancelado
        }
      }

      // Cancela pedido PENDING e devolve o estoque reservado de forma atômica e idempotente
      const cancelled = await prisma.$transaction(async (tx) => {
        const resUpdate = await tx.order.updateMany({
          where: { id, status: 'PENDING', paymentStatus: 'PENDING' },
          data: { status: 'CANCELLED', paymentStatus: 'CANCELLED', cancelledAt: now },
        });
        if (resUpdate.count === 0) return false;

        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
        return true;
      });

      if (!cancelled) {
        return conflict('O pedido foi alterado por outra operação. Recarregue e tente novamente');
      }
    } else {
      const data: Prisma.OrderUpdateManyMutationInput = { status: next };
      if (next === 'SHIPPED') {
        data.trackingCode = trackingCode;
        data.shippedAt = now;
      } else if (next === 'DELIVERED') {
        data.deliveredAt = now;
      }

      // Atômico: só atualiza se o status ainda for o que lemos (evita corrida entre admins/webhook)
      const result = await prisma.order.updateMany({ where: { id, status: current }, data });
      if (result.count === 0) {
        return conflict('O pedido foi alterado por outra operação. Recarregue e tente novamente');
      }
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
