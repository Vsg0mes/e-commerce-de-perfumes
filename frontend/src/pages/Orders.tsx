import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Package, AlertCircle, Truck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
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
  type Pagination,
} from '../lib/orderStatus';

const PAGE_SIZE = 10;

export function Orders() {
  const navigate = useNavigate();
  const { token, logout } = useAuthStore();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (page: number) => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
    try {
      const res = await axios.get(`${apiBase}/orders/mine`, {
        params: { page, limit: PAGE_SIZE },
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(prev => (page === 1 ? res.data.data : [...prev, ...res.data.data]));
      setPagination(res.data.pagination);
      setError(null);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        logout();
        navigate('/login', { state: { from: '/orders' } });
        return;
      }
      setError(axios.isAxiosError(err) && err.response?.data?.message ? err.response.data.message : 'Não foi possível carregar seus pedidos.');
    }
  }, [token, logout, navigate]);

  const loadFirst = useCallback(async () => {
    setLoading(true);
    setError(null);
    await fetchPage(1);
    setLoading(false);
  }, [fetchPage]);

  useEffect(() => { loadFirst(); }, [loadFirst]);

  const loadMore = async () => {
    if (!pagination) return;
    setLoadingMore(true);
    await fetchPage(pagination.page + 1);
    setLoadingMore(false);
  };

  if (loading) return <div className="p-12 text-center text-gray-500 dark:text-gray-400">Carregando...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-8">Meus Pedidos</h1>

      {error && orders.length === 0 ? (
        <div role="alert" className="text-center py-16 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500 mb-3" />
          <p className="text-sm text-red-800 dark:text-red-300 mb-4">{error}</p>
          <button onClick={loadFirst} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors">
            Tentar de novo
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-24 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
          <Package className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Nenhum pedido encontrado</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Você ainda não realizou nenhuma compra.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => {
            const subtotal = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
            return (
              <div key={order.id} className="bg-white dark:bg-gray-900 shadow-sm overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Pedido {shortOrderId(order.id)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${ORDER_STATUS_COLOR[order.status]}`}>
                      {ORDER_STATUS_LABEL[order.status]}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${PAYMENT_STATUS_COLOR[order.paymentStatus]}`}>
                      Pagamento: {PAYMENT_STATUS_LABEL[order.paymentStatus]}
                    </span>
                  </div>
                </div>

                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {order.items.map(item => (
                    <li key={item.id} className="flex items-center gap-4 px-5 py-3">
                      {item.product.image ? (
                        <img src={item.product.image} alt={item.product.name} className="h-14 w-14 rounded-lg object-cover bg-gray-100 dark:bg-gray-800" />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400"><Package size={20} /></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.product.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.quantity} × {formatBRL(item.price)}{item.product.volume ? ` · ${item.product.volume}` : ''}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatBRL(item.price * item.quantity)}</p>
                    </li>
                  ))}
                </ul>

                <div className="grid gap-4 sm:grid-cols-2 px-5 py-4 border-t border-gray-200 dark:border-gray-800 text-sm">
                  <div className="space-y-1 text-gray-600 dark:text-gray-300">
                    <p className="font-medium text-gray-900 dark:text-gray-100">Entrega</p>
                    <p>{formatAddress(order.address)}</p>
                    {order.trackingCode && (
                      <p className="flex items-center gap-2 pt-1">
                        <Truck size={16} className="text-indigo-600 dark:text-indigo-400" />
                        Rastreio: <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{order.trackingCode}</span>
                      </p>
                    )}
                  </div>
                  <dl className="space-y-1 sm:text-right text-gray-600 dark:text-gray-300">
                    <div className="flex sm:justify-end gap-4"><dt>Subtotal</dt><dd className="w-28 text-right">{formatBRL(subtotal)}</dd></div>
                    <div className="flex sm:justify-end gap-4"><dt>Frete</dt><dd className="w-28 text-right">{formatBRL(order.shippingAmount)}</dd></div>
                    <div className="flex sm:justify-end gap-4 font-bold text-gray-900 dark:text-gray-100"><dt>Total</dt><dd className="w-28 text-right">{formatBRL(order.totalAmount)}</dd></div>
                  </dl>
                </div>
              </div>
            );
          })}

          {error && <p role="alert" className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>}

          {pagination && pagination.page < pagination.totalPages && (
            <div className="text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {loadingMore ? 'Carregando...' : 'Carregar mais'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
