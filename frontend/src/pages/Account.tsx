import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
const inputClass = 'mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300';
const cardClass = 'bg-white dark:bg-gray-900 shadow-sm rounded-xl border border-gray-200 dark:border-gray-800 p-6';
const buttonClass = 'px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

type Feedback = { type: 'success' | 'error'; text: string } | null;

function FeedbackBox({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  const ok = feedback.type === 'success';
  return (
    <div
      role="alert"
      className={`flex items-center gap-2 p-3 rounded-lg text-sm border ${
        ok
          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
          : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
      }`}
    >
      {ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      {feedback.text}
    </div>
  );
}

const emptyAddress = { zipCode: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' };

export function Account() {
  const navigate = useNavigate();
  const { token, user, setAuth, logout } = useAuthStore();
  const headers = { Authorization: `Bearer ${token}` };

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profile, setProfile] = useState({ name: '', phone: '' });
  const [address, setAddress] = useState(emptyAddress);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<Feedback>(null);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwFeedback, setPwFeedback] = useState<Feedback>(null);

  const handleUnauthorized = (err: unknown) => {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      logout();
      navigate('/login', { state: { from: '/account' } });
      return true;
    }
    return false;
  };
  const errorText = (err: unknown, fallback: string) =>
    (axios.isAxiosError(err) && err.response?.data?.message) || fallback;

  const applyMe = (me: any) => {
    setProfile({ name: me.name || '', phone: me.phone || '' });
    const a = me.address;
    setAddress(a ? { ...emptyAddress, ...a, complement: a.complement || '' } : emptyAddress);
  };

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await axios.get(`${apiBase}/users/me`, { headers });
      applyMe(res.data.data);
    } catch (err) {
      if (!handleUnauthorized(err)) setLoadError(errorText(err, 'Não foi possível carregar seus dados.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileFeedback(null);

    // Só envia endereço se algum campo foi preenchido (todos os obrigatórios são validados no servidor)
    const hasAddress = Object.entries(address).some(([k, v]) => k !== 'complement' && String(v).trim());
    try {
      const res = await axios.patch(
        `${apiBase}/users/me`,
        { name: profile.name, phone: profile.phone, ...(hasAddress && { address }) },
        { headers },
      );
      applyMe(res.data.data);
      if (user && token) setAuth({ ...user, name: res.data.data.name }, token); // atualiza o nome no header
      setProfileFeedback({ type: 'success', text: 'Dados atualizados com sucesso.' });
    } catch (err) {
      if (!handleUnauthorized(err)) setProfileFeedback({ type: 'error', text: errorText(err, 'Erro ao salvar os dados.') });
    } finally {
      setProfileLoading(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwFeedback(null);
    if (pw.newPassword !== pw.confirm) {
      setPwFeedback({ type: 'error', text: 'A confirmação não confere com a nova senha.' });
      return;
    }
    setPwLoading(true);
    try {
      await axios.put(
        `${apiBase}/users/me/password`,
        { currentPassword: pw.currentPassword, newPassword: pw.newPassword },
        { headers },
      );
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      setPwFeedback({ type: 'success', text: 'Senha alterada com sucesso.' });
    } catch (err) {
      if (!handleUnauthorized(err)) setPwFeedback({ type: 'error', text: errorText(err, 'Erro ao alterar a senha.') });
    } finally {
      setPwLoading(false);
    }
  };

  const setAddr = (field: keyof typeof emptyAddress) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddress(prev => ({ ...prev, [field]: e.target.value }));

  if (loading) return <div className="p-12 text-center text-gray-500 dark:text-gray-400">Carregando...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-gray-100">Minha conta</h1>

      {loadError && (
        <div role="alert" className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-300 flex items-center justify-between gap-4">
          {loadError}
          <button onClick={load} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium">Tentar de novo</button>
        </div>
      )}

      <form onSubmit={saveProfile} className={`${cardClass} space-y-5`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Dados pessoais e endereço</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="name">Nome</label>
            <input id="name" required minLength={2} value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="phone">Telefone</label>
            <input id="phone" type="tel" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="email">E-mail</label>
            <input id="email" value={user?.email || ''} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
          </div>
        </div>

        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 pt-2">Endereço de entrega</h3>
        <div className="grid gap-4 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="zipCode">CEP</label>
            <input id="zipCode" inputMode="numeric" maxLength={9} placeholder="00000-000" value={address.zipCode} onChange={setAddr('zipCode')} className={inputClass} />
          </div>
          <div className="sm:col-span-3">
            <label className={labelClass} htmlFor="street">Rua</label>
            <input id="street" value={address.street} onChange={setAddr('street')} className={inputClass} />
          </div>
          <div className="sm:col-span-1">
            <label className={labelClass} htmlFor="number">Nº</label>
            <input id="number" value={address.number} onChange={setAddr('number')} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="complement">Complemento</label>
            <input id="complement" value={address.complement} onChange={setAddr('complement')} className={inputClass} />
          </div>
          <div className="sm:col-span-4">
            <label className={labelClass} htmlFor="neighborhood">Bairro</label>
            <input id="neighborhood" value={address.neighborhood} onChange={setAddr('neighborhood')} className={inputClass} />
          </div>
          <div className="sm:col-span-4">
            <label className={labelClass} htmlFor="city">Cidade</label>
            <input id="city" value={address.city} onChange={setAddr('city')} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="state">Estado</label>
            <input id="state" value={address.state} onChange={setAddr('state')} className={inputClass} />
          </div>
        </div>

        <FeedbackBox feedback={profileFeedback} />
        <button type="submit" disabled={profileLoading} className={buttonClass}>
          {profileLoading ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>

      <form onSubmit={savePassword} className={`${cardClass} space-y-5`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Alterar senha</h2>
        <div>
          <label className={labelClass} htmlFor="currentPassword">Senha atual</label>
          <input id="currentPassword" type="password" required autoComplete="current-password" value={pw.currentPassword} onChange={e => setPw({ ...pw, currentPassword: e.target.value })} className={inputClass} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="newPassword">Nova senha</label>
            <input id="newPassword" type="password" required minLength={6} autoComplete="new-password" value={pw.newPassword} onChange={e => setPw({ ...pw, newPassword: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="confirm">Confirmar nova senha</label>
            <input id="confirm" type="password" required minLength={6} autoComplete="new-password" value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} className={inputClass} />
          </div>
        </div>
        <FeedbackBox feedback={pwFeedback} />
        <button type="submit" disabled={pwLoading} className={buttonClass}>
          {pwLoading ? 'Alterando...' : 'Alterar senha'}
        </button>
      </form>
    </div>
  );
}
