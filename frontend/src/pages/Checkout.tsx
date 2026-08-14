import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCartStore } from '../store/cartStore';

export function Checkout() {
  const navigate = useNavigate();
  const { items, getTotal, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const orderData = {
        customerInfo: formData,
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity }))
      };
      
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3333/api'}/orders`, orderData);
      
      if (res.data.success) {
        clearCart();
        window.location.href = res.data.data.paymentUrl;
      }
    } catch (error) {
      console.error("Erro ao criar pedido", error);
      alert("Houve um erro ao processar seu pedido. Tente novamente.");
      setLoading(false);
    }
  };

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p);
  };

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

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 transition-colors"
            >
              {loading ? 'Processando...' : 'Ir para o Pagamento'}
            </button>
          </form>
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
