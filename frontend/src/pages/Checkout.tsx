import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Elements } from '@stripe/react-stripe-js';
import { AlertTriangle, MapPin } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { stripePromise, stripeAppearance } from '../lib/stripe';
import { StripePaymentForm } from '../components/StripePaymentForm';
import { UF_LIST, isValidCpf, maskCep, maskCpf, maskPhone } from '../lib/validators';

interface SavedAddress {
  id: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
}

export function Checkout() {
  const navigate = useNavigate();
  const { items, getTotal, clearCart, revalidateCart } = useCartStore();
  const { user, token, logout } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [serverAmount, setServerAmount] = useState<number | null>(null);
  const [paid, setPaid] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [cartNotices, setCartNotices] = useState<string[]>([]);

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');
  const skipNextViaCepRef = useRef(false);
  const [viaCepNotice, setViaCepNotice] = useState<string | null>(null);

  const [shipping, setShipping] = useState<{
    amount: number;
    region: string;
    state: string;
    minDays: number;
    maxDays: number;
  } | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);

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
    state: '',
  });

  // Revalida itens do carrinho contra a API ao abrir o checkout
  useEffect(() => {
    revalidateCart().then((changes) => {
      if (changes.length > 0) setCartNotices(changes);
    });
  }, [revalidateCart]);

  // Preenche com contato e lista de endereços salvos na conta do usuário
  useEffect(() => {
    if (!token) return;
    axios
      .get(`${import.meta.env.VITE_API_URL || 'http://localhost:3333/api'}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const me = res.data?.data;
        if (!me) return;
        const list: SavedAddress[] = Array.isArray(me.addresses)
          ? me.addresses
          : me.address
          ? [me.address]
          : [];
        setSavedAddresses(list);
        const a = list[0];
        if (a) {
          setSelectedAddressId(a.id);
          skipNextViaCepRef.current = true;
        }
        setFormData((prev) => ({
          ...prev,
          cpf: prev.cpf || (me.cpf ? maskCpf(me.cpf) : ''),
          phone: prev.phone || (me.phone ? maskPhone(me.phone) : ''),
          ...(a
            ? {
                zipCode: maskCep(a.zipCode),
                street: a.street,
                number: a.number,
                complement: a.complement || '',
                neighborhood: a.neighborhood,
                city: a.city,
                state: a.state.toUpperCase(),
              }
            : {}),
        }));
      })
      .catch(() => {
        /* sem endereço salvo: segue com formulário vazio */
      });
  }, [token]);

  // Cotação de frete + autopreenchimento ViaCEP ao completar 8 dígitos do CEP
  useEffect(() => {
    const digits = formData.zipCode.replace(/\D/g, '');
    if (digits.length !== 8) {
      setShipping(null);
      setShippingError(null);
      setViaCepNotice(null);
      return;
    }

    let cancelled = false;
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';

    axios
      .get(`${apiBase}/shipping/quote`, { params: { zipCode: digits } })
      .then((res) => {
        if (!cancelled) {
          setShipping(res.data.data);
          setShippingError(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setShipping(null);
        setShippingError(
          axios.isAxiosError(err) && err.response?.data?.message
            ? err.response.data.message
            : 'Não foi possível calcular o frete.'
        );
      });

    if (skipNextViaCepRef.current) {
      skipNextViaCepRef.current = false;
    } else {
      axios
        .get(`https://viacep.com.br/ws/${digits}/json/`, { timeout: 4000 })
        .then((res) => {
          if (cancelled) return;
          if (res.data && !res.data.erro) {
            setViaCepNotice(null);
            setFormData((prev) => ({
              ...prev,
              street: res.data.logradouro || prev.street,
              neighborhood: res.data.bairro || prev.neighborhood,
              city: res.data.localidade || prev.city,
              state: (res.data.uf || prev.state).toUpperCase(),
            }));
          } else {
            setViaCepNotice('CEP não encontrado no ViaCEP. Preencha o endereço manualmente.');
          }
        })
        .catch(() => {
          if (!cancelled) {
            setViaCepNotice('Consulta automática de CEP indisponível. Preencha o endereço manualmente.');
          }
        });
    }

    return () => {
      cancelled = true;
    };
  }, [formData.zipCode]);

  const handleSelectSavedAddress = (addressId: string) => {
    setSelectedAddressId(addressId);
    setViaCepNotice(null);
    if (addressId === 'new') {
      setFormData((prev) => ({
        ...prev,
        zipCode: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
      }));
      return;
    }
    const addr = savedAddresses.find((a) => a.id === addressId);
    if (addr) {
      skipNextViaCepRef.current = true;
      setFormData((prev) => ({
        ...prev,
        zipCode: maskCep(addr.zipCode),
        street: addr.street,
        number: addr.number,
        complement: addr.complement || '',
        neighborhood: addr.neighborhood,
        city: addr.city,
        state: addr.state.toUpperCase(),
      }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'cpf') {
      setFormData((prev) => ({ ...prev, cpf: maskCpf(value) }));
    } else if (name === 'phone') {
      setFormData((prev) => ({ ...prev, phone: maskPhone(value) }));
    } else if (name === 'zipCode') {
      setSelectedAddressId('new');
      setFormData((prev) => ({ ...prev, zipCode: maskCep(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const ufMismatch =
    Boolean(shipping?.state && formData.state) &&
    formData.state.toUpperCase() !== shipping!.state;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setFormError(null);

    if (!isValidCpf(formData.cpf)) {
      setFormError('CPF inválido. Verifique os dígitos informados.');
      return;
    }

    if (!shipping) {
      setFormError('Informe um CEP válido para o cálculo do frete.');
      return;
    }

    if (formData.state.toUpperCase() !== shipping.state) {
      setFormError(
        `A UF selecionada (${formData.state}) não corresponde ao CEP informado (${shipping.state}).`
      );
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3333/api'}/payments/create-payment-intent`,
        {
          customerInfo: {
            ...formData,
            cpf: formData.cpf.replace(/\D/g, ''),
            phone: formData.phone.replace(/\D/g, ''),
            zipCode: formData.zipCode.replace(/\D/g, ''),
            state: formData.state.toUpperCase(),
          },
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setClientSecret(res.data.data.clientSecret);
        setServerAmount(res.data.data.amount);
      }
    } catch (error) {
      console.error('Erro ao iniciar pagamento', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        logout();
        navigate('/login', { state: { from: '/checkout' } });
        return;
      }
      setFormError(
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Houve um erro ao iniciar o pagamento. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setPaid(true);
    clearCart();
  };

  const formatPrice = (p: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p);

  if (paid) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <h1 className="text-3xl font-serif text-luxury-gold mb-4">Pagamento recebido!</h1>
        <p className="text-luxury-textMuted mb-6">
          Obrigado pela sua compra. Você receberá a confirmação por e-mail.
        </p>
        <button
          onClick={() => navigate('/orders')}
          className="text-luxury-goldLight underline"
        >
          Ver meus pedidos
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  const inputClass =
    'mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-8">
        Checkout
      </h1>

      {cartNotices.length > 0 && (
        <div
          role="alert"
          className="mb-8 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm"
        >
          <div className="flex items-center gap-2 font-semibold mb-1">
            <AlertTriangle size={16} />
            <span>Atualizações na sua sacola:</span>
          </div>
          <ul className="list-disc list-inside space-y-1">
            {cartNotices.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start">
        <div className="lg:col-span-8">
          {clientSecret && stripePromise ? (
            <div className="bg-white dark:bg-luxury-surface p-6 rounded-lg shadow-sm border border-gray-200 dark:border-luxury-border">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Pagamento
                </h2>
                <button
                  type="button"
                  onClick={() => setClientSecret(null)}
                  className="text-sm text-luxury-gold hover:underline"
                >
                  Editar dados
                </button>
              </div>
              <Elements
                stripe={stripePromise}
                options={{ clientSecret, appearance: stripeAppearance, locale: 'pt-BR' }}
              >
                <StripePaymentForm
                  amountLabel={formatPrice(serverAmount ?? 0)}
                  onSuccess={handlePaymentSuccess}
                />
              </Elements>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  Dados Pessoais
                </h2>
                <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                  <div>
                    <label className={labelClass}>Nome Completo</label>
                    <input
                      required
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>E-mail</label>
                    <input
                      required
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>CPF</label>
                    <input
                      required
                      type="text"
                      name="cpf"
                      inputMode="numeric"
                      placeholder="000.000.000-00"
                      maxLength={14}
                      value={formData.cpf}
                      onChange={handleChange}
                      className={inputClass}
                    />
                    {formData.cpf.replace(/\D/g, '').length === 11 && !isValidCpf(formData.cpf) && (
                      <p className="mt-1 text-xs text-red-500">CPF inválido.</p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Telefone</label>
                    <input
                      required
                      type="text"
                      name="phone"
                      inputMode="numeric"
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                      value={formData.phone}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Endereço de Entrega
                </h2>

                {savedAddresses.length > 0 && (
                  <div className="mb-6">
                    <label className={`${labelClass} flex items-center gap-1.5 mb-2`}>
                      <MapPin size={15} className="text-indigo-500" />
                      <span>Endereços salvos</span>
                    </label>
                    <div className="space-y-2">
                      {savedAddresses.map((addr) => (
                        <label
                          key={addr.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border text-sm cursor-pointer transition-colors ${
                            selectedAddressId === addr.id
                              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="savedAddress"
                            checked={selectedAddressId === addr.id}
                            onChange={() => handleSelectSavedAddress(addr.id)}
                            className="mt-1 accent-indigo-600"
                          />
                          <span className="text-gray-700 dark:text-gray-200">
                            {addr.street}, {addr.number}
                            {addr.complement ? ` - ${addr.complement}` : ''} · {addr.neighborhood} ·{' '}
                            {addr.city}/{addr.state} · CEP {maskCep(addr.zipCode)}
                          </span>
                        </label>
                      ))}
                      <label
                        className={`flex items-center gap-3 p-3 rounded-lg border text-sm cursor-pointer transition-colors ${
                          selectedAddressId === 'new'
                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="savedAddress"
                          checked={selectedAddressId === 'new'}
                          onChange={() => handleSelectSavedAddress('new')}
                          className="accent-indigo-600"
                        />
                        <span className="text-gray-700 dark:text-gray-200 font-medium">
                          Usar outro endereço
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-6 sm:gap-x-4">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>CEP</label>
                    <input
                      required
                      type="text"
                      name="zipCode"
                      inputMode="numeric"
                      placeholder="00000-000"
                      maxLength={9}
                      value={formData.zipCode}
                      onChange={handleChange}
                      className={inputClass}
                    />
                    {shippingError && <p className="mt-1 text-xs text-red-500">{shippingError}</p>}
                    {viaCepNotice && !shippingError && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                        {viaCepNotice}
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-4">
                    <label className={labelClass}>Rua</label>
                    <input
                      required
                      type="text"
                      name="street"
                      value={formData.street}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Número</label>
                    <input
                      required
                      type="text"
                      name="number"
                      value={formData.number}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className={labelClass}>Complemento</label>
                    <input
                      type="text"
                      name="complement"
                      value={formData.complement}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Bairro</label>
                    <input
                      required
                      type="text"
                      name="neighborhood"
                      value={formData.neighborhood}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className={labelClass}>Cidade</label>
                    <input
                      required
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className={labelClass}>Estado (UF)</label>
                    <select
                      required
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="">UF</option>
                      {UF_LIST.map((uf) => (
                        <option key={uf} value={uf}>
                          {uf}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {ufMismatch && (
                  <p className="mt-2 text-xs text-red-500">
                    A UF selecionada ({formData.state}) não corresponde ao CEP ({shipping?.state}).
                  </p>
                )}
              </div>

              {formError && (
                <div
                  role="alert"
                  className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300"
                >
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || ufMismatch}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 transition-colors"
              >
                {loading ? 'Processando...' : 'Continuar para o Pagamento'}
              </button>
            </form>
          )}
        </div>

        <div className="mt-16 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-6 sm:p-6 lg:p-8 lg:mt-0 lg:col-span-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Resumo da Compra
          </h2>

          <ul
            role="list"
            className="divide-y divide-gray-200 dark:divide-gray-800 text-sm mb-6"
          >
            {items.map((item) => (
              <li key={item.id} className="py-4 flex justify-between">
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {item.name}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">Qtd: {item.quantity}</span>
                </div>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="space-y-4 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800 pt-6">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {formatPrice(getTotal())}
              </dd>
            </div>

            <div className="flex justify-between">
              <dt>
                Frete{shipping ? ` (${shipping.region})` : ''}
                {shipping && (
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    Entrega em {shipping.minDays} a {shipping.maxDays} dias úteis
                  </span>
                )}
              </dt>
              <dd className="font-medium text-gray-900 dark:text-gray-100">
                {shipping ? (
                  formatPrice(shipping.amount)
                ) : (
                  <span className="text-xs">Informe o CEP</span>
                )}
              </dd>
            </div>

            <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-800 pt-4">
              <dt className="text-base font-medium text-gray-900 dark:text-gray-100">
                Total a Pagar
              </dt>
              <dd className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {shipping ? formatPrice(getTotal() + shipping.amount) : formatPrice(getTotal())}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
