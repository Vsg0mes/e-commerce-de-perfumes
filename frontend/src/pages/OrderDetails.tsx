import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Elements } from '@stripe/react-stripe-js';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  Package,
  Truck,
  XCircle,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { stripePromise, stripeAppearance } from '../lib/stripe';
import { StripePaymentForm } from '../components/StripePaymentForm';
import {
  ORDER_STATUS_COLOR,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_COLOR,
  PAYMENT_STATUS_LABEL,
  formatAddress,
  formatBRL,
  formatDate,
  shortOrderId,
  type OrderData,
} from '../lib/orderStatus';

export function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, logout } = useAuthStore();
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingPay, setLoadingPay] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${apiBase}/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrder(res.data.data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        logout();
        navigate('/login', { state: { from: `/orders/${id}` } });
        return;
      }
      setError(
        (axios.isAxiosError(err) && err.response?.data?.message) ||
          'Não foi possível carregar os detalhes deste pedido.'
      );
    } finally {
      setLoading(false);
    }
  }, [apiBase, id, token, logout, navigate]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const isExpired = Boolean(
    order?.expiresAt && new Date(order.expiresAt).getTime() <= Date.now()
  );
  const canPayOrCancel =
    order?.status === 'PENDING' && order?.paymentStatus === 'PENDING' && !isExpired;

  const handlePayNow = async () => {
    if (!order || loadingPay) return;
    setLoadingPay(true);
    setActionMessage(null);
    try {
      const res = await axios.post(
        `${apiBase}/orders/${order.id}/payment-intent`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setClientSecret(res.data.data.clientSecret);
    } catch (err) {
      setActionMessage({
        type: 'error',
        text:
          (axios.isAxiosError(err) && err.response?.data?.message) ||
          'Não foi possível iniciar o pagamento.',
      });
      fetchOrder();
    } finally {
      setLoadingPay(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order || cancelling) return;
    if (!window.confirm(`Deseja realmente cancelar o pedido ${shortOrderId(order.id)}?`)) return;

    setCancelling(true);
    setActionMessage(null);
    try {
      const res = await axios.post(
        `${apiBase}/orders/${order.id}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrder(res.data.data);
      setClientSecret(null);
      setActionMessage({
        type: 'success',
        text: 'Pedido cancelado com sucesso e estoque liberado.',
      });
    } catch (err) {
      setActionMessage({
        type: 'error',
        text:
          (axios.isAxiosError(err) && err.response?.data?.message) ||
          'Não foi possível cancelar o pedido.',
      });
      fetchOrder();
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 dark:text-gray-400">
        Carregando detalhes do pedido...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-3" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {error || 'Pedido não encontrado'}
        </h2>
        <Link to="/orders" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 underline">
          Voltar para Meus Pedidos
        </Link>
      </div>
    );
  }

  const subtotal = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to="/orders"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-2"
          >
            <ArrowLeft size={14} /> Voltar para Meus Pedidos
          </Link>
          <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100">
            Pedido {shortOrderId(order.id)}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Realizado em {formatDate(order.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${ORDER_STATUS_COLOR[order.status]}`}
          >
            {ORDER_STATUS_LABEL[order.status]}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${PAYMENT_STATUS_COLOR[order.paymentStatus]}`}
          >
            Pagamento: {PAYMENT_STATUS_LABEL[order.paymentStatus]}
          </span>
        </div>
      </div>

      {actionMessage && (
        <div
          role="alert"
          className={`p-4 rounded-xl flex items-center gap-2 text-sm border ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
          }`}
        >
          {actionMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Ações para pedido PENDING ainda não expirado */}
      {canPayOrCancel && (
        <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <Clock size={16} /> Aguardando confirmação de pagamento
            </p>
            {order.expiresAt && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Reserva garantida até {formatDate(order.expiresAt)}.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!clientSecret && (
              <button
                type="button"
                onClick={handlePayNow}
                disabled={loadingPay || cancelling}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <CreditCard size={16} />
                {loadingPay ? 'Carregando...' : 'Pagar agora'}
              </button>
            )}
            <button
              type="button"
              onClick={handleCancelOrder}
              disabled={cancelling || loadingPay}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50 transition-colors"
            >
              <XCircle size={16} />
              {cancelling ? 'Cancelando...' : 'Cancelar pedido'}
            </button>
          </div>
        </div>
      )}

      {clientSecret && stripePromise && (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Concluir Pagamento
            </h2>
            <button
              type="button"
              onClick={() => setClientSecret(null)}
              className="text-xs text-gray-500 hover:underline"
            >
              Fechar
            </button>
          </div>
          <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance: stripeAppearance, locale: 'pt-BR' }}
          >
            <StripePaymentForm
              amountLabel={formatBRL(order.totalAmount)}
              onSuccess={() => {
                setClientSecret(null);
                setActionMessage({
                  type: 'success',
                  text: 'Pagamento enviado com sucesso! Atualizando status do pedido...',
                });
                setTimeout(() => fetchOrder(), 1200);
              }}
            />
          </Elements>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 shadow-sm overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 font-semibold text-gray-900 dark:text-gray-100">
          Itens do Pedido
        </div>
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 px-5 py-4">
              {item.product.image ? (
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="h-16 w-16 rounded-lg object-cover bg-gray-100 dark:bg-gray-800"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                  <Package size={20} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <Link
                  to={`/product/${item.product.id}`}
                  className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  {item.product.name}
                </Link>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {item.quantity} × {formatBRL(item.price)}
                  {item.product.volume ? ` · ${item.product.volume}` : ''}
                </p>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {formatBRL(item.price * item.quantity)}
              </p>
            </li>
          ))}
        </ul>

        <div className="grid gap-6 sm:grid-cols-2 px-5 py-5 border-t border-gray-200 dark:border-gray-800 text-sm bg-gray-50/50 dark:bg-gray-800/30">
          <div className="space-y-1 text-gray-600 dark:text-gray-300">
            <p className="font-semibold text-gray-900 dark:text-gray-100">Endereço de entrega</p>
            <p>{formatAddress(order.address)}</p>
            {order.trackingCode && (
              <p className="flex items-center gap-2 pt-2">
                <Truck size={16} className="text-indigo-600 dark:text-indigo-400" />
                Rastreio:{' '}
                <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                  {order.trackingCode}
                </span>
              </p>
            )}
            {order.shippedAt && <p className="text-xs">Enviado em {formatDate(order.shippedAt)}</p>}
            {order.deliveredAt && <p className="text-xs">Entregue em {formatDate(order.deliveredAt)}</p>}
            {order.cancelledAt && <p className="text-xs">Cancelado em {formatDate(order.cancelledAt)}</p>}
          </div>

          <dl className="space-y-1.5 sm:text-right text-gray-600 dark:text-gray-300">
            <div className="flex sm:justify-end gap-4">
              <dt>Subtotal</dt>
              <dd className="w-28 text-right">{formatBRL(subtotal)}</dd>
            </div>
            <div className="flex sm:justify-end gap-4">
              <dt>Frete</dt>
              <dd className="w-28 text-right">{formatBRL(order.shippingAmount)}</dd>
            </div>
            <div className="flex sm:justify-end gap-4 font-bold text-gray-900 dark:text-gray-100 text-base pt-1 border-t border-gray-200 dark:border-gray-700">
              <dt>Total</dt>
              <dd className="w-28 text-right">{formatBRL(order.totalAmount)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
