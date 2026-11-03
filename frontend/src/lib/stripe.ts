import { loadStripe } from '@stripe/stripe-js';
import type { Appearance } from '@stripe/stripe-js';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

if (!publishableKey) {
  console.error('VITE_STRIPE_PUBLISHABLE_KEY não definida');
}

// Chamado fora de qualquer componente para não recriar a instância a cada render.
// Somente a chave PÚBLICA (pk_...) existe no frontend.
export const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

/**
 * Appearance API: herda o design system da loja (tokens do tailwind.config.js:
 * luxury.gold, luxury.surface, luxury.border, fonte sans "Plus Jakarta Sans").
 */
export const stripeAppearance: Appearance = {
  theme: 'night',
  labels: 'above',
  variables: {
    colorPrimary: '#D4AF37',        // luxury.gold
    colorBackground: '#121214',     // luxury.surface
    colorText: '#FFFFFF',
    colorTextSecondary: '#9E9EA7',  // luxury.textMuted
    colorTextPlaceholder: '#71717a',
    colorDanger: '#f87171',
    colorSuccess: '#34d399',
    fontFamily: '"Plus Jakarta Sans", Inter, system-ui, sans-serif',
    fontSizeBase: '15px',
    spacingUnit: '4px',
    borderRadius: '6px',
  },
  rules: {
    '.Input': {
      border: '1px solid #27272a',          // luxury.border
      backgroundColor: '#18181b',           // luxury.card
      boxShadow: 'none',
      padding: '12px',
    },
    '.Input:hover': { borderColor: '#3f3f46' },
    '.Input:focus': {
      borderColor: '#D4AF37',
      boxShadow: '0 0 0 1px rgba(212, 175, 55, 0.4)',
    },
    '.Input--invalid': { borderColor: '#f87171', boxShadow: 'none' },
    '.Label': {
      color: '#9E9EA7',
      fontSize: '13px',
      fontWeight: '500',
      letterSpacing: '0.02em',
    },
    '.Tab': { border: '1px solid #27272a', backgroundColor: '#18181b' },
    '.Tab:hover': { borderColor: '#3f3f46' },
    '.Tab--selected': {
      borderColor: '#D4AF37',
      backgroundColor: 'rgba(212, 175, 55, 0.15)', // luxury.goldMuted
      color: '#F3E5AB',
    },
    '.Error': { fontSize: '13px' },
  },
};
