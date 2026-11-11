import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Elements } from '@stripe/react-stripe-js';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { stripePromise, stripeAppearance } from '../lib/stripe';
import { StripePaymentForm } from '../components/StripePaymentForm';

export function Checkout() {
  const navigate = useNavigate();
  const { items, getTotal, clearCart } = useCartStore();
  const { user, token, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [serverAmount, setServerAmount] = useState<number | null>(null);
  const [paid, setPaid] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    cpf: '',
    phone: '',
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: ''
  });

  // Preenche com o endereço/contato salvos na conta do usuário
  useEffect(() => {
    if (!token) return;
    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3333/api'}/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      const me = res.data?.data;
      if (!me) return;
      const a = me.address;
      setFormData(prev => ({
        ...prev,
        cpf: prev.cpf || me.cpf || '',
        phone: prev.phone || me.phone || '',
        ...(a ? {
          zipCode: prev.zipCode || a.zipCode, street: prev.street || a.street, number: prev.number || a.number,
          complement: prev.complement || a.complement || '', neighborhood: prev.neighborhood || a.neighborhood,
          city: prev.city || a.city, state: prev.state || a.state,
        } : {}),
      }));
    }).catch(() => { /* sem endereço salvo: segue com formulário vazio */ });
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Etapa 1: envia apenas ids/quantidades + dados do cliente. O valor é calculado no backend.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setFormError(null);

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3333/api'}/payments/create-payment-intent`, {
        customerInfo: formData,
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity }))
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data.success) {
        setClientSecret(res.data.data.clientSecret);
        setServerAmount(res.data.data.amount);
      }
    } catch (error) {
      console.error("Erro ao iniciar pagamento", error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        logout();
        navigate('/login', { state: { from: '/checkout' } });
        return;
      }
      setFormError(axios.isAxiosError(error) && error.response?.data?.message
        ? error.response.data.message
        : "Houve um erro ao iniciar o pagamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setPaid(true);
    clearCart();
  };

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p);
  };

  if (paid) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <h1 className="text-3xl font-serif text-luxury-gold mb-4">Pagamento recebido!</h1>
        <p className="text-luxury-textMuted mb-6">Obrigado pela sua compra. Você receberá a confirmação por e-mail.</p>
        <button onClick={() => navigate('/orders')} className="text-luxury-goldLight underline">Ver meus pedidos</button>
      </div>
    );
  }

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  const inputClass = "mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-8">Checkout</h1>

      <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start">
        <div className="lg:col-span-8">
          {clientSecret && stripePromise ? (
            <div className="bg-white dark:bg-luxury-surface p-6 rounded-lg shadow-sm border border-gray-200 dark:border-luxury-border">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Pagamento</h2>
                <button type="button" onClick={() => setClientSecret(null)} className="text-sm text-luxury-gold hover:underline">
                  Editar dados
                </button>
              </div>
              <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance, locale: 'pt-BR' }}>
                <StripePaymentForm amountLabel={formatPrice(serverAmount ?? 0)} onSuccess={handlePaymentSuccess} />
              </Elements>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Dados Pessoais</h2>
              <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                <div>
                  <label className={labelClass}>Nome Completo</label>
                  <input required type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>E-mail</label>
                  <input required type="email" name="email" value={formData.email} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>CPF</label>
                  <input required type="text" name="cpf" value={formData.cpf} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Telefone</label>
                  <input required type="text" name="phone" value={formData.phone} onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Endereço de Entrega</h2>
              <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-6 sm:gap-x-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>CEP</label>
                  <input required type="text" name="zipCode" value={formData.zipCode} onChange={handleChange} className={inputClass} />
                </div>
                <div className="sm:col-span-4">
                  <label className={labelClass}>Rua</label>
                  <input required type="text" name="street" value={formData.street} onChange={handleChange} className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Número</label>
                  <input required type="text" name="number" value={formData.number} onChange={handleChange} className={inputClass} />
                </div>
                <div className="sm:col-span-4">
                  <label className={labelClass}>Complemento</label>
                  <input type="text" name="complement" value={formData.complement} onChange={handleChange} className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Bairro</label>
                  <input required type="text" name="neighborhood" value={formData.neighborhood} onChange={handleChange} className={inputClass} />
                </div>
                <div className="sm:col-span-3">
                  <label className={labelClass}>Cidade</label>
                  <input required type="text" name="city" value={formData.city} onChange={handleChange} className={inputClass} />
                </div>
                <div className="sm:col-span-1">
                  <label className={labelClass}>Estado</label>
                  <input required type="text" name="state" value={formData.state} onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </div>

            {formError && (
              <div role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{formError}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 transition-colors"
            >
              {loading ? 'Processando...' : 'Continuar para o Pagamento'}
            </button>
          </form>
          )}
        </div>

        <div className="mt-16 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-6 sm:p-6 lg:p-8 lg:mt-0 lg:col-span-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Resumo da Compra</h2>
          
          <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-800 text-sm mb-6">
            {items.map((item) => (
              <li key={item.id} className="py-4 flex justify-between">
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900 dark:text-gray-100">{item.name}</span>
                  <span className="text-gray-500 dark:text-gray-400">Qtd: {item.quantity}</span>
                </div>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatPrice(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>

          <dl className="space-y-4 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800 pt-6">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{formatPrice(getTotal())}</dd>
            </div>
            
            <div className="flex justify-between">
              <dt>Frete (Fixo)</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">{formatPrice(20.00)}</dd>
            </div>
            
            <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-800 pt-4">
              <dt className="text-base font-medium text-gray-900 dark:text-gray-100">Total a Pagar</dt>
              <dd className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatPrice(getTotal() + 20.00)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
