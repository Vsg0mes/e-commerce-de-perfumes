import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, History, LogOut, Package, Shield } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

/** Menu suspenso do usuário logado (canto superior direito do Header). */
export function UserMenu() {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Fecha ao navegar
  useEffect(() => { setOpen(false); }, [location.pathname, location.search]);

  // Fecha ao clicar fora ou com ESC
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const itemClass = 'flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-[#D4AF37] hover:bg-white/5 transition-colors';

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/');
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 px-2 py-1.5 rounded-full text-xs text-gray-300 tracking-wider hover:text-[#D4AF37] hover:bg-white/5 transition-colors"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#D4AF37] text-[#080808] text-xs font-semibold">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <span className="hidden sm:inline max-w-[140px] truncate">{user.name}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-[#27272a] bg-[#111113] shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-50"
        >
          <div className="px-4 py-3 border-b border-[#27272a]">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
          <div className="py-1">
            <Link to="/orders" role="menuitem" className={itemClass}>
              <Package size={16} /> Meus Pedidos
            </Link>
            <Link to="/orders?filter=history" role="menuitem" className={itemClass}>
              <History size={16} /> Histórico de compras
            </Link>
            {user.role === 'ADMIN' && (
              <Link to="/admin" role="menuitem" className={itemClass}>
                <Shield size={16} className="text-[#D4AF37]" /> Painel Admin
              </Link>
            )}
          </div>
          <div className="border-t border-[#27272a] py-1">
            <button type="button" role="menuitem" onClick={handleLogout} className={`${itemClass} w-full text-left hover:text-red-400`}>
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
