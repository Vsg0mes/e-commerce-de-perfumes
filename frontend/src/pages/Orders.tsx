import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';

export function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) return <div className="p-12 text-center text-gray-500 dark:text-gray-400">Carregando...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-8">Meus Pedidos</h1>
      
      {orders.length === 0 ? (
        <div className="text-center py-24 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
          <Package className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Nenhum pedido encontrado</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Você ainda não realizou nenhuma compra.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order: any) => (
            <div key={order.id} className="bg-white dark:bg-gray-900 shadow-sm overflow-hidden sm:rounded-md border border-gray-200 dark:border-gray-800">
              {/* Order card content */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
