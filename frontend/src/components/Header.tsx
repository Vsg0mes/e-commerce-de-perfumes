import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShoppingBag, Search, User, LogOut, Shield, Sun, Moon, X } from 'lucide-react';
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Foco automático e bloqueio de rolagem quando a barra de pesquisa abre
  useEffect(() => {
    if (isSearchOpen) {
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isSearchOpen]);

  // Fechar com a tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearchOpen(false);
    if (searchTerm.trim()) {
      navigate(`/?search=${encodeURIComponent(searchTerm.trim())}`);
      const el = document.getElementById('colecao');
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } else {
      navigate('/');
    }
  };

  const handleQuickSearch = (term: string) => {
    setSearchTerm(term);
    setIsSearchOpen(false);
    navigate(`/?search=${encodeURIComponent(term)}`);
    const el = document.getElementById('colecao');
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  return (
    <>
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
            <div className="flex items-center mr-8 lg:mr-12 xl:mr-16 shrink-0">
              <Link to="/" className="group flex items-center transition-opacity">
                <span className="font-cinzel text-2xl sm:text-3xl font-semibold tracking-[0.28em] text-white group-hover:text-[#D4AF37] transition-colors">
                  MEMORARE
                </span>
              </Link>
            </div>

            {/* Quick Nav Links (Desktop) */}
            <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8 text-xs uppercase tracking-[0.2em] font-medium text-gray-400 shrink-0">
              <a href="#colecao" className="hover:text-[#D4AF37] transition-colors">Coleção</a>
              <a href="#diferenciais" className="hover:text-[#D4AF37] transition-colors">Diferenciais</a>
              <a href="#essencia" className="hover:text-[#D4AF37] transition-colors">Essência</a>
              <a href="#depoimentos" className="hover:text-[#D4AF37] transition-colors">Experiência</a>
            </nav>

            {/* User Controls, Search Icon & Cart */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Search Icon Trigger */}
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="p-2 text-gray-400 hover:text-[#D4AF37] rounded-full hover:bg-white/5 transition-colors"
                title="Buscar fragrâncias"
                aria-label="Abrir pesquisa"
              >
                <Search size={20} />
              </button>

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
        </div>
      </header>

      {/* Fullscreen Luxury Search Overlay */}
      {isSearchOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex flex-col items-center animate-in fade-in duration-200"
          onClick={() => setIsSearchOpen(false)}
        >
          {/* Close button top right */}
          <div className="w-full max-w-5xl flex justify-end p-6 sm:p-8">
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className="p-2.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2 text-xs uppercase tracking-widest font-cinzel"
              aria-label="Fechar busca"
            >
              <span className="hidden sm:inline">Fechar (ESC)</span>
              <X size={24} />
            </button>
          </div>

          {/* Search container */}
          <div 
            className="w-full max-w-3xl px-6 pt-4 sm:pt-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-8">
              <span className="font-cinzel text-xs uppercase tracking-[0.3em] text-[#D4AF37]">
                Encontre sua assinatura olfativa
              </span>
              <h2 className="font-serif text-2xl sm:text-4xl text-white font-normal mt-2">
                O que você procura hoje?
              </h2>
            </div>

            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <div className="relative flex items-center border-b-2 border-[#333338] focus-within:border-[#D4AF37] pb-3 transition-colors">
                <Search size={26} className="text-[#D4AF37] mr-4 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Nome do perfume, marca ou família olfativa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-transparent text-xl sm:text-2xl text-white placeholder-gray-500 focus:outline-none font-serif tracking-wide"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="p-1 text-gray-400 hover:text-white mr-3 transition-colors"
                    title="Limpar texto"
                  >
                    <X size={18} />
                  </button>
                )}
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#D4AF37] text-[#080808] text-xs font-semibold uppercase tracking-wider hover:bg-[#E5C358] transition-colors shrink-0 shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                >
                  Buscar
                </button>
              </div>

              {/* Quick suggestions */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs">
                <span className="text-gray-500 uppercase tracking-wider font-cinzel text-[11px] mr-1">
                  Sugestões:
                </span>
                {['Sauvage', 'Chanel', 'Paradoxe', 'Good Girl', 'Masculino', 'Feminino'].map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => handleQuickSearch(term)}
                    className="px-3 py-1.5 rounded-full bg-[#18181c] border border-[#2e2e34] text-gray-300 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
