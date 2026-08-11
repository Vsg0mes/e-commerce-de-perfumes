import { useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export function Admin() {
  const { token, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    brandId: '',
    categoryId: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3333/api'}/products`, 
        {
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Perfume cadastrado com sucesso!');
      setFormData({ name: '', description: '', price: '', stock: '', brandId: '', categoryId: '' });
    } catch (error) {
      console.error(error);
      alert('Erro ao cadastrar. Verifique se informou IDs de marca/categoria válidos.');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'ADMIN') {
    return <div className="text-center py-12 text-red-500">Acesso negado. Apenas administradores.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-serif font-bold text-gray-900 mb-8">Painel Administrativo</h1>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-12">
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Vendas Totais</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">R$ 0,00</dd>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Pedidos Pendentes</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">0</dd>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg border border-gray-200 p-6 max-w-2xl">
        <h2 className="text-xl font-semibold mb-6">Cadastrar Novo Perfume</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Descrição</label>
            <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Preço (R$)</label>
              <input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Estoque</label>
              <input required type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">ID da Marca</label>
              <input required type="text" value={formData.brandId} onChange={e => setFormData({...formData, brandId: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">ID da Categoria</label>
              <input required type="text" value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            {loading ? 'Salvando...' : 'Salvar Perfume'}
          </button>
          <p className="text-sm text-gray-500 mt-2">Nota: Para usar esta interface simples, você precisa saber o UUID da Marca e Categoria criados no banco.</p>
        </form>
      </div>
    </div>
  );
}
