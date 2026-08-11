import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

export function Cart() {
  const { items, removeItem, updateQuantity, getTotal } = useCartStore();

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p);
  };

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <h2 className="text-3xl font-serif font-bold text-gray-900 mb-4">Seu carrinho está vazio</h2>
        <p className="text-gray-500 mb-8">Descubra fragrâncias incríveis em nosso catálogo.</p>
        <Link 
          to="/" 
          className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Continuar Comprando
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-serif font-bold text-gray-900 mb-8">Carrinho de Compras</h1>

      <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start">
        <div className="lg:col-span-8">
          <ul role="list" className="border-t border-b border-gray-200 divide-y divide-gray-200">
            {items.map((item) => (
              <li key={item.id} className="flex py-6 sm:py-10">
                <div className="flex-shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-24 h-24 rounded-md object-center object-cover sm:w-32 sm:h-32"
                  />
                </div>

                <div className="ml-4 flex-1 flex flex-col justify-between sm:ml-6">
                  <div className="relative pr-9 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:pr-0">
                    <div>
                      <div className="flex justify-between">
                        <h3 className="text-lg">
                          <Link to={`/product/${item.productId}`} className="font-medium text-gray-700 hover:text-gray-800">
                            {item.name}
                          </Link>
                        </h3>
                      </div>
                      <p className="mt-1 text-sm font-medium text-gray-900">{formatPrice(item.price)}</p>
                    </div>

                    <div className="mt-4 sm:mt-0 sm:pr-9">
                      <div className="flex items-center border border-gray-300 rounded-md max-w-[120px]">
                        <button 
                          onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          className="px-3 py-1 text-gray-600 hover:text-gray-900"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="flex-1 text-center py-1 text-gray-900 font-medium">
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => updateQuantity(item.id, Math.min(item.maxStock, item.quantity + 1))}
                          className="px-3 py-1 text-gray-600 hover:text-gray-900"
                          disabled={item.quantity >= item.maxStock}
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      <div className="absolute top-0 right-0">
                        <button 
                          type="button" 
                          onClick={() => removeItem(item.id)}
                          className="-m-2 p-2 inline-flex text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <span className="sr-only">Remover</span>
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-16 bg-gray-50 rounded-lg px-4 py-6 sm:p-6 lg:p-8 lg:mt-0 lg:col-span-4">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Resumo do Pedido</h2>
          
          <dl className="space-y-4 text-sm text-gray-600">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="font-medium text-gray-900">{formatPrice(getTotal())}</dd>
            </div>
            
            <div className="flex justify-between">
              <dt className="flex items-center">Desconto</dt>
              <dd className="font-medium text-green-600">- R$ 0,00</dd>
            </div>
            
            <div className="flex justify-between items-center border-t border-gray-200 pt-4">
              <dt className="text-base font-medium text-gray-900">Total</dt>
              <dd className="text-xl font-bold text-gray-900">{formatPrice(getTotal())}</dd>
            </div>
          </dl>

          <div className="mt-6">
            <Link
              to="/checkout"
              className="w-full bg-indigo-600 border border-transparent rounded-md shadow-sm py-3 px-4 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 focus:ring-indigo-500 flex items-center justify-center transition-colors"
            >
              Finalizar Compra
              <ArrowRight className="ml-2" size={20} />
            </Link>
          </div>
          <div className="mt-4 text-center">
            <Link to="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              ou Continuar Comprando
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
