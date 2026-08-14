import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShoppingBag, ShieldCheck, Truck } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

export function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore(state => state.addItem);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3333/api'}/products/${id}`);
        if (res.data.success) {
          setProduct(res.data.data);
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProduct();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!product) return null;

  const price = product.promotionalPrice || product.price;

  const handleAddToCart = () => {
    if (product.stock > 0) {
      addItem({
        id: product.id,
        productId: product.id,
        name: product.name,
        price: price,
        image: product.image || 'https://via.placeholder.com/300x400?text=Sem+Imagem',
        quantity: quantity,
        maxStock: product.stock
      });
      navigate('/cart');
    }
  };

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="lg:grid lg:grid-cols-2 lg:gap-x-12">
        {/* Product Image */}
        <div className="mb-8 lg:mb-0">
          <div className="aspect-h-4 aspect-w-3 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-md">
            <img
              src={product.image || 'https://via.placeholder.com/600x800?text=Sem+Imagem'}
              alt={product.name}
              className="h-full w-full object-cover object-center"
            />
          </div>
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <h2 className="text-xl font-medium text-gray-500 dark:text-gray-400 mb-2">{product.brand?.name}</h2>
          <h1 className="text-4xl font-serif font-bold text-gray-900 dark:text-white tracking-tight mb-4">{product.name}</h1>
          
          <div className="mb-6 flex items-end gap-4">
            {product.promotionalPrice ? (
              <>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{formatPrice(product.promotionalPrice)}</p>
                <p className="text-xl text-gray-400 line-through mb-1">{formatPrice(product.price)}</p>
              </>
            ) : (
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatPrice(product.price)}</p>
            )}
          </div>

          <div className="mb-8">
            <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8 py-6 border-y border-gray-200 dark:border-gray-800">
            <div>
              <span className="block text-sm text-gray-500 dark:text-gray-400">Família Olfativa</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{product.olfactoryFamily || 'Não informado'}</span>
            </div>
            <div>
              <span className="block text-sm text-gray-500 dark:text-gray-400">Concentração</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{product.concentration || 'Não informado'}</span>
            </div>
            <div>
              <span className="block text-sm text-gray-500 dark:text-gray-400">Gênero</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{product.gender || 'Não informado'}</span>
            </div>
            <div>
              <span className="block text-sm text-gray-500 dark:text-gray-400">Volume</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{product.volume || 'Não informado'}</span>
            </div>
          </div>

          <div className="mt-auto">
            <div className="flex items-center gap-4 mb-6">
              <label htmlFor="quantity" className="sr-only">Quantidade</label>
              <select
                id="quantity"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                disabled={product.stock === 0}
                className="max-w-[100px] block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 py-3 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 dark:disabled:bg-gray-800"
              >
                {[...Array(Math.min(product.stock, 10))].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>

              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="flex-1 bg-indigo-600 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
              >
                <ShoppingBag className="mr-2" size={20} />
                {product.stock > 0 ? 'Adicionar ao Carrinho' : 'Esgotado'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-green-500" />
                <span>Produto original garantido</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck size={20} className="text-indigo-500" />
                <span>Frete grátis em compras acima de R$500</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
