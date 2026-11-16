import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Pencil, Plus, Ticket, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { formatBRL, formatDate } from '../../lib/orderStatus';

interface CouponItem {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  startDate: string;
  expirationDate: string;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  _count?: { orders: number };
}

interface Props {
  onMessage: (msg: { type: 'success' | 'error'; text: string }) => void;
}

const fieldClass =
  'w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const labelClass = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1';

const toLocalDatetimeInput = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const defaultForm = () => ({
  code: '',
  discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
  discountValue: '',
  startDate: toLocalDatetimeInput(new Date().toISOString()),
  expirationDate: toLocalDatetimeInput(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  ),
  usageLimit: '',
  isActive: true,
});

export function AdminCoupons({ onMessage }: Props) {
  const { token } = useAuthStore();
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
  const headers = { Authorization: `Bearer ${token}` };

  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${apiBase}/coupons`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCoupons(res.data.data || []);
    } catch (err) {
      onMessage({
        type: 'error',
        text: (axios.isAxiosError(err) && err.response?.data?.message) || 'Erro ao carregar cupons.',
      });
    } finally {
      setLoading(false);
    }
  }, [apiBase, token, onMessage]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const resetForm = () => {
    setEditingId(null);
    setForm(defaultForm());
  };

  const handleEdit = (c: CouponItem) => {
    setEditingId(c.id);
    setForm({
      code: c.code,
      discountType: c.discountType,
      discountValue: String(c.discountValue),
      startDate: toLocalDatetimeInput(c.startDate),
      expirationDate: toLocalDatetimeInput(c.expirationDate),
      usageLimit: c.usageLimit != null ? String(c.usageLimit) : '',
      isActive: c.isActive,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        startDate: new Date(form.startDate).toISOString(),
        expirationDate: new Date(form.expirationDate).toISOString(),
        usageLimit: form.usageLimit.trim() ? Number(form.usageLimit) : null,
        isActive: form.isActive,
      };

      if (editingId) {
        const res = await axios.put(`${apiBase}/coupons/${editingId}`, payload, { headers });
        onMessage({ type: 'success', text: res.data?.message || 'Cupom atualizado!' });
      } else {
        const res = await axios.post(`${apiBase}/coupons`, payload, { headers });
        onMessage({ type: 'success', text: res.data?.message || 'Cupom criado!' });
      }

      resetForm();
      await loadCoupons();
    } catch (err) {
      onMessage({
        type: 'error',
        text: (axios.isAxiosError(err) && err.response?.data?.message) || 'Erro ao salvar cupom.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (c: CouponItem) => {
    if (busy) return;
    if (!window.confirm(`Excluir o cupom "${c.code}"?`)) return;
    setBusy(true);
    try {
      const res = await axios.delete(`${apiBase}/coupons/${c.id}`, { headers });
      onMessage({ type: 'success', text: res.data?.message || 'Cupom excluído!' });
      if (editingId === c.id) resetForm();
      await loadCoupons();
    } catch (err) {
      onMessage({
        type: 'error',
        text: (axios.isAxiosError(err) && err.response?.data?.message) || 'Erro ao excluir cupom.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Ticket size={20} className="text-indigo-500" />
            {editingId ? `Editar Cupom: ${form.code}` : 'Criar Novo Cupom'}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-gray-500 hover:underline"
            >
              Cancelar edição
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Código *</label>
            <input
              type="text"
              required
              placeholder="Ex: BEMVINDO10"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className={`${fieldClass} uppercase font-mono`}
            />
          </div>

          <div>
            <label className={labelClass}>Tipo de Desconto *</label>
            <select
              value={form.discountType}
              onChange={(e) =>
                setForm({ ...form, discountType: e.target.value as 'PERCENTAGE' | 'FIXED' })
              }
              className={fieldClass}
            >
              <option value="PERCENTAGE">Percentual (%)</option>
              <option value="FIXED">Valor fixo (R$)</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Valor ({form.discountType === 'PERCENTAGE' ? '%' : 'R$'}) *
            </label>
            <input
              type="number"
              required
              step="0.01"
              min="0.01"
              max={form.discountType === 'PERCENTAGE' ? '100' : undefined}
              placeholder={form.discountType === 'PERCENTAGE' ? '10' : '50.00'}
              value={form.discountValue}
              onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Início da Validade *</label>
            <input
              type="datetime-local"
              required
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Data de Expiração *</label>
            <input
              type="datetime-local"
              required
              value={form.expirationDate}
              onChange={(e) => setForm({ ...form, expirationDate: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>Limite de Usos (opcional)</label>
            <input
              type="number"
              min="1"
              placeholder="Ilimitado"
              value={form.usageLimit}
              onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
              className={fieldClass}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>Cupom ativo</span>
          </label>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus size={16} />
            {editingId ? 'Salvar Alterações' : 'Criar Cupom'}
          </button>
        </div>
      </form>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Desconto</th>
              <th className="px-4 py-3">Validade</th>
              <th className="px-4 py-3 text-center">Usos</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
            {loading && coupons.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  Carregando cupons...
                </td>
              </tr>
            )}
            {!loading && coupons.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  Nenhum cupom cadastrado.
                </td>
              </tr>
            )}
            {coupons.map((c) => {
              const expired = new Date(c.expirationDate).getTime() < Date.now();
              return (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-gray-100">
                    {c.code}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {c.discountType === 'PERCENTAGE'
                      ? `${Number(c.discountValue)}%`
                      : formatBRL(Number(c.discountValue))}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div>De: {formatDate(c.startDate)}</div>
                    <div>Até: {formatDate(c.expirationDate)}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold">{c.usedCount}</span>
                    <span className="text-gray-400">
                      {' '}
                      / {c.usageLimit != null ? c.usageLimit : '∞'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        !c.isActive
                          ? 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          : expired
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {!c.isActive ? 'Inativo' : expired ? 'Expirado' : 'Ativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(c)}
                        className="p-2 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        disabled={busy}
                        className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
