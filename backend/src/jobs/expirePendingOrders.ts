import prisma from '../prisma';
import { stripe } from '../services/stripe';

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Expira pedidos PENDING cujo `expiresAt` já passou:
 * - Cancela o PaymentIntent na Stripe (ignorando erro caso já esteja finalizado/cancelado).
 * - Marca status CANCELLED, paymentStatus CANCELLED e cancelledAt de forma atômica e idempotente.
 * - Devolve o estoque reservado uma única vez.
 */
export async function expirePendingOrders(now: Date = new Date()): Promise<number> {
  const expiredOrders = await prisma.order.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: now },
    },
    include: { items: true },
  });

  let expiredCount = 0;

  for (const order of expiredOrders) {
    if (order.paymentId) {
      try {
        await stripe.paymentIntents.cancel(order.paymentId);
      } catch {
        // Ignora erro se o PaymentIntent já foi cancelado, pago ou não pode mais ser cancelado
      }
    }

    const didExpire = await prisma.$transaction(async (tx) => {
      // Condicional em status=PENDING e paymentStatus=PENDING garante que o estoque
      // só seja devolvido uma única vez mesmo sob concorrência com webhooks ou outra instância.
      const updated = await tx.order.updateMany({
        where: {
          id: order.id,
          status: 'PENDING',
          paymentStatus: 'PENDING',
        },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      if (updated.count === 0) return false;

      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      return true;
    });

    if (didExpire) {
      expiredCount += 1;
      console.log(`[expirePendingOrders] Pedido ${order.id} expirado e estoque devolvido.`);
    }
  }

  return expiredCount;
}

let isRunning = false;

export function startExpirePendingOrdersJob(intervalMs: number = DEFAULT_INTERVAL_MS): NodeJS.Timeout {
  const run = async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      await expirePendingOrders();
    } catch (error) {
      console.error('[expirePendingOrders] Erro ao expirar pedidos pendentes:', error);
    } finally {
      isRunning = false;
    }
  };

  const timer = setInterval(run, intervalMs);
  timer.unref();
  return timer;
}
