import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Upload,
  Image as ImageIcon,
  X,
  PlusCircle,
  Plus,
  Minus,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Search,
  Power,
  Package,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { AdminOrders } from '../components/admin/AdminOrders';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { AdminBrandsCategories, type CatalogEntity } from '../components/admin/AdminBrandsCategories';
import { AdminCustomers } from '../components/admin/AdminCustomers';
import { AdminCoupons } from '../components/admin/AdminCoupons';
import { formatBRL, type Pagination } from '../lib/orderStatus';

const emptyForm = {
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
};

interface ProductItem {
  id: string;
  name: string;
  description?: string;
  price: number | string;
  promotionalPrice?: number | string | null;
  stock: number;
  image?: string | null;
  isActive: boolean;
  gender?: string | null;
  olfactoryFamily?: string | null;
  concentration?: string | null;
  volume?: string | null;
  brandId: string;
  categoryId: string;
  brand?: { id: string; name: string };
  category?: { id: string; name: string };
}

type FormState = typeof emptyForm;

interface ProductFieldsProps {
  data: FormState;
  setData: (d: FormState) => void;
  brands: CatalogEntity[];
  categories: CatalogEntity[];
  preview: string | null;
  setPreview: (p: string | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  onUrlTyped: () => void;
}

const inputClass =
  'w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

function ProductFields({
  data,
  setData,
  brands,
  categories,
  preview,
  setPreview,
  fileInputRef,
  onFileChange,
  onRemove,
  onUrlTyped,
}: ProductFieldsProps) {
  const [previewError, setPreviewError] = useState(false);
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className={labelClass}>Nome do Perfume *</label>
          <input
            required
            type="text"
            placeholder="Ex: Bleu de Chanel Eau de Parfum"
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Marca *</label>
          <select
            required
            value={data.brandId}
            onChange={(e) => setData({ ...data, brandId: e.target.value })}
            className={inputClass}
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
          <label className={labelClass}>Categoria *</label>
          <select
            required
            value={data.categoryId}
            onChange={(e) => setData({ ...data, categoryId: e.target.value })}
            className={inputClass}
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

      <div>
        <label className={labelClass}>Descrição detalhada *</label>
        <textarea
          required
          rows={3}
          placeholder="Descreva as notas de topo, coração e fundo do perfume..."
          value={data.description}
          onChange={(e) => setData({ ...data, description: e.target.value })}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div>
          <label className={labelClass}>Preço (R$) *</label>
          <input
            required
            type="number"
            step="0.01"
            min="0"
            placeholder="299.90"
            value={data.price}
            onChange={(e) => setData({ ...data, price: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Preço Promocional (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Opcional"
            value={data.promotionalPrice}
            onChange={(e) => setData({ ...data, promotionalPrice: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Estoque *</label>
          <input
            required
            type="number"
            min="0"
            placeholder="10"
            value={data.stock}
            onChange={(e) => setData({ ...data, stock: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div>
          <label className={labelClass}>Gênero</label>
          <select
            value={data.gender}
            onChange={(e) => setData({ ...data, gender: e.target.value })}
            className={inputClass}
          >
            <option value="Masculino">Masculino</option>
            <option value="Feminino">Feminino</option>
            <option value="Unissex">Unissex</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Família Olfativa</label>
          <input
            type="text"
            placeholder="Ex: Amadeirado Aromático"
            value={data.olfactoryFamily}
            onChange={(e) => setData({ ...data, olfactoryFamily: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Concentração</label>
          <select
            value={data.concentration}
            onChange={(e) => setData({ ...data, concentration: e.target.value })}
            className={inputClass}
          >
            <option value="Eau de Parfum">Eau de Parfum (EDP)</option>
            <option value="Eau de Toilette">Eau de Toilette (EDT)</option>
            <option value="Parfum">Parfum</option>
            <option value="Eau de Cologne">Eau de Cologne</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Volume</label>
          <input
            type="text"
            placeholder="Ex: 100ml"
            value={data.volume}
            onChange={(e) => setData({ ...data, volume: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Foto do Produto
        </label>

        <div className="space-y-4">
          {!preview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all group"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Upload size={22} />
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Clique para fazer upload da foto
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">PNG, JPG ou WEBP até 5MB</p>
            </div>
          ) : (
            <div className="relative inline-block border border-gray-200 dark:border-gray-700 rounded-xl p-2 bg-gray-50 dark:bg-gray-800">
              <img
                src={preview}
                alt="Preview"
                referrerPolicy="no-referrer"
                onError={() => setPreviewError(true)}
                onLoad={() => setPreviewError(false)}
                className="w-40 h-40 object-cover rounded-lg shadow-sm"
              />
              <button
                type="button"
                onClick={onRemove}
                className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md transition-colors"
                title="Remover imagem"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {preview && previewError && (
            <p className="text-xs text-red-500">
              Não foi possível carregar esta imagem. Use o link direto da imagem (.jpg, .png, .webp) ou envie o arquivo.
            </p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onFileChange}
            className="hidden"
          />

          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              ou insira a URL da imagem
            </p>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <ImageIcon size={18} />
              </div>
              <input
                type="text"
                placeholder="https://exemplo.com/imagem-perfume.jpg"
                value={data.imageUrl}
                onChange={(e) => {
                  setData({ ...data, imageUrl: e.target.value });
                  onUrlTyped();
                  setPreview(e.target.value || null);
                }}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

interface AccordionProps {
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Accordion({ title, icon, open, onToggle, children }: AccordionProps) {
  return (
    <div className="bg-white dark:bg-gray-900 shadow-sm rounded-2xl border border-gray-100 dark:border-gray-800 mb-6 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-8 py-5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <span className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          {icon}
          {title}
        </span>
        <span className="text-indigo-600 dark:text-indigo-400">
          {open ? <Minus size={24} /> : <Plus size={24} />}
        </span>
      </button>
      {open && <div className="px-8 pb-8">{children}</div>}
    </div>
  );
}

type AdminTab = 'dashboard' | 'products' | 'catalog' | 'coupons' | 'orders' | 'customers';

export function Admin() {
  const { token, user } = useAuthStore();
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';

  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<CatalogEntity[]>([]);
  const [categories, setCategories] = useState<CatalogEntity[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const editSectionRef = useRef<HTMLDivElement>(null);

  // Estado da tabela paginada de produtos no Admin
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [prodPagination, setProdPagination] = useState<Pagination | null>(null);
  const [prodPage, setProdPage] = useState(1);
  const [prodSearch, setProdSearch] = useState('');
  const [prodQuery, setProdQuery] = useState('');
  const [filterBrandId, setFilterBrandId] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterActive, setFilterActive] = useState<'' | 'true' | 'false'>('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [prodLoading, setProdLoading] = useState(false);
  const [prodError, setProdError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [editData, setEditData] = useState(emptyForm);
  const [editLoading, setEditLoading] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setProdQuery(prodSearch.trim());
      setProdPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [prodSearch]);

  const fetchOptions = useCallback(async () => {
    try {
      const [brandsRes, catRes] = await Promise.all([
        axios.get(`${apiBase}/products/brands`),
        axios.get(`${apiBase}/products/categories`),
      ]);
      if (brandsRes.data.success) setBrands(brandsRes.data.data);
      if (catRes.data.success) setCategories(catRes.data.data);
    } catch (err) {
      console.error('Erro ao carregar marcas/categorias', err);
    }
  }, [apiBase]);

  const fetchAdminProducts = useCallback(async () => {
    if (!token) return;
    setProdLoading(true);
    setProdError(null);
    try {
      const res = await axios.get(`${apiBase}/products/admin`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: prodPage,
          limit: 10,
          ...(prodQuery ? { search: prodQuery } : {}),
          ...(filterBrandId ? { brandId: filterBrandId } : {}),
          ...(filterCategoryId ? { categoryId: filterCategoryId } : {}),
          ...(filterActive ? { isActive: filterActive } : {}),
          ...(filterLowStock ? { lowStock: 'true', lowStockThreshold: 5 } : {}),
        },
      });
      setProducts(res.data.data);
      setProdPagination(res.data.pagination);
    } catch (err) {
      setProdError(
        (axios.isAxiosError(err) && err.response?.data?.message) ||
          'Erro ao carregar lista de produtos.'
      );
    } finally {
      setProdLoading(false);
    }
  }, [
    apiBase,
    token,
    prodPage,
    prodQuery,
    filterBrandId,
    filterCategoryId,
    filterActive,
    filterLowStock,
  ]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  useEffect(() => {
    fetchAdminProducts();
  }, [fetchAdminProducts]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(t);
  }, [message]);

  const handleOpenProductEdit = (p: ProductItem) => {
    setSelectedProductId(p.id);
    setEditImageFile(null);
    if (editFileInputRef.current) editFileInputRef.current.value = '';
    setEditData({
      name: p.name,
      description: p.description ?? '',
      price: String(p.price),
      promotionalPrice: p.promotionalPrice != null ? String(p.promotionalPrice) : '',
      stock: String(p.stock),
      brandId: p.brandId,
      categoryId: p.categoryId,
      gender: p.gender ?? 'Unissex',
      olfactoryFamily: p.olfactoryFamily ?? '',
      concentration: p.concentration ?? 'Eau de Parfum',
      volume: p.volume ?? '100ml',
      imageUrl: p.image ?? '',
    });
    setEditPreview(p.image ?? null);
    setIsEditOpen(true);
    setTimeout(() => {
      editSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleToggleProductActive = async (p: ProductItem) => {
    if (togglingId === p.id) return;
    setTogglingId(p.id);
    try {
      const res = await axios.patch(
        `${apiBase}/products/${p.id}/active`,
        { isActive: !p.isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updated = res.data.data as ProductItem;
      setProducts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setMessage({
        type: 'success',
        text: res.data?.message || (updated.isActive ? 'Produto reativado!' : 'Produto desativado!'),
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text:
          (axios.isAxiosError(err) && err.response?.data?.message) ||
          'Erro ao alterar status do produto.',
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setEditPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeEditImage = () => {
    setEditImageFile(null);
    setEditPreview(null);
    setEditData({ ...editData, imageUrl: '' });
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;
    setEditLoading(true);
    setMessage(null);
    try {
      const d = editData;
      const currentProduct = products.find((x) => x.id === selectedProductId);
      const submitData = new FormData();
      submitData.append('name', d.name);
      submitData.append('description', d.description);
      submitData.append('price', d.price);
      submitData.append('promotionalPrice', d.promotionalPrice || '');
      submitData.append('stock', d.stock);
      submitData.append('brandId', d.brandId);
      submitData.append('categoryId', d.categoryId);
      submitData.append('gender', d.gender);
      submitData.append('olfactoryFamily', d.olfactoryFamily);
      submitData.append('concentration', d.concentration);
      submitData.append('volume', d.volume);
      if (editImageFile) submitData.append('image', editImageFile);
      else if (d.imageUrl && d.imageUrl !== currentProduct?.image) submitData.append('image', d.imageUrl);

      const res = await axios.put(`${apiBase}/products/${selectedProductId}`, submitData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updated = res.data.data as ProductItem;
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditImageFile(null);
      setEditData((prev) => ({ ...prev, imageUrl: updated.image ?? '' }));
      setEditPreview(updated.image ?? null);
      setMessage({ type: 'success', text: 'Produto atualizado com sucesso!' });
    } catch (error: any) {
      console.error(error);
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Erro ao atualizar produto.',
      });
    } finally {
      setEditLoading(false);
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

  const clearFile = () => {
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearEditFile = () => {
    setEditImageFile(null);
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData({ ...formData, imageUrl: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
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

      setFormData(emptyForm);
      removeImage();
      setIsCreateOpen(false);
      fetchAdminProducts();
      fetchOptions();
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
        <div className="inline-flex items-center justify-center p-4 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-full mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Acesso Restrito</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Você precisa de permissão de administrador para acessar esta área.
        </p>
      </div>
    );
  }

  const tabs: Array<[AdminTab, string]> = [
    ['dashboard', 'Resumo'],
    ['products', 'Produtos'],
    ['catalog', 'Marcas e Categorias'],
    ['coupons', 'Cupons'],
    ['orders', 'Pedidos'],
    ['customers', 'Clientes'],
  ];

  const filterSelectClass =
    'px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100">
            Painel Administrativo
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gerencie catálogo, estoque, pedidos e clientes da loja
          </p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
          Admin Logado
        </span>
      </div>

      {message && (
        <div
          role="alert"
          className={`fixed top-24 right-6 z-50 max-w-sm shadow-xl p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6" role="tablist">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <AdminDashboard />}

      {tab === 'orders' && <AdminOrders onMessage={setMessage} />}

      {tab === 'customers' && <AdminCustomers />}

      {tab === 'coupons' && <AdminCoupons onMessage={setMessage} />}

      {tab === 'catalog' && (
        <AdminBrandsCategories
          brands={brands}
          categories={categories}
          onRefresh={fetchOptions}
          onMessage={setMessage}
        />
      )}

      {tab === 'products' && (
        <div className="space-y-6">
          <Accordion
            title="Cadastrar Novo Produto"
            icon={<PlusCircle className="text-indigo-600 dark:text-indigo-400" size={24} />}
            open={isCreateOpen}
            onToggle={() => setIsCreateOpen((v) => !v)}
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <ProductFields
                data={formData}
                setData={setFormData}
                brands={brands}
                categories={categories}
                preview={imagePreview}
                setPreview={setImagePreview}
                fileInputRef={fileInputRef}
                onFileChange={handleImageChange}
                onRemove={removeImage}
                onUrlTyped={clearFile}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
              >
                {loading ? 'Cadastrando...' : 'Cadastrar Perfume'}
              </button>
            </form>
          </Accordion>

          {/* Filtros e tabela paginada de produtos */}
          <div className="bg-white dark:bg-gray-900 shadow-sm rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Catálogo de Produtos
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Clique em um produto para editar seus dados
              </span>
            </div>

            <div className="flex flex-wrap gap-3 mb-5">
              <div className="relative flex-1 min-w-[200px]">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={prodSearch}
                  onChange={(e) => setProdSearch(e.target.value)}
                  placeholder="Buscar por nome ou descrição..."
                  className={`${filterSelectClass} w-full pl-9`}
                />
              </div>

              <select
                value={filterBrandId}
                onChange={(e) => {
                  setFilterBrandId(e.target.value);
                  setProdPage(1);
                }}
                className={filterSelectClass}
                aria-label="Filtrar por marca"
              >
                <option value="">Todas as marcas</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <select
                value={filterCategoryId}
                onChange={(e) => {
                  setFilterCategoryId(e.target.value);
                  setProdPage(1);
                }}
                className={filterSelectClass}
                aria-label="Filtrar por categoria"
              >
                <option value="">Todas as categorias</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={filterActive}
                onChange={(e) => {
                  setFilterActive(e.target.value as '' | 'true' | 'false');
                  setProdPage(1);
                }}
                className={filterSelectClass}
                aria-label="Filtrar por status"
              >
                <option value="">Ativos e inativos</option>
                <option value="true">Somente ativos</option>
                <option value="false">Somente inativos</option>
              </select>

              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterLowStock}
                  onChange={(e) => {
                    setFilterLowStock(e.target.checked);
                    setProdPage(1);
                  }}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Estoque baixo (≤ 5)</span>
              </label>
            </div>

            {prodError && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300 flex items-center justify-between"
              >
                <span>{prodError}</span>
                <button
                  onClick={fetchAdminProducts}
                  className="px-3 py-1 rounded bg-red-600 text-white text-xs font-medium"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3">Marca / Categoria</th>
                    <th className="px-4 py-3 text-right">Preço</th>
                    <th className="px-4 py-3 text-center">Estoque</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                  {prodLoading && products.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                        Carregando produtos...
                      </td>
                    </tr>
                  )}
                  {!prodLoading && products.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                        Nenhum produto encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                  {products.map((p) => {
                    const isSelected = selectedProductId === p.id && isEditOpen;
                    return (
                      <tr
                        key={p.id}
                        onClick={() => handleOpenProductEdit(p)}
                        className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40 ${
                          isSelected ? 'bg-indigo-50/60 dark:bg-indigo-950/30' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {p.image ? (
                              <img
                                src={p.image}
                                alt={p.name}
                                className="h-11 w-11 rounded-lg object-cover bg-gray-100 dark:bg-gray-800 shrink-0"
                              />
                            ) : (
                              <div className="h-11 w-11 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 shrink-0">
                                <Package size={18} />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {p.name}
                              </div>
                              <div className="text-xs text-gray-400">
                                {p.volume || '100ml'} · {p.concentration || 'EDP'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-900 dark:text-gray-100">
                            {p.brand?.name || '—'}
                          </div>
                          <div className="text-xs text-gray-500">{p.category?.name || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {p.promotionalPrice ? (
                            <div>
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                {formatBRL(Number(p.promotionalPrice))}
                              </span>
                              <span className="block text-xs text-gray-400 line-through">
                                {formatBRL(Number(p.price))}
                              </span>
                            </div>
                          ) : (
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {formatBRL(Number(p.price))}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              p.stock === 0
                                ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                : p.stock <= 5
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`}
                          >
                            {p.stock} un.
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              p.isActive
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                            }`}
                          >
                            {p.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenProductEdit(p)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                            >
                              <Pencil size={13} /> Editar
                            </button>
                            <button
                              type="button"
                              disabled={togglingId === p.id}
                              onClick={() => handleToggleProductActive(p)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                                p.isActive
                                  ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100'
                                  : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100'
                              }`}
                            >
                              <Power size={13} />
                              {p.isActive ? 'Desativar' : 'Reativar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {prodPagination && prodPagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 text-sm text-gray-600 dark:text-gray-300">
                <span>
                  {prodPagination.total} produtos · página {prodPagination.page} de{' '}
                  {prodPagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={prodPage <= 1}
                    onClick={() => setProdPage((p) => p - 1)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={prodPage >= prodPagination.totalPages}
                    onClick={() => setProdPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>

          <div ref={editSectionRef}>
            {selectedProductId && (
              <Accordion
                title={`Editar Produto: ${editData.name || ''}`}
                icon={<Pencil className="text-indigo-600 dark:text-indigo-400" size={24} />}
                open={isEditOpen}
                onToggle={() => setIsEditOpen((v) => !v)}
              >
                <form onSubmit={handleUpdate} className="space-y-6">
                  <ProductFields
                    data={editData}
                    setData={setEditData}
                    brands={brands}
                    categories={categories}
                    preview={editPreview}
                    setPreview={setEditPreview}
                    fileInputRef={editFileInputRef}
                    onFileChange={handleEditImageChange}
                    onRemove={removeEditImage}
                    onUrlTyped={clearEditFile}
                  />
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={editLoading}
                      className="flex-1 py-3 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {editLoading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditOpen(false);
                        setSelectedProductId('');
                      }}
                      className="py-3 px-6 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Fechar
                    </button>
                  </div>
                </form>
              </Accordion>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
