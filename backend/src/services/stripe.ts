import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  throw new Error('STRIPE_SECRET_KEY não definida nas variáveis de ambiente');
}

// Instância única. A chave vem exclusivamente do ambiente (.env / docker-compose).
export const stripe = new Stripe(secretKey);
