import prisma from '../prisma';
import { stripe } from '../services/stripe';
import { sendOrderCancelledEmail } from '../services/mailer';
import { handlePaymentSucceeded } from '../controllers/payment.controller';

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

function isAlreadyCanceledError(err: any): boolean {
  const code = String(err?.code || '').toLowerCase();
  const message = String(err?.message || '').toLowerCase();
  const piStatus = String(err?.payment_intent?.status || err?.raw?.payment_intent?.status || '').toLowerCase();
  if (piStatus === 'canceled') return true;
  if (code === 'payment_intent_unexpected_state' && message.includes('canceled')) return true;
  if (message.includes('already canceled') || message.includes('status of canceled')) return true;
  return false;
}

/**
 * Expira pedidos PENDING cujo `expiresAt` já passou:
 * - Só cancela o pedido no banco e devolve o estoque DEPOIS que a Stripe confirmar o cancelamento
 *   do PaymentIntent (ou confirmar que ele já está `canceled`).
 * - Se o PaymentIntent estiver `processing` ou `succeeded` (ou se o cancelamento na Stripe falhar
 *   por qualquer motivo que não seja "já cancelado"), NÃO expira o pedido naquele ciclo:
 *   registra o motivo no log e deixa para o próximo ciclo ou webhook.
 * - `requires_action` (QR code Pix gerado e ainda não pago) é cancelável normalmente.
 * - Marca status CANCELLED, paymentStatus CANCELLED e cancelledAt de forma atômica e idempotente.
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
      let currentStatus: string | undefined;

      try {
        const pi = await stripe.paymentIntents.retrieve(order.paymentId);
        currentStatus = pi.status;

        if (pi.status === 'succeeded') {
          console.log(
            `[expirePendingOrders] Pedido ${order.id} (pi=${order.paymentId}) já consta como succeeded na Stripe. Reconciliando pagamento em vez de expirar.`
          );
          await handlePaymentSucceeded(pi);
          continue;
        }

        if (pi.status === 'processing') {
          console.warn(
            `[expirePendingOrders] Pedido ${order.id} (pi=${order.paymentId}) está com status 'processing' na Stripe. Adiando expiração para o próximo ciclo.`
          );
          continue;
        }
      } catch (retrieveErr: any) {
        // Caso retrieve não esteja configurado/mockado, tentamos cancelar diretamente abaixo
        console.warn(
          `[expirePendingOrders] Não foi possível consultar PaymentIntent ${order.paymentId} do pedido ${order.id}: ${retrieveErr?.message || retrieveErr}`
        );
      }

      if (currentStatus !== 'canceled') {
        try {
          const cancelledPi = await stripe.paymentIntents.cancel(order.paymentId);
          if (cancelledPi && cancelledPi.status && cancelledPi.status !== 'canceled') {
            console.warn(
              `[expirePendingOrders] Cancelamento do PaymentIntent ${order.paymentId} (pedido ${order.id}) retornou status '${cancelledPi.status}'. Adiando expiração.`
            );
            continue;
          }
        } catch (cancelErr: any) {
          if (!isAlreadyCanceledError(cancelErr)) {
            console.warn(
              `[expirePendingOrders] Falha ao cancelar PaymentIntent ${order.paymentId} do pedido ${order.id} na Stripe (${cancelErr?.message || cancelErr}). Pedido NÃO foi expirado neste ciclo.`
            );
            continue;
          }
        }
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

      if (order.couponId) {
        await tx.coupon.updateMany({
          where: { id: order.couponId, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
      }

      return true;
    });

    if (didExpire) {
      expiredCount += 1;
      console.log(`[expirePendingOrders] Pedido ${order.id} expirado e estoque devolvido.`);
      await sendOrderCancelledEmail(order.id);
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
