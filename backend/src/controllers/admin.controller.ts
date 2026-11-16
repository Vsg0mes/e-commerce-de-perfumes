import { Response } from 'express';
import { OrderStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

const PAID_STATUSES: OrderStatus[] = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
const ALL_STATUSES: OrderStatus[] = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

const statsQuerySchema = z.object({
  lowStockLimit: z.coerce.number().int().min(0).max(1000).default(5),
});

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

/**
 * GET /api/admin/stats
 * Retorna métricas agregadas diretamente do banco (sem carregar todos os pedidos em memória):
 * - Pedidos pagos e receita de hoje, últimos 7 dias e últimos 30 dias
 * - Contagem de pedidos por status
 * - Produtos com estoque baixo (<= lowStockLimit, padrão 5)
 * - Top 5 produtos mais vendidos (em pedidos pagos)
 */
export const getAdminStats = async (req: AuthRequest, res: Response) => {
  try {
    const { lowStockLimit } = statsQuerySchema.parse(req.query);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const paidBaseWhere: Prisma.OrderWhereInput = {
      status: { in: PAID_STATUSES },
      paymentStatus: 'APPROVED',
    };

    const [todayAgg, days7Agg, days30Agg, byStatusRaw, lowStockProducts, topItemsGrouped] =
      await Promise.all([
        prisma.order.aggregate({
          where: { ...paidBaseWhere, createdAt: { gte: startOfToday } },
          _count: { _all: true },
          _sum: { totalAmount: true },
        }),
        prisma.order.aggregate({
          where: { ...paidBaseWhere, createdAt: { gte: last7Days } },
          _count: { _all: true },
          _sum: { totalAmount: true },
        }),
        prisma.order.aggregate({
          where: { ...paidBaseWhere, createdAt: { gte: last30Days } },
          _count: { _all: true },
          _sum: { totalAmount: true },
        }),
        prisma.order.groupBy({
          by: ['status'],
          _count: { _all: true },
        }),
        prisma.product.findMany({
          where: { stock: { lte: lowStockLimit } },
          orderBy: [{ stock: 'asc' }, { name: 'asc' }],
          take: 25,
          select: {
            id: true,
            name: true,
            stock: true,
            price: true,
            promotionalPrice: true,
            isActive: true,
            brand: { select: { name: true } },
          },
        }),
        prisma.orderItem.groupBy({
          by: ['productId'],
          where: { order: paidBaseWhere },
          _sum: { quantity: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 5,
        }),
      ]);

    const ordersByStatus: Record<OrderStatus, number> = {
      PENDING: 0,
      PAID: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };
    for (const row of byStatusRaw) {
      if (ALL_STATUSES.includes(row.status)) {
        ordersByStatus[row.status] = row._count._all;
      }
    }

    const topProductIds = topItemsGrouped.map((i) => i.productId);
    const topProductsDetails = topProductIds.length
      ? await prisma.product.findMany({
          where: { id: { in: topProductIds } },
          select: {
            id: true,
            name: true,
            price: true,
            promotionalPrice: true,
            stock: true,
            image: true,
            brand: { select: { name: true } },
          },
        })
      : [];
    const productMap = new Map(topProductsDetails.map((p) => [p.id, p]));

    const topSellingProducts = topItemsGrouped.map((item) => {
      const p = productMap.get(item.productId);
      return {
        productId: item.productId,
        name: p?.name ?? 'Produto removido',
        brandName: p?.brand.name ?? '—',
        price: p?.promotionalPrice ?? p?.price ?? 0,
        stock: p?.stock ?? 0,
        image: p?.image ?? null,
        totalSold: item._sum.quantity ?? 0,
      };
    });

    res.json({
      success: true,
      data: {
        periods: {
          today: {
            ordersCount: todayAgg._count._all,
            revenue: roundCurrency(todayAgg._sum.totalAmount ?? 0),
          },
          last7Days: {
            ordersCount: days7Agg._count._all,
            revenue: roundCurrency(days7Agg._sum.totalAmount ?? 0),
          },
          last30Days: {
            ordersCount: days30DaysValue(days30Agg._count._all, days30Agg._sum.totalAmount ?? 0).ordersCount,
            revenue: days30DaysValue(days30Agg._count._all, days30Agg._sum.totalAmount ?? 0).revenue,
          },
        },
        ordersByStatus,
        lowStockLimit,
        lowStockProducts,
        topSellingProducts,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};

function days30DaysValue(ordersCount: number, sumTotal: number) {
  return {
    ordersCount,
    revenue: roundCurrency(sumTotal),
  };
}

const customersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  q: z.string().trim().max(100).optional(),
});

/**
 * GET /api/admin/customers
 * Lista paginada de clientes com busca por nome/e-mail, total de pedidos e valor total gasto (em pedidos pagos).
 */
export const getAdminCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, q } = customersQuerySchema.parse(req.query);

    const where: Prisma.UserWhereInput = {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const userIds = users.map((u) => u.id);
    const paidTotalsByUser = userIds.length
      ? await prisma.order.groupBy({
          by: ['userId'],
          where: {
            userId: { in: userIds },
            status: { in: PAID_STATUSES },
            paymentStatus: 'APPROVED',
          },
          _count: { _all: true },
          _sum: { totalAmount: true },
        })
      : [];

    const paidMap = new Map(
      paidTotalsByUser.map((row) => [
        row.userId,
        {
          paidOrdersCount: row._count._all,
          totalSpent: roundCurrency(row._sum.totalAmount ?? 0),
        },
      ])
    );

    const data = users.map((u) => {
      const paidInfo = paidMap.get(u.id) ?? { paidOrdersCount: 0, totalSpent: 0 };
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        createdAt: u.createdAt,
        totalOrders: u._count.orders,
        paidOrdersCount: paidInfo.paidOrdersCount,
        totalSpent: paidInfo.totalSpent,
      };
    });

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    console.error('Error fetching admin customers:', error);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
};
