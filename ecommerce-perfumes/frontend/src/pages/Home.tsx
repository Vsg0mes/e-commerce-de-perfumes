import { useEffect, useState } from 'react';
import axios from 'axios';
import { ProductCard } from '../components/ProductCard';

export function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3333/api'}/products`);
        if (res.data.success) {
          setProducts(res.data.data);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl font-bold text-gray-900 tracking-tight">Nossos Perfumes</h1>
        <div className="flex gap-4">
          <select className="border border-gray-300 rounded-md py-2 px-4 focus:ring-indigo-500 focus:border-indigo-500 text-sm">
            <option value="">Ordenar por...</option>
            <option value="price_asc">Menor Preço</option>
            <option value="price_desc">Maior Preço</option>
            <option value="newest">Mais recentes</option>
          </select>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Filters */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-24">
            <h3 className="font-semibold text-lg mb-4">Filtros</h3>
            
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-2">Gênero</h4>
              <div className="space-y-2">
                {['Masculino', 'Feminino', 'Unissex'].map(gender => (
                  <label key={gender} className="flex items-center">
                    <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="ml-2 text-sm text-gray-600">{gender}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-2">Marca</h4>
              <div className="space-y-2">
                {['Dior', 'Chanel', 'Tom Ford'].map(brand => (
                  <label key={brand} className="flex items-center">
                    <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="ml-2 text-sm text-gray-600">{brand}</span>
                  </label>
                ))}
              </div>
            </div>

            <button className="w-full bg-indigo-600 text-white rounded-md py-2 px-4 hover:bg-indigo-700 transition-colors">
              Aplicar Filtros
            </button>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>
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
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Nenhum perfume encontrado com esses filtros.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
