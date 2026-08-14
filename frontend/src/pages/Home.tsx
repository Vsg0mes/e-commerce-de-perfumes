import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ProductCard } from '../components/ProductCard';
import { Filter, X, Search } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

export function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Active filter state synced with URL search params
  const searchQuery = searchParams.get('search') || '';
  const selectedGender = searchParams.get('gender') || '';
  const selectedBrand = searchParams.get('brand') || '';
  const selectedCategory = searchParams.get('category') || '';
  const selectedSort = searchParams.get('sort') || '';

  // Load brands and categories on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
        const [brandsRes, catRes] = await Promise.all([
          axios.get(`${apiBase}/products/brands`),
          axios.get(`${apiBase}/products/categories`),
        ]);
        if (brandsRes.data.success) setBrands(brandsRes.data.data);
        if (catRes.data.success) setCategories(catRes.data.data);
      } catch (err) {
        console.error('Erro ao carregar marcas/categorias:', err);
      }
    };

    fetchMetadata();
  }, []);

  // Fetch products when filters or search change
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
      const params: Record<string, string> = {};

      if (searchQuery) params.search = searchQuery;
      if (selectedGender) params.gender = selectedGender;
      if (selectedBrand) params.brand = selectedBrand;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedSort) params.sort = selectedSort;

      const res = await axios.get(`${apiBase}/products`, { params });
      if (res.data.success) {
        setProducts(res.data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedGender, selectedBrand, selectedCategory, selectedSort]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Update a single filter in searchParams
  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters = searchQuery || selectedGender || selectedBrand || selectedCategory || selectedSort;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            {searchQuery ? `Busca por: "${searchQuery}"` : 'Nossos Perfumes'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {products.length} {products.length === 1 ? 'perfume encontrado' : 'perfumes encontrados'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={selectedSort}
            onChange={(e) => updateFilter('sort', e.target.value)}
            className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg py-2 px-4 focus:ring-2 focus:ring-indigo-500 text-sm focus:outline-none transition-colors"
          >
            <option value="">Ordenar por...</option>
            <option value="price_asc">Menor Preço</option>
            <option value="price_desc">Maior Preço</option>
            <option value="newest">Mais recentes</option>
          </select>
        </div>
      </div>

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-6 p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-800">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">Filtros ativos:</span>
          
          {searchQuery && (
            <span className="inline-flex items-center gap-1 text-xs bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-3 py-1 rounded-full font-medium">
              <Search size={12} /> "{searchQuery}"
              <button onClick={() => updateFilter('search', '')} className="hover:text-indigo-950 dark:hover:text-indigo-100 ml-1"><X size={14} /></button>
            </span>
          )}

          {selectedGender && (
            <span className="inline-flex items-center gap-1 text-xs bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-3 py-1 rounded-full font-medium">
              Gênero: {selectedGender}
              <button onClick={() => updateFilter('gender', '')} className="hover:text-indigo-950 dark:hover:text-indigo-100 ml-1"><X size={14} /></button>
            </span>
          )}

          {selectedBrand && (
            <span className="inline-flex items-center gap-1 text-xs bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-3 py-1 rounded-full font-medium">
              Marca: {selectedBrand}
              <button onClick={() => updateFilter('brand', '')} className="hover:text-indigo-950 dark:hover:text-indigo-100 ml-1"><X size={14} /></button>
            </span>
          )}

          {selectedCategory && (
            <span className="inline-flex items-center gap-1 text-xs bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-3 py-1 rounded-full font-medium">
              Categoria: {selectedCategory}
              <button onClick={() => updateFilter('category', '')} className="hover:text-indigo-950 dark:hover:text-indigo-100 ml-1"><X size={14} /></button>
            </span>
          )}

          <button
            onClick={clearFilters}
            className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium ml-auto"
          >
            Limpar todos
          </button>
        </div>
      )}

      <div className="flex gap-8">
        {/* Sidebar Filters */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-24 space-y-6 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Filter size={18} className="text-indigo-600 dark:text-indigo-400" />
                Filtros
              </h3>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                  Limpar
                </button>
              )}
            </div>

            {/* Gênero */}
            <div>
              <h4 className="font-medium text-sm text-gray-900 dark:text-gray-200 mb-3">Gênero</h4>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    checked={selectedGender === ''}
                    onChange={() => updateFilter('gender', '')}
                    className="text-indigo-600 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700"
                  />
                  <span className="ml-2.5 text-sm text-gray-600 dark:text-gray-400">Todos</span>
                </label>
                {['Masculino', 'Feminino', 'Unissex'].map(gender => (
                  <label key={gender} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      checked={selectedGender === gender}
                      onChange={() => updateFilter('gender', gender)}
                      className="text-indigo-600 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700"
                    />
                    <span className="ml-2.5 text-sm text-gray-600 dark:text-gray-400">{gender}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Marca */}
            <div>
              <h4 className="font-medium text-sm text-gray-900 dark:text-gray-200 mb-3">Marca</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="brand"
                    checked={selectedBrand === ''}
                    onChange={() => updateFilter('brand', '')}
                    className="text-indigo-600 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700"
                  />
                  <span className="ml-2.5 text-sm text-gray-600 dark:text-gray-400">Todas</span>
                </label>
                {brands.map(b => (
                  <label key={b.id} className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="brand"
                      checked={selectedBrand === b.name}
                      onChange={() => updateFilter('brand', b.name)}
                      className="text-indigo-600 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700"
                    />
                    <span className="ml-2.5 text-sm text-gray-600 dark:text-gray-400">{b.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Categoria */}
            {categories.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-gray-900 dark:text-gray-200 mb-3">Categoria</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      checked={selectedCategory === ''}
                      onChange={() => updateFilter('category', '')}
                      className="text-indigo-600 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700"
                    />
                    <span className="ml-2.5 text-sm text-gray-600 dark:text-gray-400">Todas</span>
                  </label>
                  {categories.map(c => (
                    <label key={c.id} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="category"
                        checked={selectedCategory === c.name}
                        onChange={() => updateFilter('category', c.name)}
                        className="text-indigo-600 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700"
                      />
                      <span className="ml-2.5 text-sm text-gray-600 dark:text-gray-400">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-800 h-96 rounded-2xl"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
          
          {products.length === 0 && !loading && (
            <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8">
              <Search className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Nenhum perfume encontrado</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 mb-6">
                Tente ajustar seus termos de busca ou remover alguns filtros.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  Limpar todos os filtros
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
