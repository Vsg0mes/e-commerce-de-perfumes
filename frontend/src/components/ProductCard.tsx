import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Check } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    description?: string;
    brand?: { name: string };
    price: number;
    promotionalPrice: number | null;
    image: string | null;
    stock: number;
    volume?: string | null;
    concentration?: string | null;
    gender?: string | null;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [imgError, setImgError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to product page
    e.stopPropagation();
    if (product.stock > 0) {
      addItem({
        id: product.id,
        productId: product.id,
        name: product.name,
        price: product.promotionalPrice || product.price,
        image: product.image || '',
        quantity: 1,
        maxStock: product.stock,
      });

      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1600);
    }
  };

  const discountPercent =
    product.promotionalPrice && product.promotionalPrice < product.price
      ? Math.round(((product.price - product.promotionalPrice) / product.price) * 100)
      : null;

  const hasImage = Boolean(product.image && !imgError);

  return (
    <Link
      to={`/product/${product.id}`}
      className="group relative flex flex-col bg-[#121214] rounded-2xl overflow-hidden border border-[#27272a] hover:border-[#D4AF37]/50 shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:shadow-[0_12px_40px_rgba(212,175,55,0.12)] transition-all duration-500 hover:-translate-y-1.5"
    >
      {/* Visual Media Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-gradient-to-b from-[#18181c] via-[#111113] to-[#0d0d0f] flex items-center justify-center p-6">
        
        {/* Subtle radial gold spotlight background behind product */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#D4AF37]/10 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

        {/* Badges Overlay */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-10 pointer-events-none">
          {/* Stock status indicator */}
          {product.stock === 0 ? (
            <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest bg-red-950/80 text-red-300 border border-red-800/60 rounded-full backdrop-blur-md">
              Esgotado
            </span>
          ) : (
            <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest bg-black/60 text-[#D4AF37] border border-[#D4AF37]/30 rounded-full backdrop-blur-md">
              {product.concentration || 'Parfum'}
            </span>
          )}

          {/* Discount badge */}
          {discountPercent && (
            <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider bg-[#D4AF37] text-[#080808] rounded-full shadow-[0_0_12px_rgba(212,175,55,0.4)]">
              -{discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Product Image or Luxury Fallback Artwork */}
        {hasImage ? (
          <img
            src={product.image || ''}
            alt={product.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain object-center transform group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="relative w-full h-full flex flex-col items-center justify-center text-center select-none">
            {/* Handcrafted luxury perfume flacon illustration */}
            <div className="relative w-28 h-44 flex flex-col items-center justify-center transition-transform duration-700 group-hover:scale-105">
              {/* Cap */}
              <div className="w-10 h-10 rounded-t-sm bg-gradient-to-b from-[#404040] via-[#1c1c1e] to-[#0a0a0c] border border-[#3f3f46] relative shadow-lg">
                <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-[#AA8010] via-[#F3E5AB] to-[#AA8010]" />
              </div>
              {/* Sprayer Neck */}
              <div className="w-4 h-2.5 bg-gradient-to-r from-[#D4AF37] via-[#FFF5D0] to-[#B8860B] border-x border-[#997B20]" />
              {/* Bottle Body */}
              <div className="w-24 h-32 rounded-b-xl rounded-t-sm bg-gradient-to-b from-[#18181b]/90 via-[#101012]/95 to-[#080808] border border-[#3f3f46]/80 relative flex flex-col items-center justify-center overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.8)] backdrop-blur-md">
                {/* Light Reflection Sweep */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                {/* Internal Elixir Glow */}
                <div className="absolute bottom-2 inset-x-3 h-16 rounded-b-lg bg-gradient-to-t from-[#D4AF37]/25 to-transparent blur-sm" />
                {/* Embossed Luxury Label */}
                <div className="relative z-10 px-2 py-1.5 border border-[#D4AF37]/40 bg-black/60 rounded backdrop-blur-xs flex flex-col items-center max-w-[85%]">
                  <span className="font-cinzel text-[7px] uppercase tracking-[0.25em] text-[#D4AF37] truncate max-w-full">
                    {product.brand?.name || 'MEMORARE'}
                  </span>
                  <span className="font-serif text-[10px] tracking-wider text-gray-200 truncate max-w-full font-medium">
                    {product.name}
                  </span>
                </div>
              </div>
              {/* Bottle Base Shadow */}
              <div className="w-20 h-2 bg-black/80 rounded-full blur-[3px] mt-1" />
            </div>

            {/* Note pill if available */}
            {product.volume && (
              <span className="mt-3 text-[10px] uppercase tracking-widest text-gray-500 font-medium">
                {product.volume}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card Content Information */}
      <div className="p-5 flex flex-col flex-1 justify-between bg-[#121214] border-t border-[#1f1f23]">
        <div>
          {/* Brand Name */}
          <p className="font-cinzel text-[11px] uppercase tracking-[0.2em] text-[#D4AF37] mb-1 font-semibold">
            {product.brand?.name || 'MEMORARE'}
          </p>

          {/* Product Name */}
          <h3 className="font-serif text-lg font-medium text-white group-hover:text-[#F3E5AB] transition-colors leading-snug line-clamp-1">
            {product.name}
          </h3>

          {/* Short description if exists */}
          {product.description && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        {/* Pricing and Action */}
        <div className="mt-5 pt-3.5 border-t border-[#1e1e22] flex items-center justify-between">
          <div className="flex flex-col">
            {product.promotionalPrice ? (
              <>
                <span className="text-xs text-gray-500 line-through">
                  {formatPrice(product.price)}
                </span>
                <span className="text-base sm:text-lg font-semibold text-[#D4AF37] tracking-tight">
                  {formatPrice(product.promotionalPrice)}
                </span>
              </>
            ) : (
              <span className="text-base sm:text-lg font-semibold text-gray-100 tracking-tight">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className={`relative p-2.5 rounded-full flex items-center justify-center transition-all duration-300 ${
              product.stock > 0
                ? justAdded
                  ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-105'
                  : 'bg-[#1e1e24] text-[#D4AF37] border border-[#D4AF37]/30 hover:bg-[#D4AF37] hover:text-[#080808] hover:shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                : 'bg-[#18181b] text-gray-600 border border-gray-800 cursor-not-allowed'
            }`}
            title={product.stock > 0 ? 'Adicionar à Sacola' : 'Esgotado'}
            aria-label={`Adicionar ${product.name} à sacola`}
          >
            {justAdded ? (
              <Check size={18} className="animate-in zoom-in" />
            ) : (
              <ShoppingBag size={18} className="group-hover/btn:scale-110 transition-transform" />
            )}
          </button>
        </div>
      </div>
    </Link>
  );
}
