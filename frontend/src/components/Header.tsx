import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShoppingBag, Search, User, LogOut, Shield, Sun, Moon } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

export function Header() {
  const items = useCartStore(state => state.items);
  const { user, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setSearchTerm(searchParams.get('search') || '');
  }, [searchParams]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/');
    }
  };

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-[#080808]/95 backdrop-blur-md border-b border-[#27272a] shadow-[0_10px_30px_rgba(0,0,0,0.8)]' 
          : 'bg-[#080808]/80 backdrop-blur-sm border-b border-[#1f1f23]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo Brand */}
          <div className="flex items-center">
            <Link to="/" className="group flex items-center transition-opacity">
              <span className="font-cinzel text-2xl sm:text-3xl font-semibold tracking-[0.28em] text-white group-hover:text-[#D4AF37] transition-colors">
                MEMORARE
              </span>
            </Link>
          </div>

          {/* Quick Nav Links (Desktop) */}
          <nav className="hidden lg:flex items-center space-x-8 text-xs uppercase tracking-[0.2em] font-medium text-gray-400">
            <a href="#colecao" className="hover:text-[#D4AF37] transition-colors">Coleção</a>
            <a href="#diferenciais" className="hover:text-[#D4AF37] transition-colors">Diferenciais</a>
            <a href="#essencia" className="hover:text-[#D4AF37] transition-colors">Essência</a>
            <a href="#depoimentos" className="hover:text-[#D4AF37] transition-colors">Experiência</a>
          </nav>
          
          {/* Search Form */}
          <div className="hidden md:flex flex-1 max-w-xs mx-6">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search size={15} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar fragrâncias..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 text-xs border border-[#27272a] rounded-full bg-[#121214] text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/40 transition-all duration-300"
              />
            </form>
          </div>

          {/* User Controls & Cart */}
          <div className="flex items-center space-x-3 sm:space-x-5">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-400 hover:text-[#D4AF37] rounded-full hover:bg-white/5 transition-colors"
              title={isDark ? 'Alternar Tema' : 'Modo Escuro'}
              aria-label="Alternar Tema"
            >
              {isDark ? <Sun size={19} className="text-[#D4AF37]" /> : <Moon size={19} />}
            </button>

            {/* User Account */}
            {user ? (
              <div className="flex items-center space-x-3">
                {user.role === 'ADMIN' && (
                  <Link 
                    to="/admin" 
                    className="text-gray-400 hover:text-[#D4AF37] flex items-center gap-1.5 text-xs tracking-wider uppercase"
                  >
                    <Shield size={16} className="text-[#D4AF37]" />
                    <span className="hidden sm:inline">Admin</span>
                  </Link>
                )}
                <span className="text-xs text-gray-300 tracking-wider hidden sm:inline">{user.name}</span>
                <button 
                  onClick={logout} 
                  className="text-gray-400 hover:text-red-400 p-1.5 transition-colors" 
                  title="Sair"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="p-2 text-gray-400 hover:text-[#D4AF37] rounded-full hover:bg-white/5 transition-colors"
                title="Minha Conta"
              >
                <User size={20} />
              </Link>
            )}

            {/* Shopping Bag */}
            <Link 
              to="/cart" 
              className="p-2 text-gray-300 hover:text-[#D4AF37] relative flex items-center rounded-full hover:bg-white/5 transition-colors group"
              title="Sacola de Compras"
            >
              <ShoppingBag size={21} className="transition-transform group-hover:scale-105" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-[#080808] bg-[#D4AF37] rounded-full shadow-[0_0_10px_rgba(212,175,55,0.5)]">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile Search Input */}
        <div className="md:hidden pb-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search size={15} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar fragrâncias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 text-xs border border-[#27272a] rounded-full bg-[#121214] text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
            />
          </form>
        </div>
      </div>
    </header>
  );
}
