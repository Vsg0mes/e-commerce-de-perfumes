import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

export function Cart() {
  const { items, removeItem, updateQuantity, getTotal } = useCartStore();

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p);
  };

  if (items.length === 0) {
    return (
      <div className="bg-[#080808] min-h-[70vh] flex items-center justify-center px-4 py-24 text-center">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#121214] border border-[#27272a] shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-[#18181c] border border-[#2c2c32] flex items-center justify-center text-[#D4AF37] mb-6">
            <ShoppingBag size={28} />
          </div>
          <h2 className="text-2xl font-serif font-light text-white mb-3">Sua sacola está vazia</h2>
          <p className="text-gray-400 text-xs sm:text-sm mb-8 leading-relaxed font-light">
            Descubra criações exclusivas em nossa coleção de alta perfumaria e escolha sua próxima assinatura.
          </p>
          <Link
            to="/"
            className="w-full inline-flex items-center justify-center px-8 py-3.5 rounded-full text-xs font-semibold uppercase tracking-[0.2em] text-[#080808] bg-[#D4AF37] hover:bg-[#E5C358] transition-all shadow-[0_0_20px_rgba(212,175,55,0.35)]"
          >
            Explorar Fragrâncias
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#080808] text-gray-100 min-h-screen py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <span className="font-cinzel text-xs uppercase tracking-[0.3em] text-[#D4AF37] font-semibold">
            Memorare
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-light text-white tracking-tight mt-1">
            Sacola de Compras
          </h1>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start">
          
          {/* Items List */}
          <div className="lg:col-span-8">
            <ul role="list" className="border-t border-b border-[#222226] divide-y divide-[#222226]">
              {items.map((item) => (
                <li key={item.id} className="flex py-6 sm:py-8 items-center">
                  {/* Thumbnail */}
                  <div className="w-20 h-24 sm:w-28 sm:h-32 shrink-0 rounded-2xl overflow-hidden bg-[#121214] border border-[#27272a] p-2 flex items-center justify-center">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="font-cinzel text-[10px] text-[#D4AF37] text-center uppercase tracking-widest">
                        Memorare
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="ml-5 sm:ml-8 flex-1 flex flex-col justify-between">
                    <div className="relative pr-9 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:pr-0">
                      <div>
                        <h3 className="text-base sm:text-lg font-serif">
                          <Link
                            to={`/product/${item.productId}`}
                            className="font-normal text-white hover:text-[#D4AF37] transition-colors"
                          >
                            {item.name}
                          </Link>
                        </h3>
                        <p className="mt-1 text-sm font-semibold text-[#D4AF37]">
                          {formatPrice(item.price)}
                        </p>
                      </div>

                      {/* Quantity & Delete */}
                      <div className="mt-4 sm:mt-0 flex items-center justify-between sm:justify-end gap-6 sm:pr-9">
                        <div className="flex items-center border border-[#27272a] rounded-full bg-[#121214] px-2 py-1">
                          <button
                            onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                            aria-label="Diminuir quantidade"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-8 text-center text-xs text-white font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, Math.min(item.maxStock, item.quantity + 1))}
                            className="p-1 text-gray-400 hover:text-white transition-colors disabled:opacity-30"
                            disabled={item.quantity >= item.maxStock}
                            aria-label="Aumentar quantidade"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                          aria-label="Remover item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Order Summary */}
          <div className="mt-12 lg:mt-0 lg:col-span-4 bg-[#121214] border border-[#27272a] rounded-3xl p-6 sm:p-8 shadow-xl">
            <h2 className="font-cinzel text-sm uppercase tracking-wider text-white font-semibold mb-6">
              Resumo do Pedido
            </h2>

            <dl className="space-y-4 text-xs text-gray-400">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="font-medium text-white">{formatPrice(getTotal())}</dd>
              </div>

              <div className="flex justify-between">
                <dt>Frete Especial Segurado</dt>
                <dd className="font-medium text-[#D4AF37]">Cortesia Memorare</dd>
              </div>

              <div className="flex justify-between items-center border-t border-[#1f1f23] pt-4">
                <dt className="text-sm font-cinzel uppercase tracking-wider text-white">Total</dt>
                <dd className="text-xl font-light text-[#D4AF37]">{formatPrice(getTotal())}</dd>
              </div>
            </dl>

            <div className="mt-8 space-y-4">
              <Link
                to="/checkout"
                className="w-full bg-[#D4AF37] hover:bg-[#E5C358] text-[#080808] font-semibold text-xs uppercase tracking-[0.2em] rounded-full py-4 px-6 flex items-center justify-center transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)]"
              >
                <span>Finalizar Pedido</span>
                <ArrowRight className="ml-2" size={15} />
              </Link>

              <div className="text-center">
                <Link
                  to="/"
                  className="text-xs text-gray-400 hover:text-[#D4AF37] tracking-wider uppercase transition-colors font-cinzel"
                >
                  Continuar Explorando
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
