import { useState } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Loader2, Lock } from 'lucide-react';

interface Props {
  amountLabel: string;
  onSuccess: () => void;
}

// Mensagens amigáveis por decline_code / code (nunca exibir texto cru de erro técnico)
function friendlyError(error: { type?: string; code?: string; decline_code?: string; message?: string }) {
  if (error.type !== 'card_error' && error.type !== 'validation_error') {
    return 'Não foi possível processar o pagamento agora. Tente novamente em instantes.';
  }
  switch (error.decline_code || error.code) {
    case 'insufficient_funds':
      return 'Saldo/limite insuficiente. Tente outro cartão ou outra forma de pagamento.';
    case 'card_declined':
    case 'generic_decline':
      return 'Cartão recusado pelo banco emissor. Tente outro cartão.';
    case 'expired_card':
      return 'Cartão expirado. Verifique a validade ou use outro cartão.';
    case 'incorrect_cvc':
    case 'invalid_cvc':
      return 'Código de segurança (CVC) incorreto.';
    case 'incorrect_number':
    case 'invalid_number':
      return 'Número do cartão inválido.';
    case 'processing_error':
      return 'Erro ao processar o cartão. Tente novamente.';
    default:
      // Mensagens de validação da Stripe já vêm localizadas e sem dados sensíveis
      return error.message || 'Pagamento não aprovado. Verifique os dados e tente novamente.';
  }
}

export function StripePaymentForm({ amountLabel, onSuccess }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Guarda contra duplo clique/Enter repetido (além do disabled do botão)
    if (!stripe || !elements || submitting) return;

    setSubmitting(true);
    setErrorMessage(null);

    // Os dados do cartão vão direto do iframe da Stripe para os servidores da Stripe.
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/checkout/success` },
      redirect: 'if_required', // só redireciona se o método exigir (ex.: 3DS/bancário)
    });

    if (error) {
      setErrorMessage(friendlyError(error));
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
      onSuccess(); // a confirmação definitiva do pedido vem do webhook
      return;
    }

    setErrorMessage('Pagamento não concluído. Tente novamente.');
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <PaymentElement onReady={() => setReady(true)} options={{ layout: 'tabs' }} />

      {errorMessage && (
        <div role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || !ready || submitting}
        aria-busy={submitting}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-md text-lg font-medium bg-luxury-gold text-luxury-black hover:bg-luxury-goldHover focus:outline-none focus:ring-2 focus:ring-luxury-gold focus:ring-offset-2 focus:ring-offset-luxury-black disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> Processando...
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" /> Pagar {amountLabel}
          </>
        )}
      </button>

      <p className="text-center text-xs text-luxury-textMuted">
        Pagamento seguro processado pela Stripe. Não armazenamos os dados do seu cartão.
      </p>
    </form>
  );
}
