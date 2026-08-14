import { Link } from 'react-router-dom';
import { ShoppingBag, Search, User, Menu, LogOut, Shield, Sun, Moon } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

export function Header() {
  const items = useCartStore(state => state.items);
  const { user, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <button className="p-2 -ml-2 mr-2 md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <Menu size={24} />
            </button>
            <Link to="/" className="font-serif text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Essence
            </Link>
          </div>
          
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Buscar perfumes..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-full leading-5 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center space-x-5">
            {/* Dark Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={isDark ? 'Modo Claro' : 'Modo Escuro'}
            >
              {isDark ? <Sun size={22} className="text-amber-400" /> : <Moon size={22} />}
            </button>

            {user ? (
              <div className="flex items-center space-x-4">
                {user.role === 'ADMIN' && (
                  <Link to="/admin" className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 text-sm font-medium">
                    <Shield size={20} />
                    <span className="hidden sm:inline">Admin</span>
                  </Link>
                )}
                <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">Olá, {user.name}</span>
                <button onClick={logout} className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex items-center" title="Sair">
                  <LogOut size={22} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center">
                <User size={24} />
              </Link>
            )}

            <Link to="/cart" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 relative flex items-center">
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
