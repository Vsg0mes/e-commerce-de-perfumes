import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { stripePromise } from '../lib/stripe';
import { useCartStore } from '../store/cartStore';

// Destino do return_url (métodos que exigem redirecionamento, ex.: autenticação 3DS ou Pix)
export function CheckoutSuccess() {
  const clearCart = useCartStore((s) => s.clearCart);
  const [status, setStatus] = useState<'loading' | 'ok' | 'processing' | 'requires_action' | 'failed'>('loading');

  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId');

  useEffect(() => {
    const secret = new URLSearchParams(window.location.search).get('payment_intent_client_secret');
    if (!secret || !stripePromise) return setStatus('failed');
    stripePromise.then(async (stripe) => {
      if (!stripe) return setStatus('failed');
      const { paymentIntent } = await stripe.retrievePaymentIntent(secret);
      if (paymentIntent?.status === 'succeeded') {
        clearCart();
        setStatus('ok');
      } else if (paymentIntent?.status === 'processing') {
        clearCart();
        setStatus('processing');
      } else if (paymentIntent?.status === 'requires_action') {
        clearCart();
        setStatus('requires_action');
      } else {
        setStatus('failed');
      }
    });
  }, [clearCart]);

  const messages = {
    loading: 'Verificando pagamento...',
    ok: 'Pagamento confirmado! Obrigado pela sua compra.',
    processing: 'Seu pagamento está sendo processado. Avisaremos por e-mail.',
    requires_action: 'Pix gerado. Aguardando confirmação do pagamento.',
    failed: 'Não foi possível confirmar o pagamento. Tente novamente.',
  } as const;

  const destination =
    status === 'failed'
      ? '/checkout'
      : orderId
      ? `/orders/${orderId}`
      : '/orders';

  const linkLabel =
    status === 'failed'
      ? 'Voltar ao checkout'
      : orderId
      ? 'Acompanhar pedido e retomar pagamento'
      : 'Ver meus pedidos';

  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <h1 className="text-3xl font-serif text-luxury-gold mb-4">{messages[status]}</h1>
      {status === 'requires_action' && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Você pode visualizar ou retomar o pagamento via QR Code Pix diretamente na página do seu pedido.
        </p>
      )}
      <Link to={destination} className="text-luxury-goldLight underline">
        {linkLabel}
      </Link>
    </div>
  );
}
