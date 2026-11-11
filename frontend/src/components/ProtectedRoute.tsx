import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/** Exige login; ao redirecionar, guarda a rota de origem para voltar após autenticar. */
export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const token = useAuthStore(state => state.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}
