import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Upload, Image as ImageIcon, X, PlusCircle, Plus, Minus, Pencil, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { AdminOrders } from '../components/admin/AdminOrders';

interface Brand {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

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
  gender?: string | null;
  olfactoryFamily?: string | null;
  concentration?: string | null;
  volume?: string | null;
  brandId: string;
  categoryId: string;
}

type FormState = typeof emptyForm;

interface ProductFieldsProps {
  data: FormState;
  setData: (d: FormState) => void;
  brands: Brand[];
  categories: Category[];
  preview: string | null;
  setPreview: (p: string | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  onUrlTyped: () => void;
}

const inputClass = "w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

function ProductFields({ data, setData, brands, categories, preview, setPreview, fileInputRef, onFileChange, onRemove, onUrlTyped }: ProductFieldsProps) {
  const [previewError, setPreviewError] = useState(false);
  return (
    <>
    {/* Nome e Marca/Categoria */}
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

    {/* Descrição */}
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

    {/* Preços e Estoque */}
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

    {/* Atributos Olfativos */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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

    {/* Upload de Imagem */}
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Foto do Produto</label>

      <div className="space-y-4">
        {/* Dropzone / Upload Box */}
        {!preview ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all group"
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Upload size={22} />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Clique para fazer upload da foto</p>
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
          <p className="text-xs text-red-500">Não foi possível carregar esta imagem. Use o link direto da imagem (.jpg, .png, .webp) ou envie o arquivo.</p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFileChange}
          className="hidden"
        />

        {/* Ou URL alternativa */}
        <div>
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">ou insira a URL da imagem</p>
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
        <span className="text-indigo-600 dark:text-indigo-400">{open ? <Minus size={24} /> : <Plus size={24} />}</span>
      </button>
      {open && <div className="px-8 pb-8">{children}</div>}
    </div>
  );
}

export function Admin() {
  const { token, user } = useAuthStore();
  const [tab, setTab] = useState<'products' | 'orders'>('products');
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState(emptyForm);

  const [isCreateOpen, setIsCreateOpen] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [editData, setEditData] = useState(emptyForm);
  const [editLoading, setEditLoading] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchOptions();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(t);
  }, [message]);

  const fetchProducts = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
      const res = await axios.get(`${apiBase}/products`, { params: { limit: 1000 } });
      if (res.data.success) setProducts(res.data.data);
    } catch (err) {
      console.error('Erro ao carregar produtos', err);
    }
  };

  const handleSelectProductToEdit = (productId: string) => {
    setSelectedProductId(productId);
    setEditImageFile(null);
    if (editFileInputRef.current) editFileInputRef.current.value = '';
    const p = products.find((x) => x.id === productId);
    if (!p) {
      setEditData(emptyForm);
      setEditPreview(null);
      return;
    }
    setEditData({
      name: p.name,
      description: p.description ?? '',
      price: String(p.price),
      promotionalPrice: p.promotionalPrice != null ? String(p.promotionalPrice) : '',
      stock: String(p.stock),
      brandId: p.brandId,
      categoryId: p.categoryId,
      gender: p.gender ?? '',
      olfactoryFamily: p.olfactoryFamily ?? '',
      concentration: p.concentration ?? '',
      volume: p.volume ?? '',
      imageUrl: p.image ?? '',
    });
    setEditPreview(p.image ?? null);
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
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
      const d = editData;
      const currentProduct = products.find((x) => x.id === selectedProductId);
      const submitData = new FormData();
      submitData.append('name', d.name);
      submitData.append('description', d.description);
      submitData.append('price', d.price);
      if (d.promotionalPrice) submitData.append('promotionalPrice', d.promotionalPrice);
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
      setMessage({ type: 'error', text: error.response?.data?.message || 'Erro ao atualizar produto.' });
    } finally {
      setEditLoading(false);
    }
  };

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
      setFormData(emptyForm);
      removeImage();
      fetchProducts();
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
        <p className="text-gray-500 dark:text-gray-400 mt-2">Você precisa de permissão de administrador para acessar esta área.</p>
      </div>
    );
  }

  return (
    <div className={`${tab === 'orders' ? 'max-w-6xl' : 'max-w-4xl'} mx-auto px-4 sm:px-6 lg:px-8 py-12`}>
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100">Painel Administrativo</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gerencie seu catálogo de perfumes</p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
          Admin Logado
        </span>
      </div>

      {message && (
        <div
          role="alert"
          className={`fixed top-24 right-6 z-50 max-w-sm shadow-xl p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      <div className="flex gap-2 mb-6" role="tablist">
        {([['products', 'Produtos'], ['orders', 'Pedidos']] as const).map(([key, label]) => (
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

      {tab === 'orders' ? (
        <AdminOrders onMessage={setMessage} />
      ) : (
      <>
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
      </Accordion>

      <Accordion
        title="Editar Produto Existente"
        icon={<Pencil className="text-indigo-600 dark:text-indigo-400" size={24} />}
        open={isEditOpen}
        onToggle={() => setIsEditOpen((v) => !v)}
      >
        <div className="mb-6">
          <label className={labelClass}>Selecione o produto</label>
          <select
            value={selectedProductId}
            onChange={(e) => handleSelectProductToEdit(e.target.value)}
            className={inputClass}
          >
            <option value="">Selecione um perfume...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {selectedProductId && (
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
            <button
              type="submit"
              disabled={editLoading}
              className="w-full py-3 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {editLoading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </form>
        )}
      </Accordion>
      </>
      )}
    </div>
  );
}
