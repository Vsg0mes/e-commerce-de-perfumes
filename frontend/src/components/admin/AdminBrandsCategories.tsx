import { useState } from 'react';
import axios from 'axios';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export interface CatalogEntity {
  id: string;
  name: string;
  _count?: { products: number };
}

interface Props {
  brands: CatalogEntity[];
  categories: CatalogEntity[];
  onRefresh: () => Promise<void>;
  onMessage: (msg: { type: 'success' | 'error'; text: string }) => void;
}

const fieldClass =
  'px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

function EntityManager({
  title,
  endpoint,
  items,
  onRefresh,
  onMessage,
}: {
  title: string;
  endpoint: 'brands' | 'categories';
  items: CatalogEntity[];
  onRefresh: () => Promise<void>;
  onMessage: (msg: { type: 'success' | 'error'; text: string }) => void;
}) {
  const { token } = useAuthStore();
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
  const headers = { Authorization: `Bearer ${token}` };

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [busy, setBusy] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const res = await axios.post(`${apiBase}/products/${endpoint}`, { name }, { headers });
      setNewName('');
      await onRefresh();
      onMessage({ type: 'success', text: res.data?.message || 'Criado com sucesso!' });
    } catch (err) {
      onMessage({
        type: 'error',
        text: (axios.isAxiosError(err) && err.response?.data?.message) || 'Erro ao criar item.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async (id: string) => {
    const name = editingName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const res = await axios.put(`${apiBase}/products/${endpoint}/${id}`, { name }, { headers });
      setEditingId(null);
      setEditingName('');
      await onRefresh();
      onMessage({ type: 'success', text: res.data?.message || 'Renomeado com sucesso!' });
    } catch (err) {
      onMessage({
        type: 'error',
        text: (axios.isAxiosError(err) && err.response?.data?.message) || 'Erro ao renomear.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (item: CatalogEntity) => {
    if (busy) return;
    if (!window.confirm(`Excluir "${item.name}"?`)) return;
    setBusy(true);
    try {
      const res = await axios.delete(`${apiBase}/products/${endpoint}/${item.id}`, { headers });
      await onRefresh();
      onMessage({ type: 'success', text: res.data?.message || 'Excluído com sucesso!' });
    } catch (err) {
      onMessage({
        type: 'error',
        text: (axios.isAxiosError(err) && err.response?.data?.message) || 'Erro ao excluir.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h2>

      <form onSubmit={handleCreate} className="flex gap-2 mb-5">
        <input
          type="text"
          required
          placeholder={`Nova ${title.toLowerCase().slice(0, -1)}...`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className={`${fieldClass} flex-1`}
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus size={16} /> Adicionar
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
          Nenhum registro cadastrado.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((item) => {
            const count = item._count?.products ?? 0;
            const isEditing = editingId === item.id;
            return (
              <li key={item.id} className="py-3 flex items-center justify-between gap-3">
                {isEditing ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className={`${fieldClass} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => handleRename(item.id)}
                      disabled={busy}
                      className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                      title="Salvar"
                    >
                      <Check size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                      title="Cancelar"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {item.name}
                      </span>
                      <span className="ml-2 text-xs text-gray-400">
                        ({count} {count === 1 ? 'produto' : 'produtos'})
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(item.id);
                          setEditingName(item.name);
                        }}
                        className="p-2 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Renomear"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        disabled={busy}
                        className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function AdminBrandsCategories({ brands, categories, onRefresh, onMessage }: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <EntityManager
        title="Marcas"
        endpoint="brands"
        items={brands}
        onRefresh={onRefresh}
        onMessage={onMessage}
      />
      <EntityManager
        title="Categorias"
        endpoint="categories"
        items={categories}
        onRefresh={onRefresh}
        onMessage={onMessage}
      />
    </div>
  );
}
