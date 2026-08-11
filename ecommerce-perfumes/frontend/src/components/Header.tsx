import { Link } from 'react-router-dom';
import { ShoppingBag, Search, User, Menu, LogOut, Shield } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';

export function Header() {
  const items = useCartStore(state => state.items);
  const { user, logout } = useAuthStore();
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <button className="p-2 -ml-2 mr-2 md:hidden text-gray-500 hover:text-gray-700">
              <Menu size={24} />
            </button>
            <Link to="/" className="font-serif text-2xl font-bold text-gray-900 tracking-tight">
              Essence
            </Link>
          </div>
          
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar perfumes..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {user ? (
              <div className="flex items-center space-x-4">
                {user.role === 'ADMIN' && (
                  <Link to="/admin" className="text-gray-500 hover:text-indigo-600 flex items-center gap-1 text-sm font-medium">
                    <Shield size={20} />
                    <span className="hidden sm:inline">Admin</span>
                  </Link>
                )}
                <span className="text-sm text-gray-600 hidden sm:inline">Olá, {user.name}</span>
                <button onClick={logout} className="text-gray-500 hover:text-red-500 flex items-center">
                  <LogOut size={22} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="text-gray-500 hover:text-gray-700 flex items-center">
                <User size={24} />
              </Link>
            )}

            <Link to="/cart" className="text-gray-500 hover:text-gray-700 relative flex items-center">
              <ShoppingBag size={24} />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-indigo-600 rounded-full">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
