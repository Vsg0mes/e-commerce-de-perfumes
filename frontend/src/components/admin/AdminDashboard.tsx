import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { AlertCircle, AlertTriangle, Calendar, Package, TrendingUp } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import {
  ORDER_STATUSES,
  ORDER_STATUS_COLOR,
  ORDER_STATUS_LABEL,
  formatBRL,
  type OrderStatus,
} from '../../lib/orderStatus';

interface PeriodSummary {
  ordersCount: number;
  revenue: number;
}

interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
  price: number;
  promotionalPrice: number | null;
  isActive: boolean;
  brand: { name: string };
}

interface TopSellingProduct {
  productId: string;
  name: string;
  brandName: string;
  price: number;
  stock: number;
  image: string | null;
  totalSold: number;
}

interface StatsData {
  periods: {
    today: PeriodSummary;
    last7Days: PeriodSummary;
    last30Days: PeriodSummary;
  };
  ordersByStatus: Record<OrderStatus, number>;
  lowStockLimit: number;
  lowStockProducts: LowStockProduct[];
  topSellingProducts: TopSellingProduct[];
}

export function AdminDashboard() {
  const { token } = useAuthStore();
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';

  const [stats, setStats] = useState<StatsData | null>(null);
  const [lowStockLimit, setLowStockLimit] = useState<number>(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(
    async (limitValue: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${apiBase}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { lowStockLimit: limitValue },
        });
        setStats(res.data.data);
      } catch (err) {
        setError(
          (axios.isAxiosError(err) && err.response?.data?.message) ||
            'Não foi possível carregar as métricas do painel.'
        );
      } finally {
        setLoading(false);
      }
    },
    [apiBase, token]
  );

  useEffect(() => {
    loadStats(lowStockLimit);
  }, [loadStats, lowStockLimit]);

  if (loading && !stats) {
    return <div className="p-12 text-center text-gray-500 dark:text-gray-400">Carregando métricas...</div>;
  }

  if (error && !stats) {
    return (
      <div role="alert" className="text-center py-12 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl">
        <AlertCircle className="mx-auto h-10 w-10 text-red-500 mb-2" />
        <p className="text-sm text-red-800 dark:text-red-300 mb-4">{error}</p>
        <button
          onClick={() => loadStats(lowStockLimit)}
          className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const periodCards = [
    { label: 'Hoje', data: stats.periods.today },
    { label: 'Últimos 7 dias', data: stats.periods.last7Days },
    { label: 'Últimos 30 dias', data: stats.periods.last30Days },
  ];

  return (
    <div className="space-y-8">
      {/* Receita e pedidos pagos por período */}
      <div className="grid gap-4 sm:grid-cols-3">
        {periodCards.map(({ label, data }) => (
          <div
            key={label}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm"
          >
            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              <span>{label}</span>
              <Calendar size={16} className="text-indigo-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatBRL(data.revenue)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {data.ordersCount} {data.ordersCount === 1 ? 'pedido pago' : 'pedidos pagos'}
            </p>
          </div>
        ))}
      </div>

      {/* Pedidos por status */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Pedidos por Status
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {ORDER_STATUSES.map((st) => (
            <div
              key={st}
              className="rounded-xl border border-gray-100 dark:border-gray-800 p-4 flex flex-col justify-between bg-gray-50/50 dark:bg-gray-800/30"
            >
              <span className={`self-start px-2.5 py-0.5 rounded-full text-xs font-semibold ${ORDER_STATUS_COLOR[st]}`}>
                {ORDER_STATUS_LABEL[st]}
              </span>
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-3">
                {stats.ordersByStatus[st] ?? 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top 5 mais vendidos */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-emerald-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Top 5 Mais Vendidos
            </h2>
          </div>

          {stats.topSellingProducts.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
              Nenhuma venda paga registrada até o momento.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {stats.topSellingProducts.map((item, idx) => (
                <li key={item.productId} className="py-3 flex items-center gap-3">
                  <span className="w-6 text-xs font-bold text-gray-400">#{idx + 1}</span>
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-10 w-10 rounded-lg object-cover bg-gray-100 dark:bg-gray-800"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                      <Package size={16} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.brandName} · {formatBRL(item.price)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {item.totalSold} un.
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">Estoque: {item.stock}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Produtos com estoque baixo */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Estoque Baixo
              </h2>
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
              <span>Limite:</span>
              <input
                type="number"
                min={0}
                max={100}
                value={lowStockLimit}
                onChange={(e) => setLowStockLimit(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-16 px-2 py-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg text-xs text-center"
              />
            </label>
          </div>

          {stats.lowStockProducts.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
              Nenhum produto com estoque menor ou igual a {lowStockLimit}.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800 max-h-80 overflow-y-auto">
              {stats.lowStockProducts.map((p) => (
                <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {p.brand.name} · {p.isActive ? 'Ativo' : 'Inativo'}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      p.stock === 0
                        ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {p.stock} em estoque
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
