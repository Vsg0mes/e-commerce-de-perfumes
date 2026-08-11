import { useEffect, useState } from 'react';
import axios from 'axios';
import { Package } from 'lucide-react';

export function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Exemplo simulado de busca de pedidos
  useEffect(() => {
    // Para um fluxo real, passaria o token do usuário e buscaria `/api/orders` dele
    setLoading(false);
  }, []);

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-serif font-bold text-gray-900 mb-8">Meus Pedidos</h1>
      
      {orders.length === 0 ? (
        <div className="text-center py-24 bg-gray-50 rounded-lg">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Nenhum pedido encontrado</h3>
          <p className="mt-1 text-sm text-gray-500">Você ainda não realizou nenhuma compra.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order: any) => (
            <div key={order.id} className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
              {/* Order card content */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
