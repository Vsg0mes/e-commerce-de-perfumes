import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    brand: { name: string };
    price: number;
    promotionalPrice: number | null;
    image: string | null;
    stock: number;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore(state => state.addItem);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to product page
    if (product.stock > 0) {
      addItem({
        id: product.id,
        productId: product.id,
        name: product.name,
        price: product.promotionalPrice || product.price,
        image: product.image || 'https://via.placeholder.com/300x400?text=Sem+Imagem',
        quantity: 1,
        maxStock: product.stock
      });
    }
  };

  return (
    <Link to={`/product/${product.id}`} className="group relative block overflow-hidden rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow border border-gray-100">
      <div className="aspect-h-4 aspect-w-3 bg-gray-200 sm:aspect-none sm:h-72">
        <img
          src={product.image || 'https://via.placeholder.com/300x400?text=Sem+Imagem'}
          alt={product.name}
          className="h-full w-full object-cover object-center sm:h-full sm:w-full group-hover:opacity-75 transition-opacity"
        />
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-sm text-gray-500 mb-1">{product.brand?.name}</h3>
        <p className="text-lg font-medium text-gray-900 mb-2 truncate">{product.name}</p>
        
        <div className="flex items-center justify-between mt-auto pt-4">
          <div>
            {product.promotionalPrice ? (
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 line-through">{formatPrice(product.price)}</span>
                <span className="text-lg font-bold text-indigo-600">{formatPrice(product.promotionalPrice)}</span>
              </div>
            ) : (
              <span className="text-lg font-bold text-gray-900">{formatPrice(product.price)}</span>
            )}
          </div>
          
          <button 
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className={`p-2 rounded-full flex items-center justify-center transition-colors ${
              product.stock > 0 
                ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            title={product.stock > 0 ? "Adicionar ao carrinho" : "Esgotado"}
          >
            <ShoppingBag size={20} />
          </button>
        </div>
      </div>
    </Link>
  );
}
