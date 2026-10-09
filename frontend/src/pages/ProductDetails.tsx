import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShoppingBag, ShieldCheck, Truck, Sparkles, ArrowLeft } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

export function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [imgError, setImgError] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
        const res = await axios.get(`${apiBase}/products/${id}`);
        if (res.data?.success) {
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin mb-4" />
        <span className="font-cinzel text-xs uppercase tracking-[0.25em] text-[#D4AF37]">
          Revelando Fragrância...
        </span>
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
        image: product.image || '',
        quantity: quantity,
        maxStock: product.stock,
      });
      navigate('/cart');
    }
  };

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p);
  };

  const hasImage = Boolean(product.image && !imgError);

  return (
    <div className="bg-[#080808] text-gray-100 min-h-screen py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb / Back button */}
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gray-400 hover:text-[#D4AF37] mb-8 transition-colors font-cinzel"
        >
          <ArrowLeft size={14} />
          <span>Retornar à Coleção</span>
        </button>

        <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
          
          {/* Product Media Display */}
          <div className="lg:col-span-6 mb-10 lg:mb-0">
            <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-gradient-to-b from-[#18181c] via-[#111113] to-[#0a0a0c] border border-[#27272a] shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex items-center justify-center p-8 sm:p-12">
              
              {/* Radial subtle gold spotlight */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#D4AF37]/15 via-transparent to-transparent opacity-80 pointer-events-none" />

              {hasImage ? (
                <img
                  src={product.image}
                  alt={product.name}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-contain object-center"
                />
              ) : (
                <div className="relative w-full h-full flex flex-col items-center justify-center text-center select-none">
                  {/* Flacon sculpture */}
                  <div className="relative w-36 sm:w-44 h-60 sm:h-72 flex flex-col items-center justify-center">
                    <div className="w-16 h-14 rounded-t-sm bg-gradient-to-b from-[#3a3a3e] via-[#1a1a1c] to-[#0a0a0c] border border-[#3f3f46] relative shadow-lg flex items-center justify-center">
                      <div className="w-full h-1 bg-gradient-to-r from-[#AA8010] via-[#F3E5AB] to-[#AA8010] absolute bottom-0" />
                      <span className="font-cinzel text-[8px] tracking-[0.25em] text-[#D4AF37]">MEMORARE</span>
                    </div>
                    <div className="w-6 h-3 bg-gradient-to-r from-[#D4AF37] via-[#FFF5D0] to-[#B8860B]" />
                    <div className="w-36 sm:w-44 h-48 sm:h-56 rounded-b-2xl rounded-t-sm bg-gradient-to-b from-[#18181b]/95 via-[#101012]/95 to-[#080808] border border-[#3f3f46] relative flex flex-col items-center justify-center p-4 shadow-[0_20px_45px_rgba(0,0,0,0.9)] backdrop-blur-md">
                      <div className="absolute bottom-3 inset-x-4 h-28 rounded-b-xl bg-gradient-to-t from-[#D4AF37]/30 to-transparent blur-md" />
                      <div className="relative z-10 p-3 border border-[#D4AF37]/40 bg-black/75 rounded flex flex-col items-center max-w-[90%]">
                        <span className="font-cinzel text-[9px] uppercase tracking-[0.3em] text-[#D4AF37] truncate max-w-full">
                          {product.brand?.name || 'MEMORARE'}
                        </span>
                        <span className="font-serif text-sm tracking-wider text-white font-medium truncate max-w-full mt-0.5">
                          {product.name}
                        </span>
                      </div>
                    </div>
                    <div className="w-32 h-3 bg-black/90 rounded-full blur-sm mt-2" />
                  </div>
                </div>
              )}

              {/* Concentration Tag */}
              <div className="absolute top-5 left-5">
                <span className="px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.25em] font-cinzel font-semibold bg-black/70 text-[#D4AF37] border border-[#D4AF37]/30 backdrop-blur-md">
                  {product.concentration || 'Extrait de Parfum'}
                </span>
              </div>
            </div>
          </div>

          {/* Product Info Column */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            
            {/* Brand Kicker */}
            <div className="inline-flex items-center gap-2 mb-2">
              <Sparkles size={13} className="text-[#D4AF37]" />
              <span className="font-cinzel text-xs uppercase tracking-[0.3em] text-[#D4AF37] font-semibold">
                {product.brand?.name || 'Memorare'}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-5xl font-serif font-light text-white tracking-tight mb-4">
              {product.name}
            </h1>

            {/* Price section */}
            <div className="mb-6 flex items-baseline gap-4 pb-6 border-b border-[#1f1f23]">
              {product.promotionalPrice ? (
                <>
                  <span className="text-3xl sm:text-4xl font-light text-[#D4AF37] tracking-tight">
                    {formatPrice(product.promotionalPrice)}
                  </span>
                  <span className="text-lg text-gray-500 line-through">
                    {formatPrice(product.price)}
                  </span>
                </>
              ) : (
                <span className="text-3xl sm:text-4xl font-light text-white tracking-tight">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>

            {/* Description */}
            <div className="mb-8">
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed font-light">
                {product.description ||
                  'Composição extraordinária criada para despertar os sentidos e deixar um rastro marcante e sofisticado.'}
              </p>
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8 py-5 border-y border-[#1f1f23] text-xs">
              <div className="bg-[#121214] p-3.5 rounded-xl border border-[#222226]">
                <span className="block text-gray-500 font-cinzel text-[10px] uppercase tracking-wider mb-1">
                  Família Olfativa
                </span>
                <span className="font-serif text-sm text-gray-200">
                  {product.olfactoryFamily || 'Oriental Amadeirado'}
                </span>
              </div>

              <div className="bg-[#121214] p-3.5 rounded-xl border border-[#222226]">
                <span className="block text-gray-500 font-cinzel text-[10px] uppercase tracking-wider mb-1">
                  Concentração
                </span>
                <span className="font-serif text-sm text-gray-200">
                  {product.concentration || 'Eau de Parfum'}
                </span>
              </div>

              <div className="bg-[#121214] p-3.5 rounded-xl border border-[#222226]">
                <span className="block text-gray-500 font-cinzel text-[10px] uppercase tracking-wider mb-1">
                  Gênero
                </span>
                <span className="font-serif text-sm text-gray-200">
                  {product.gender || 'Unissex'}
                </span>
              </div>

              <div className="bg-[#121214] p-3.5 rounded-xl border border-[#222226]">
                <span className="block text-gray-500 font-cinzel text-[10px] uppercase tracking-wider mb-1">
                  Volume
                </span>
                <span className="font-serif text-sm text-gray-200">
                  {product.volume || '100ml'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <label htmlFor="quantity" className="sr-only">
                    Quantidade
                  </label>
                  <select
                    id="quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    disabled={product.stock === 0}
                    className="rounded-full border border-[#27272a] bg-[#121214] text-white py-3.5 px-5 text-xs font-semibold focus:border-[#D4AF37] focus:outline-none transition-colors"
                  >
                    {[...Array(Math.min(product.stock || 1, 10))].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Qtd: {i + 1}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className={`flex-1 rounded-full py-4 px-8 flex items-center justify-center text-xs font-semibold uppercase tracking-[0.25em] transition-all duration-300 ${
                    product.stock > 0
                      ? 'bg-[#D4AF37] text-[#080808] hover:bg-[#E5C358] shadow-[0_0_25px_rgba(212,175,55,0.35)] hover:shadow-[0_0_35px_rgba(212,175,55,0.6)] hover:-translate-y-0.5'
                      : 'bg-[#18181b] text-gray-500 border border-gray-800 cursor-not-allowed'
                  }`}
                >
                  <ShoppingBag className="mr-2" size={17} />
                  {product.stock > 0 ? 'Adicionar à Sacola' : 'Esgotado'}
                </button>
              </div>

              {/* Guarantees */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-gray-400">
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#121214]/50 border border-[#222226]">
                  <ShieldCheck size={18} className="text-[#D4AF37] shrink-0" />
                  <span>Autenticidade e Lacre Garantidos</span>
                </div>
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#121214]/50 border border-[#222226]">
                  <Truck size={18} className="text-[#D4AF37] shrink-0" />
                  <span>Envio Imediato com Embalagem Segura</span>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
