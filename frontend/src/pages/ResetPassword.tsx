import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!token) {
      setError('Token de redefinição ausente na URL. Solicite um novo link.');
      return;
    }

    if (password !== confirmPassword) {
      setError('A confirmação de senha não confere.');
      return;
    }

    setLoading(true);
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
      const res = await axios.post(`${apiBase}/auth/reset-password`, {
        token,
        password,
      });
      setSuccessMessage(res.data?.message || 'Senha redefinida com sucesso!');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Não foi possível redefinir a senha. Solicite um novo link.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-[#080808]">
      <div className="max-w-md w-full bg-white dark:bg-[#161616] rounded-2xl shadow-sm border border-gray-100 dark:border-[#27272a] p-8">
        <div className="mb-6">
          <h1 className="font-serif text-3xl font-medium text-gray-900 dark:text-white tracking-wide">
            Redefinir senha
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Crie uma nova senha para acessar sua conta.
          </p>
        </div>

        {!token && !successMessage && (
          <div
            role="alert"
            className="mb-6 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 px-4 py-3 rounded-lg text-sm"
          >
            Nenhum token encontrado na URL.{' '}
            <Link to="/forgot-password" className="underline font-medium">
              Solicitar novo link
            </Link>
          </div>
        )}

        {successMessage && (
          <div
            role="alert"
            className="mb-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-lg text-sm flex items-start gap-2"
          >
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
            <div>
              <p>{successMessage}</p>
              <Link to="/login" className="underline font-medium mt-1 inline-block">
                Ir para o login agora
              </Link>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm flex items-start gap-2"
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nova senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-gray-400" />
              </div>
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="block w-full pl-10 pr-12 py-3 border border-gray-200 dark:border-[#3f3f46] bg-white dark:bg-[#080808] text-gray-900 dark:text-white rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirmar nova senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-gray-400" />
              </div>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="block w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-[#3f3f46] bg-white dark:bg-[#080808] text-gray-900 dark:text-white rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full flex justify-center items-center py-3 px-4 bg-gold-gradient text-[#080808] font-semibold uppercase tracking-[0.2em] text-xs rounded-lg hover:brightness-110 hover:shadow-[0_0_25px_rgba(212,175,55,0.35)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Salvando...' : 'Redefinir senha'}
          </button>
        </form>

        <div className="mt-6 border-t border-gray-100 dark:border-[#27272a] pt-6 text-center">
          <Link to="/login" className="text-sm font-medium text-[#D4AF37] hover:text-[#E5C358] transition-colors">
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}
