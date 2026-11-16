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

/**
 * Aplica no banco a transição para reembolsado (status CANCELLED, paymentStatus REFUNDED)
 * e devolve o estoque uma única vez caso o pedido estivesse em PAID ou PROCESSING.
 * Idempotente e seguro contra concorrência entre endpoint de reembolso e webhook `charge.refunded`.
 */
export async function applyOrderRefundInDb(orderId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return false;

    const now = new Date();

    // Caso 1: Pedido PAID ou PROCESSING com pagamento aprovado -> cancela, marca REFUNDED e devolve estoque 1x
    const updatedWithStock = await tx.order.updateMany({
      where: {
        id: orderId,
        status: { in: ['PAID', 'PROCESSING'] },
        paymentStatus: 'APPROVED',
      },
      data: {
        status: 'CANCELLED',
        paymentStatus: 'REFUNDED',
        cancelledAt: order.cancelledAt ?? now,
        needsManualReview: false,
      },
    });

    if (updatedWithStock.count === 1) {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
      return true;
    }

    // Caso 2: Pedido já havia sido cancelado/expirado (estoque já devolvido) ou outro estado,
    // mas o pagamento foi reembolsado (ex.: via painel da Stripe): apenas atualiza paymentStatus para REFUNDED.
    const updatedStatusOnly = await tx.order.updateMany({
      where: {
        id: orderId,
        paymentStatus: { not: 'REFUNDED' },
      },
      data: {
        paymentStatus: 'REFUNDED',
        ...(order.status === 'PENDING' || order.status === 'PAID' || order.status === 'PROCESSING'
          ? { status: 'CANCELLED', cancelledAt: order.cancelledAt ?? now }
          : {}),
        needsManualReview: false,
      },
    });

    return updatedStatusOnly.count === 1;
  });
}

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
export const ALLOWED_TRANSITIONS: Record<OrderStatusValue, OrderStatusValue[]> = {
  PENDING: ['CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

const updateStatusSchema = z.object({
  status: orderStatusEnum,
  trackingCode: z.string().trim().max(100, 'Código de rastreio muito longo').optional(),
});

/**
 * POST /api/orders/:id/refund — cancela pedido PAID/PROCESSING e reembolsa 100% na Stripe (ADMIN).
 * Idempotente: chamadas repetidas (duplo clique/retry) geram um único reembolso e devolvem o estoque uma única vez.
 */
export const refundOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: itemsInclude, address: true, user: { select: customerSelect } },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
    }

    // Idempotência: se o pedido já foi reembolsado e cancelado, retorna 200 sem duplicar operação
    if (order.status === 'CANCELLED' && order.paymentStatus === 'REFUNDED') {
      return res.json({
        success: true,
        message: 'Pedido já havia sido cancelado e reembolsado',
        data: order,
      });
    }

    if (order.status === 'SHIPPED' || order.status === 'DELIVERED') {
      return res.status(409).json({
        success: false,
        message: `Não é possível cancelar e reembolsar um pedido com status ${order.status} (já enviado ou entregue)`,
      });
    }

    const isLatePaidCancelled = order.status === 'CANCELLED' && order.paymentStatus === 'APPROVED';
    if (order.status !== 'PAID' && order.status !== 'PROCESSING' && !isLatePaidCancelled) {
      return res.status(409).json({
        success: false,
        message: `Apenas pedidos pagos (PAID ou PROCESSING) podem ser reembolsados (status atual: ${order.status})`,
      });
    }

    if (!order.paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Pedido não possui identificador de pagamento (paymentId) na Stripe para reembolso',
      });
    }

    try {
      await stripe.refunds.create(
        { payment_intent: order.paymentId },
        { idempotencyKey: `refund_${order.id}` }
      );
    } catch (stripeErr: any) {
      // Se já foi reembolsado na Stripe, apenas garante a consistência no banco
      if (stripeErr?.code !== 'charge_already_refunded') {
        console.error('Erro ao criar reembolso na Stripe:', stripeErr);
        return res.status(502).json({
          success: false,
          message: stripeErr?.message || 'Erro ao processar reembolso na Stripe',
        });
      }
    }

    await applyOrderRefundInDb(order.id);

    const updated = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: itemsInclude, address: true, user: { select: customerSelect } },
    });

    return res.json({
      success: true,
      message: 'Pedido cancelado e reembolsado com sucesso',
      data: updated,
    });
  } catch (error) {
    console.error('Error refunding order:', error);
    return res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

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
    if (next === 'CANCELLED' && current === 'SHIPPED') {
      return conflict(`Não é possível cancelar um pedido com status ${current} (já enviado ou entregue)`);
    }
    if (!ALLOWED_TRANSITIONS[current].includes(next)) {
      return conflict(`Não é possível ir de ${current} para ${next}`);
    }
    if (next === 'SHIPPED' && !trackingCode) {
      return res.status(400).json({ success: false, message: 'Informe o código de rastreio para marcar como SHIPPED' });
    }

    // Se o pedido já foi pago (PAID ou PROCESSING) e o admin solicitou CANCELLED, executa o fluxo de reembolso
    if (next === 'CANCELLED' && (current === 'PAID' || current === 'PROCESSING')) {
      return refundOrder(req, res);
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
