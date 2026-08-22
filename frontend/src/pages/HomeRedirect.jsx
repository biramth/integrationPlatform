import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { homePathForRole } from '../utils/roles';
import LandingPage from './LandingPage';

export default function HomeRedirect() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Chargement…</div>;
  }
  if (!user) {
    return <LandingPage />;
  }
  return <Navigate to={homePathForRole(user.role, user.subRole, user.isCommissionLead)} replace />;
}
