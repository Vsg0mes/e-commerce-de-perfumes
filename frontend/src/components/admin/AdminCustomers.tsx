import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { AlertCircle, Search } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { formatBRL, formatDate, type Pagination } from '../../lib/orderStatus';

interface CustomerItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  createdAt: string;
  totalOrders: number;
  paidOrdersCount: number;
  totalSpent: number;
}

const LIMIT = 10;
const fieldClass =
  'px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

export function AdminCustomers() {
  const { token } = useAuthStore();
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';

  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${apiBase}/admin/customers`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit: LIMIT, ...(q ? { q } : {}) },
      });
      setCustomers(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(
        (axios.isAxiosError(err) && err.response?.data?.message) ||
          'Não foi possível carregar a lista de clientes.'
      );
    } finally {
      setLoading(false);
    }
  }, [apiBase, token, page, q]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente por nome ou e-mail..."
            className={`${fieldClass} w-full pl-9`}
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-300 flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <AlertCircle size={18} /> {error}
          </span>
          <button
            onClick={loadCustomers}
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium"
          >
            Tentar novamente
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">Cadastro</th>
              <th className="px-4 py-3 text-center">Total de Pedidos</th>
              <th className="px-4 py-3 text-right">Valor Gasto (Pagos)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
            {loading && customers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                  Carregando clientes...
                </td>
              </tr>
            )}
            {!loading && customers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
            {customers.map((c) => (
              <tr key={c.id} className={loading ? 'opacity-60' : ''}>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{c.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{c.email}</div>
                </td>
                <td className="px-4 py-3">{c.phone || '—'}</td>
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(c.createdAt)}</td>
                <td className="px-4 py-3 text-center">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {c.totalOrders}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">({c.paidOrdersCount} pagos)</span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                  {formatBRL(c.totalSpent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600 dark:text-gray-300">
          <span>
            {pagination.total} clientes · página {pagination.page} de {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
