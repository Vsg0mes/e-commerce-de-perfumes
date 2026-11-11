import { Fragment, useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { ChevronDown, ChevronRight, Search, Truck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import {
  ADMIN_TRANSITIONS,
  ORDER_STATUSES,
  ORDER_STATUS_COLOR,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_COLOR,
  PAYMENT_STATUS_LABEL,
  formatAddress,
  formatBRL,
  formatDate,
  shortOrderId,
  type OrderData,
  type OrderStatus,
  type Pagination,
  type PaymentStatus,
} from '../../lib/orderStatus';

interface Props {
  /** Toast compartilhado com o painel (mesmo padrão do Admin). */
  onMessage: (msg: { type: 'success' | 'error'; text: string }) => void;
}

const LIMIT = 10;
const fieldClass = 'px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const CONFIRM_TEXT: Partial<Record<OrderStatus, string>> = {
  CANCELLED: 'Cancelar este pedido? Esta ação é irreversível.',
  DELIVERED: 'Marcar como entregue? Esta ação é irreversível.',
};

export function AdminOrders({ onMessage }: Props) {
  const { token } = useAuthStore();
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
  const headers = { Authorization: `Bearer ${token}` };

  const [orders, setOrders] = useState<OrderData[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | ''>('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'desc' | 'asc'>('desc');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [shippingFor, setShippingFor] = useState<string | null>(null);
  const [trackingCode, setTrackingCode] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  // Debounce da busca; volta para a página 1 ao mudar filtros
  useEffect(() => {
    const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${apiBase}/orders/admin`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit: LIMIT, sort, ...(status && { status }), ...(paymentStatus && { paymentStatus }), ...(q && { q }) },
      });
      setOrders(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      onMessage({ type: 'error', text: (axios.isAxiosError(err) && err.response?.data?.message) || 'Erro ao carregar pedidos.' });
    } finally {
      setLoading(false);
    }
  }, [apiBase, token, page, sort, status, paymentStatus, q, onMessage]);

  useEffect(() => { load(); }, [load]);

  const applyStatus = async (order: OrderData, next: OrderStatus, code?: string) => {
    setUpdating(order.id);
    try {
      const res = await axios.patch(
        `${apiBase}/orders/${order.id}/status`,
        { status: next, ...(code && { trackingCode: code }) },
        { headers },
      );
      setOrders(prev => prev.map(o => (o.id === order.id ? res.data.data : o)));
      onMessage({ type: 'success', text: `Pedido ${shortOrderId(order.id)} atualizado para ${ORDER_STATUS_LABEL[next]}.` });
      setShippingFor(null);
      setTrackingCode('');
    } catch (err) {
      onMessage({ type: 'error', text: (axios.isAxiosError(err) && err.response?.data?.message) || 'Erro ao atualizar status.' });
      load(); // pode ter sido alterado por outra pessoa
    } finally {
      setUpdating(null);
    }
  };

  const handleSelect = (order: OrderData, next: OrderStatus | '') => {
    if (!next) return;
    if (next === 'SHIPPED') {
      setShippingFor(order.id);
      setTrackingCode('');
      setExpanded(order.id);
      return;
    }
    const confirmText = CONFIRM_TEXT[next];
    if (confirmText && !window.confirm(`${shortOrderId(order.id)}: ${confirmText}`)) return;
    applyStatus(order, next);
  };

  const submitTracking = (order: OrderData) => {
    const code = trackingCode.trim();
    if (!code) {
      onMessage({ type: 'error', text: 'Informe o código de rastreio.' });
      return;
    }
    applyStatus(order, 'SHIPPED', code);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por pedido, nome ou e-mail"
            className={`${fieldClass} w-full pl-9`}
          />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value as OrderStatus | ''); setPage(1); }} className={fieldClass} aria-label="Filtrar por status do pedido">
          <option value="">Todos os status</option>
          {ORDER_STATUSES.map(s => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
        </select>
        <select value={paymentStatus} onChange={e => { setPaymentStatus(e.target.value as PaymentStatus | ''); setPage(1); }} className={fieldClass} aria-label="Filtrar por status do pagamento">
          <option value="">Todos os pagamentos</option>
          {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{PAYMENT_STATUS_LABEL[s]}</option>)}
        </select>
        <select value={sort} onChange={e => { setSort(e.target.value as 'asc' | 'desc'); setPage(1); }} className={fieldClass} aria-label="Ordenar por data">
          <option value="desc">Mais recentes</option>
          <option value="asc">Mais antigos</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 w-8" />
              <th className="px-4 py-3">Pedido</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Pagamento</th>
              <th className="px-4 py-3">Alterar status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
            {loading && orders.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">Carregando...</td></tr>
            )}
            {!loading && orders.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">Nenhum pedido encontrado.</td></tr>
            )}
            {orders.map(order => {
              const isOpen = expanded === order.id;
              const options = ADMIN_TRANSITIONS[order.status];
              return (
                <Fragment key={order.id}>
                  <tr className={loading ? 'opacity-60' : ''}>
                    <td className="px-4 py-3">
                      <button onClick={() => setExpanded(isOpen ? null : order.id)} aria-label={isOpen ? 'Recolher detalhes' : 'Expandir detalhes'} aria-expanded={isOpen}>
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900 dark:text-gray-100">{shortOrderId(order.id)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{order.user?.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{order.user?.email}</div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">{formatBRL(order.totalAmount)}</td>
                    <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ORDER_STATUS_COLOR[order.status]}`}>{ORDER_STATUS_LABEL[order.status]}</span></td>
                    <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${PAYMENT_STATUS_COLOR[order.paymentStatus]}`}>{PAYMENT_STATUS_LABEL[order.paymentStatus]}</span></td>
                    <td className="px-4 py-3">
                      {options.length === 0 ? (
                        <span className="text-xs text-gray-400">Estado final</span>
                      ) : (
                        <select
                          value=""
                          disabled={updating === order.id}
                          onChange={e => handleSelect(order, e.target.value as OrderStatus | '')}
                          className={fieldClass}
                          aria-label={`Alterar status do pedido ${shortOrderId(order.id)}`}
                        >
                          <option value="">Alterar para…</option>
                          {options.map(s => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
                        </select>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-gray-50 dark:bg-gray-800/30">
                      <td colSpan={8} className="px-6 py-4 space-y-4">
                        {shippingFor === order.id && (
                          <form
                            onSubmit={e => { e.preventDefault(); submitTracking(order); }}
                            className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30"
                          >
                            <Truck size={18} className="text-indigo-600 dark:text-indigo-400" />
                            <input
                              autoFocus
                              required
                              value={trackingCode}
                              onChange={e => setTrackingCode(e.target.value)}
                              maxLength={100}
                              placeholder="Código de rastreio (obrigatório)"
                              className={`${fieldClass} flex-1 min-w-[200px]`}
                            />
                            <button type="submit" disabled={updating === order.id} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                              Confirmar envio
                            </button>
                            <button type="button" onClick={() => setShippingFor(null)} className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                              Cancelar
                            </button>
                          </form>
                        )}
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Itens</p>
                            <ul className="space-y-1">
                              {order.items.map(i => (
                                <li key={i.id} className="flex justify-between gap-4">
                                  <span>{i.quantity}× {i.product.name}{i.product.volume ? ` (${i.product.volume})` : ''}</span>
                                  <span>{formatBRL(i.price * i.quantity)}</span>
                                </li>
                              ))}
                              <li className="flex justify-between gap-4 text-gray-500 dark:text-gray-400"><span>Frete</span><span>{formatBRL(order.shippingAmount)}</span></li>
                            </ul>
                          </div>
                          <div className="space-y-1">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Entrega e contato</p>
                            <p>{formatAddress(order.address)}</p>
                            <p>Telefone: {order.user?.phone || '—'}</p>
                            {order.trackingCode && <p>Rastreio: <span className="font-mono font-semibold">{order.trackingCode}</span></p>}
                            {order.shippedAt && <p>Enviado em {formatDate(order.shippedAt)}</p>}
                            {order.deliveredAt && <p>Entregue em {formatDate(order.deliveredAt)}</p>}
                            {order.cancelledAt && <p>Cancelado em {formatDate(order.cancelledAt)}</p>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600 dark:text-gray-300">
          <span>{pagination.total} pedidos · página {pagination.page} de {pagination.totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40">Anterior</button>
            <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40">Próxima</button>
          </div>
        </div>
      )}
    </div>
  );
}
