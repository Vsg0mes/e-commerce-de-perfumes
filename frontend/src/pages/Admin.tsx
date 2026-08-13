import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Upload, Image as ImageIcon, X, PlusCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface Brand {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

export function Admin() {
  const { token, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    promotionalPrice: '',
    stock: '',
    brandId: '',
    categoryId: '',
    gender: 'Unissex',
    olfactoryFamily: '',
    concentration: 'Eau de Parfum',
    volume: '100ml',
    imageUrl: '',
  });

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
      const [brandsRes, catRes] = await Promise.all([
        axios.get(`${apiBase}/products/brands`),
        axios.get(`${apiBase}/products/categories`),
      ]);

      if (brandsRes.data.success) setBrands(brandsRes.data.data);
      if (catRes.data.success) setCategories(catRes.data.data);
    } catch (err) {
      console.error('Erro ao carregar marcas/categorias', err);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
      const submitData = new FormData();

      submitData.append('name', formData.name);
      submitData.append('description', formData.description);
      submitData.append('price', formData.price);
      if (formData.promotionalPrice) submitData.append('promotionalPrice', formData.promotionalPrice);
      submitData.append('stock', formData.stock);
      submitData.append('brandId', formData.brandId);
      submitData.append('categoryId', formData.categoryId);
      if (formData.gender) submitData.append('gender', formData.gender);
      if (formData.olfactoryFamily) submitData.append('olfactoryFamily', formData.olfactoryFamily);
      if (formData.concentration) submitData.append('concentration', formData.concentration);
      if (formData.volume) submitData.append('volume', formData.volume);

      if (imageFile) {
        submitData.append('image', imageFile);
      } else if (formData.imageUrl) {
        submitData.append('image', formData.imageUrl);
      }

      await axios.post(`${apiBase}/products`, submitData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setMessage({ type: 'success', text: 'Perfume cadastrado com sucesso!' });
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        price: '',
        promotionalPrice: '',
        stock: '',
        brandId: '',
        categoryId: '',
        gender: 'Unissex',
        olfactoryFamily: '',
        concentration: 'Eau de Parfum',
        volume: '100ml',
        imageUrl: '',
      });
      removeImage();
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.message || 'Erro ao cadastrar produto.';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center p-4 bg-red-50 text-red-500 rounded-full mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
        <p className="text-gray-500 mt-2">Você precisa de permissão de administrador para acessar esta área.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">Painel Administrativo</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie seu catálogo de perfumes</p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
          Admin Logado
        </span>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <PlusCircle className="text-indigo-600" size={24} />
          Cadastrar Novo Perfume
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome e Marca/Categoria */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Perfume *</label>
              <input
                required
                type="text"
                placeholder="Ex: Bleu de Chanel Eau de Parfum"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca *</label>
              <select
                required
                value={formData.brandId}
                onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecione uma marca...</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecione uma categoria...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição detalhada *</label>
            <textarea
              required
              rows={3}
              placeholder="Descreva as notas de topo, coração e fundo do perfume..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Preços e Estoque */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$) *</label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                placeholder="299.90"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço Promocional (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Opcional"
                value={formData.promotionalPrice}
                onChange={(e) => setFormData({ ...formData, promotionalPrice: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estoque *</label>
              <input
                required
                type="number"
                min="0"
                placeholder="10"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Atributos Olfativos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gênero</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Unissex">Unissex</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Concentração</label>
              <select
                value={formData.concentration}
                onChange={(e) => setFormData({ ...formData, concentration: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Eau de Parfum">Eau de Parfum (EDP)</option>
                <option value="Eau de Toilette">Eau de Toilette (EDT)</option>
                <option value="Parfum">Parfum</option>
                <option value="Eau de Cologne">Eau de Cologne</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Volume</label>
              <input
                type="text"
                placeholder="Ex: 100ml"
                value={formData.volume}
                onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Upload de Imagem */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Foto do Produto</label>

            <div className="space-y-4">
              {/* Dropzone / Upload Box */}
              {!imagePreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/30 transition-all group"
                >
                  <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Upload size={22} />
                  </div>
                  <p className="text-sm font-medium text-gray-700">Clique para fazer upload da foto</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG ou WEBP até 5MB</p>
                </div>
              ) : (
                <div className="relative inline-block border border-gray-200 rounded-xl p-2 bg-gray-50">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-40 h-40 object-cover rounded-lg shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md transition-colors"
                    title="Remover imagem"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />

              {/* Ou URL alternativa */}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">ou insira a URL da imagem</p>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <ImageIcon size={18} />
                  </div>
                  <input
                    type="url"
                    placeholder="https://exemplo.com/imagem-perfume.jpg"
                    value={formData.imageUrl}
                    onChange={(e) => {
                      setFormData({ ...formData, imageUrl: e.target.value });
                      if (e.target.value) {
                        setImagePreview(e.target.value);
                      }
                    }}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Cadastrando...
              </>
            ) : (
              'Cadastrar Perfume'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
