import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  throw new Error('STRIPE_SECRET_KEY não definida nas variáveis de ambiente');
}

// Instância única. A chave vem exclusivamente do ambiente (.env / docker-compose).
export const stripe = new Stripe(secretKey);

export type SupportedPaymentMethod = 'card' | 'pix';

const ALLOWED_PAYMENT_METHODS: SupportedPaymentMethod[] = ['card', 'pix'];

// Limites documentados pela Stripe para `payment_method_options.pix.expires_after_seconds` (60s a 14 dias)
export const PIX_MIN_EXPIRES_AFTER_SECONDS = 60;
export const PIX_MAX_EXPIRES_AFTER_SECONDS = 1209600;

/**
 * Lê `STRIPE_PAYMENT_METHODS` do ambiente (lista separada por vírgula, padrão `card,pix`),
 * aceitando apenas `card` e `pix` (rejeita ou ignora métodos não suportados; fallback para `['card', 'pix']` ou `['card']`).
 */
export function getConfiguredPaymentMethods(
  rawEnv: string | undefined = process.env.STRIPE_PAYMENT_METHODS
): SupportedPaymentMethod[] {
  const source = rawEnv && rawEnv.trim().length > 0 ? rawEnv : 'card,pix';
  const parsed = source
    .split(',')
    .map((m) => m.trim().toLowerCase())
    .filter((m): m is SupportedPaymentMethod =>
      (ALLOWED_PAYMENT_METHODS as string[]).includes(m)
    );

  const unique = [...new Set(parsed)];
  return unique.length > 0 ? unique : ['card', 'pix'];
}

/**
 * Lê `ORDER_EXPIRATION_MINUTES` do ambiente (padrão 60 minutos).
 */
export function getOrderExpirationMinutes(
  rawEnv: string | undefined = process.env.ORDER_EXPIRATION_MINUTES
): number {
  const parsed = Number(rawEnv);
  if (Number.isFinite(parsed) && parsed >= 1) {
    return Math.floor(parsed);
  }
  return 60;
}

/**
 * Calcula `expires_after_seconds` para o Pix a partir do `expiresAt` do pedido,
 * limitado ao intervalo documentado pela Stripe (`[60, 1209600]`).
 */
export function calculatePixExpiresAfterSeconds(
  expiresAt: Date,
  now: Date = new Date()
): number {
  const diffSeconds = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
  return Math.min(
    PIX_MAX_EXPIRES_AFTER_SECONDS,
    Math.max(PIX_MIN_EXPIRES_AFTER_SECONDS, diffSeconds)
  );
}

export interface CreateOrderPaymentIntentInput {
  orderId: string;
  amountCents: number;
  email: string;
  expiresAt: Date;
  idempotencyKey: string;
}

/**
 * Função única centralizada para criar PaymentIntent de pedido na Stripe:
 * - Usa `payment_method_types` explícito (baseado em `STRIPE_PAYMENT_METHODS`, sem `automatic_payment_methods`).
 * - Quando `pix` está incluído, configura `payment_method_options.pix.expires_after_seconds` sincronizado com `expiresAt`.
 * - Caso a conta Stripe não tenha Pix habilitado em modo de teste/produção e retorne erro específico de `pix`,
 *   faz fallback automático para `['card']` registrando aviso no log para não bloquear vendas por cartão.
 */
export async function createOrderPaymentIntent({
  orderId,
  amountCents,
  email,
  expiresAt,
  idempotencyKey,
}: CreateOrderPaymentIntentInput): Promise<Stripe.PaymentIntent> {
  const methods = getConfiguredPaymentMethods();
  const includesPix = methods.includes('pix');
  const expiresAfterSeconds = calculatePixExpiresAfterSeconds(expiresAt);

  const baseParams: Stripe.PaymentIntentCreateParams = {
    amount: amountCents,
    currency: 'brl',
    payment_method_types: methods,
    ...(includesPix
      ? {
          payment_method_options: {
            pix: {
              expires_after_seconds: expiresAfterSeconds,
            },
          },
        }
      : {}),
    receipt_email: email,
    metadata: { orderId },
  };

  try {
    return await stripe.paymentIntents.create(baseParams, { idempotencyKey });
  } catch (err: any) {
    const msg = String(err?.message || '').toLowerCase();
    // Se Pix não estiver ativado na conta Stripe mas `card` também estiver habilitado,
    // faz fallback seguro para `['card']` com sufixo na idempotencyKey.
    if (
      includesPix &&
      methods.includes('card') &&
      (msg.includes('pix') || err?.param?.includes?.('payment_method'))
    ) {
      console.warn(
        `[stripe] Pix indisponível na conta Stripe (${err?.message}). Fazendo fallback automático para payment_method_types=['card'] no pedido ${orderId}.`
      );
      return await stripe.paymentIntents.create(
        {
          amount: amountCents,
          currency: 'brl',
          payment_method_types: ['card'],
          receipt_email: email,
          metadata: { orderId },
        },
        { idempotencyKey: `${idempotencyKey}_card_fallback` }
      );
    }
    throw err;
  }
}
