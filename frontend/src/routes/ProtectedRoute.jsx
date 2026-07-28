import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Chargement…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
