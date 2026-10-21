import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, Mail, Lock, Sparkles, Truck, ShieldCheck, Gem } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setAuth = useAuthStore(state => state.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3333/api'}/auth/login`,
        { email, password }
      );

      if (res.data.success) {
        setAuth(res.data.data.user, res.data.data.token);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'E-mail ou senha inválidos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex">
      {/* Left panel - cinematic */}
      <div className="hidden lg:flex lg:w-1/2 auth-hero flex-col relative overflow-hidden bg-[#080808]">
        <div className="relative z-10 text-center px-12 pt-12">
          <Sparkles size={20} className="text-[#D4AF37] mx-auto mb-4" />
          <h1 className="font-serif text-5xl font-light uppercase text-white mb-3 tracking-[0.3em]">Memorare</h1>
          <p className="text-gray-300 text-xs tracking-[0.25em] uppercase max-w-xs mx-auto leading-relaxed">
            Fragrâncias que ficam na memória
          </p>
        </div>

        {/* Frasco com fundo transparente, reduzido a partir de uma imagem maior para manter a nitidez */}
        <div className="relative flex-1 min-h-0 flex items-center justify-center py-4 px-12">
          <div className="absolute w-56 h-56 rounded-full bg-[#D4AF37]/15 blur-3xl" />
          <img
            src="/images/login-bottle.png"
            alt="Memorare MMRR Eau de Parfum"
            className="relative h-[400px] max-h-full w-auto object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.8)]"
          />
        </div>
        <div className="relative z-10 px-12 pb-10">
          <p className="font-serif italic text-xl text-white text-center leading-snug max-w-sm mx-auto">
            “O perfume é a forma mais intensa de memória.”
          </p>
          <div className="mt-6 pt-5 border-t border-[#D4AF37]/30 grid grid-cols-3 gap-4 text-center">
            {[
              { icon: Truck, label: 'Entrega rápida' },
              { icon: ShieldCheck, label: 'Compra segura' },
              { icon: Gem, label: 'Alta perfumaria' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <Icon size={18} className="text-[#D4AF37]" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-gray-300">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-[#080808]">
        <div className="max-w-md w-full">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="font-serif text-4xl font-light uppercase text-gray-900 dark:text-white tracking-[0.3em]">Memorare</h1>
          </div>

          <div className="bg-white dark:bg-[#161616] rounded-2xl shadow-sm border border-gray-100 dark:border-[#27272a] p-8">
            <div className="mb-8">
              <h2 className="font-serif text-3xl font-medium text-gray-900 dark:text-white tracking-wide">Bem-vindo de volta</h2>
              <p className="mt-1 text-sm text-gray-500">Entre na sua conta para continuar comprando</p>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <span className="text-red-500">⚠</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-[#3f3f46] bg-white dark:bg-[#080808] text-gray-900 dark:text-white rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-200 dark:border-[#3f3f46] bg-white dark:bg-[#080808] text-gray-900 dark:text-white rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 bg-gold-gradient text-[#080808] font-semibold uppercase tracking-[0.2em] text-xs rounded-lg hover:brightness-110 hover:shadow-[0_0_25px_rgba(212,175,55,0.35)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#080808]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Entrando...
                  </>
                ) : 'Entrar'}
              </button>
            </form>

            {/* Divider */}
            <div className="mt-6 border-t border-gray-100 dark:border-[#27272a] pt-6">
              <p className="text-center text-sm text-gray-500">
                Não tem uma conta?{' '}
                <Link to="/register" className="font-medium text-[#D4AF37] hover:text-[#E5C358] transition-colors">
                  Cadastre-se grátis
                </Link>
              </p>
            </div>

            {/* Dev hint */}
            <div className="mt-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-300">
              <strong>Dev:</strong> admin@ecommerce.com / admin123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
