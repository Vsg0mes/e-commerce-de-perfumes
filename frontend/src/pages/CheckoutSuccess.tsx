import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { stripePromise } from '../lib/stripe';
import { useCartStore } from '../store/cartStore';

// Destino do return_url (métodos que exigem redirecionamento, ex.: autenticação 3DS)
export function CheckoutSuccess() {
  const clearCart = useCartStore((s) => s.clearCart);
  const [status, setStatus] = useState<'loading' | 'ok' | 'processing' | 'failed'>('loading');

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
      } else {
        setStatus('failed');
      }
    });
  }, [clearCart]);

  const messages = {
    loading: 'Verificando pagamento...',
    ok: 'Pagamento confirmado! Obrigado pela sua compra.',
    processing: 'Seu pagamento está sendo processado. Avisaremos por e-mail.',
    failed: 'Não foi possível confirmar o pagamento. Tente novamente.',
  } as const;

  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <h1 className="text-3xl font-serif text-luxury-gold mb-4">{messages[status]}</h1>
      <Link to={status === 'failed' ? '/checkout' : '/orders'} className="text-luxury-goldLight underline">
        {status === 'failed' ? 'Voltar ao checkout' : 'Ver meus pedidos'}
      </Link>
    </div>
  );
}
