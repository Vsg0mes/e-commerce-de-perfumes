import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ProductCard } from '../components/ProductCard';
import { HeroSection } from '../components/HeroSection';
import { DifferentialsBar } from '../components/DifferentialsBar';
import { NossaEssencia } from '../components/NossaEssencia';
import { TestimonialsSection } from '../components/TestimonialsSection';
import { CtaSection } from '../components/CtaSection';
import { Filter, X, Search, SlidersHorizontal, Sparkles } from 'lucide-react';

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
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

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
        if (brandsRes.data?.success) setBrands(brandsRes.data.data);
        if (catRes.data?.success) setCategories(catRes.data.data);
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
      if (res.data?.success) {
        setProducts(res.data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      setProducts([]);
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

  const hasActiveFilters = Boolean(
    searchQuery || selectedGender || selectedBrand || selectedCategory || selectedSort
  );

  // Smooth scroll helpers
  const scrollToCollection = () => {
    const target = document.getElementById('colecao');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToEssence = () => {
    const target = document.getElementById('essencia');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Desired products priority order:
  // Sauvage, CH MEN, MYSLF, PRADA PARADOXE, SCANDAL, GOOD GIRL
  const displayedProducts = useMemo(() => {
    if (!products.length) return [];

    const priorityKeys = ['sauvage', 'ch men', 'myslf', 'paradoxe', 'scandal', 'good girl'];

    return [...products].sort((a: any, b: any) => {
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();

      const aIndex = priorityKeys.findIndex((key) => aName.includes(key));
      const bIndex = priorityKeys.findIndex((key) => bName.includes(key));

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return 0;
    });
  }, [products]);

  const quickFilterGenders = ['Todos', 'Masculino', 'Feminino', 'Unissex'];

  return (
    <div className="bg-[#080808] text-gray-100 min-h-screen">
      {/* 1. HERO SECTION (100vh) */}
      <HeroSection onExploreClick={scrollToCollection} onBrandClick={scrollToEssence} />

      {/* 2. DIFFERENTIALS BAR */}
      <DifferentialsBar />

      {/* 3. COLEÇÃO EXCLUSIVA (Products, Quick Filters & Sidebar Filters) */}
      <section id="colecao" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#D4AF37]/25 bg-[#121214]/80 backdrop-blur-md mb-4">
            <Sparkles size={12} className="text-[#D4AF37]" />
            <span className="text-[10px] uppercase tracking-[0.3em] font-cinzel text-[#D4AF37] font-semibold">
              Coleção Exclusiva
            </span>
          </div>

          <h2 className="font-serif text-3xl sm:text-5xl font-light text-white tracking-tight mb-4">
            Uma coleção para <span className="italic text-gold-gradient font-normal">deixar sua marca</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 font-light max-w-xl mx-auto leading-relaxed">
            Fragrâncias icônicas e acordes nobres selecionados para despertar emoções profundas e eternizar momentos singulares.
          </p>
        </div>

        {/* Quick Gender Filter Pills Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 mb-10">
          {quickFilterGenders.map((item) => {
            const isSelected =
              item === 'Todos' ? selectedGender === '' : selectedGender === item;
            return (
              <button
                key={item}
                onClick={() => updateFilter('gender', item === 'Todos' ? '' : item)}
                className={`px-5 py-2 rounded-full text-xs uppercase tracking-[0.18em] transition-all duration-300 font-cinzel ${
                  isSelected
                    ? 'bg-[#D4AF37] text-[#080808] font-semibold shadow-[0_0_20px_rgba(212,175,55,0.4)] border border-[#D4AF37]'
                    : 'bg-[#121214] text-gray-300 border border-[#27272a] hover:border-[#D4AF37]/50 hover:text-white'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        {/* Sorting & Search Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 mb-8 border-b border-[#1f1f23] gap-4">
          <div>
            <h3 className="font-cinzel text-lg font-medium text-white tracking-wider">
              {searchQuery ? `Resultados para "${searchQuery}"` : 'Catálogo Disponível'}
            </h3>
            <p className="text-xs text-gray-400 mt-1 font-light">
              {products.length} {products.length === 1 ? 'fragrância encontrada' : 'fragrâncias encontradas'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Mobile Filter Toggle Button */}
            <button
              onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
              className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#121214] border border-[#27272a] text-xs uppercase tracking-wider text-gray-200 hover:border-[#D4AF37]/50"
            >
              <SlidersHorizontal size={14} className="text-[#D4AF37]" />
              <span>Filtros</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
              )}
            </button>

            {/* Sort Select */}
            <div className="relative">
              <select
                value={selectedSort}
                onChange={(e) => updateFilter('sort', e.target.value)}
                className="appearance-none border border-[#27272a] bg-[#121214] text-gray-200 rounded-xl py-2.5 pl-4 pr-10 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/40 text-xs tracking-wider uppercase focus:outline-none transition-colors cursor-pointer"
              >
                <option value="">Ordenar por...</option>
                <option value="price_asc">Menor Preço</option>
                <option value="price_desc">Maior Preço</option>
                <option value="newest">Mais recentes</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Active Filter Badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-8 p-3.5 bg-[#121214]/80 rounded-xl border border-[#27272a]">
            <span className="text-[10px] font-semibold text-[#D4AF37] uppercase tracking-[0.2em] mr-1 font-cinzel">
              Filtros ativos:
            </span>

            {searchQuery && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-[#1a1a1e] text-gray-200 px-3 py-1 rounded-full border border-[#333338]">
                <Search size={12} className="text-[#D4AF37]" /> "{searchQuery}"
                <button
                  onClick={() => updateFilter('search', '')}
                  className="hover:text-red-400 ml-1"
                  aria-label="Remover busca"
                >
                  <X size={13} />
                </button>
              </span>
            )}

            {selectedGender && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-[#1a1a1e] text-gray-200 px-3 py-1 rounded-full border border-[#333338]">
                Gênero: {selectedGender}
                <button
                  onClick={() => updateFilter('gender', '')}
                  className="hover:text-red-400 ml-1"
                  aria-label="Remover filtro de gênero"
                >
                  <X size={13} />
                </button>
              </span>
            )}

            {selectedBrand && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-[#1a1a1e] text-gray-200 px-3 py-1 rounded-full border border-[#333338]">
                Marca: {selectedBrand}
                <button
                  onClick={() => updateFilter('brand', '')}
                  className="hover:text-red-400 ml-1"
                  aria-label="Remover filtro de marca"
                >
                  <X size={13} />
                </button>
              </span>
            )}

            {selectedCategory && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-[#1a1a1e] text-gray-200 px-3 py-1 rounded-full border border-[#333338]">
                Categoria: {selectedCategory}
                <button
                  onClick={() => updateFilter('category', '')}
                  className="hover:text-red-400 ml-1"
                  aria-label="Remover filtro de categoria"
                >
                  <X size={13} />
                </button>
              </span>
            )}

            {selectedSort && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-[#1a1a1e] text-gray-200 px-3 py-1 rounded-full border border-[#333338]">
                Ordenação: {selectedSort}
                <button
                  onClick={() => updateFilter('sort', '')}
                  className="hover:text-red-400 ml-1"
                  aria-label="Remover ordenação"
                >
                  <X size={13} />
                </button>
              </span>
            )}

            <button
              onClick={clearFilters}
              className="text-xs text-red-400 hover:text-red-300 font-medium ml-auto transition-colors"
            >
              Limpar todos
            </button>
          </div>
        )}

        {/* Mobile Filter Drawer / Modal */}
        {isMobileFilterOpen && (
          <div className="lg:hidden mb-8 p-6 bg-[#121214] rounded-2xl border border-[#27272a] shadow-xl animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-[#222226] pb-4 mb-4">
              <span className="font-cinzel text-sm uppercase tracking-wider text-white font-medium flex items-center gap-2">
                <Filter size={16} className="text-[#D4AF37]" />
                Filtrar Coleção
              </span>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Brand Filter */}
              <div>
                <h4 className="font-cinzel text-xs text-[#D4AF37] uppercase tracking-widest mb-3">Marca</h4>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  <label className="flex items-center cursor-pointer text-xs text-gray-300">
                    <input
                      type="radio"
                      name="m-brand"
                      checked={selectedBrand === ''}
                      onChange={() => updateFilter('brand', '')}
                      className="accent-[#D4AF37]"
                    />
                    <span className="ml-2">Todas</span>
                  </label>
                  {brands.map((b) => (
                    <label key={b.id} className="flex items-center cursor-pointer text-xs text-gray-300">
                      <input
                        type="radio"
                        name="m-brand"
                        checked={selectedBrand === b.name}
                        onChange={() => updateFilter('brand', b.name)}
                        className="accent-[#D4AF37]"
                      />
                      <span className="ml-2">{b.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              {categories.length > 0 && (
                <div>
                  <h4 className="font-cinzel text-xs text-[#D4AF37] uppercase tracking-widest mb-3">Categoria</h4>
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    <label className="flex items-center cursor-pointer text-xs text-gray-300">
                      <input
                        type="radio"
                        name="m-category"
                        checked={selectedCategory === ''}
                        onChange={() => updateFilter('category', '')}
                        className="accent-[#D4AF37]"
                      />
                      <span className="ml-2">Todas</span>
                    </label>
                    {categories.map((c) => (
                      <label key={c.id} className="flex items-center cursor-pointer text-xs text-gray-300">
                        <input
                          type="radio"
                          name="m-category"
                          checked={selectedCategory === c.name}
                          onChange={() => updateFilter('category', c.name)}
                          className="accent-[#D4AF37]"
                        />
                        <span className="ml-2">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-[#222226] flex justify-end gap-3">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-xs text-red-400 hover:text-red-300"
                >
                  Limpar
                </button>
              )}
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="px-6 py-2 rounded-xl bg-[#D4AF37] text-[#080808] text-xs font-semibold uppercase tracking-wider hover:bg-[#E5C358]"
              >
                Concluir
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-8">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-28 space-y-6 bg-[#121214] p-6 rounded-2xl border border-[#222226] shadow-xl">
              <div className="flex items-center justify-between border-b border-[#1f1f23] pb-3">
                <h3 className="font-cinzel text-xs uppercase tracking-wider text-white flex items-center gap-2 font-medium">
                  <Filter size={15} className="text-[#D4AF37]" />
                  Filtros Refinados
                </h3>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-[11px] text-[#D4AF37] hover:underline transition-colors"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* Gênero */}
              <div>
                <h4 className="font-cinzel text-xs text-[#D4AF37] uppercase tracking-widest mb-3">
                  Gênero
                </h4>
                <div className="space-y-2">
                  <label className="flex items-center cursor-pointer text-xs text-gray-300 hover:text-white transition-colors">
                    <input
                      type="radio"
                      name="sidebar-gender"
                      checked={selectedGender === ''}
                      onChange={() => updateFilter('gender', '')}
                      className="accent-[#D4AF37]"
                    />
                    <span className="ml-2.5">Todos</span>
                  </label>
                  {['Masculino', 'Feminino', 'Unissex'].map((gender) => (
                    <label
                      key={gender}
                      className="flex items-center cursor-pointer text-xs text-gray-300 hover:text-white transition-colors"
                    >
                      <input
                        type="radio"
                        name="sidebar-gender"
                        checked={selectedGender === gender}
                        onChange={() => updateFilter('gender', gender)}
                        className="accent-[#D4AF37]"
                      />
                      <span className="ml-2.5">{gender}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Marca */}
              <div>
                <h4 className="font-cinzel text-xs text-[#D4AF37] uppercase tracking-widest mb-3">
                  Marca
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  <label className="flex items-center cursor-pointer text-xs text-gray-300 hover:text-white transition-colors">
                    <input
                      type="radio"
                      name="sidebar-brand"
                      checked={selectedBrand === ''}
                      onChange={() => updateFilter('brand', '')}
                      className="accent-[#D4AF37]"
                    />
                    <span className="ml-2.5">Todas</span>
                  </label>
                  {brands.map((b) => (
                    <label
                      key={b.id}
                      className="flex items-center cursor-pointer text-xs text-gray-300 hover:text-white transition-colors"
                    >
                      <input
                        type="radio"
                        name="sidebar-brand"
                        checked={selectedBrand === b.name}
                        onChange={() => updateFilter('brand', b.name)}
                        className="accent-[#D4AF37]"
                      />
                      <span className="ml-2.5">{b.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Categoria */}
              {categories.length > 0 && (
                <div>
                  <h4 className="font-cinzel text-xs text-[#D4AF37] uppercase tracking-widest mb-3">
                    Categoria
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    <label className="flex items-center cursor-pointer text-xs text-gray-300 hover:text-white transition-colors">
                      <input
                        type="radio"
                        name="sidebar-category"
                        checked={selectedCategory === ''}
                        onChange={() => updateFilter('category', '')}
                        className="accent-[#D4AF37]"
                      />
                      <span className="ml-2.5">Todas</span>
                    </label>
                    {categories.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center cursor-pointer text-xs text-gray-300 hover:text-white transition-colors"
                      >
                        <input
                          type="radio"
                          name="sidebar-category"
                          checked={selectedCategory === c.name}
                          onChange={() => updateFilter('category', c.name)}
                          className="accent-[#D4AF37]"
                        />
                        <span className="ml-2.5">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Product Grid Area */}
          <main className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse bg-[#121214] border border-[#222226] h-[450px] rounded-2xl relative overflow-hidden"
                  >
                    <div className="h-64 bg-[#18181c]" />
                    <div className="p-5 space-y-3">
                      <div className="w-16 h-3 bg-[#24242a] rounded" />
                      <div className="w-3/4 h-5 bg-[#24242a] rounded" />
                      <div className="w-full h-8 bg-[#1f1f24] rounded mt-4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : displayedProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {displayedProducts.map((product: any) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-[#121214] rounded-2xl border border-[#222226] p-8 max-w-lg mx-auto">
                <Search className="mx-auto h-12 w-12 text-[#D4AF37]/50 mb-4" />
                <h3 className="font-cinzel text-lg font-medium text-white mb-2">
                  Nenhuma fragrância encontrada
                </h3>
                <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                  Não encontramos perfumes correspondentes aos filtros selecionados. Tente ajustar os termos de busca ou remover as restrições.
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center px-6 py-2.5 bg-[#D4AF37] text-[#080808] rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-[#E5C358] transition-colors shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                  >
                    Limpar todos os filtros
                  </button>
                )}
              </div>
            )}
          </main>
        </div>
      </section>

      {/* 4. NOSSA ESSÊNCIA SECTION */}
      <NossaEssencia />

      {/* 5. EXPERIÊNCIA / DEPOIMENTOS SECTION */}
      <TestimonialsSection />

      {/* 6. CTA FINAL SECTION */}
      <CtaSection onShopClick={scrollToCollection} />
    </div>
  );
}
