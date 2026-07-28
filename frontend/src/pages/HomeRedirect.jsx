import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { homePathForRole } from '../utils/roles';

export default function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={homePathForRole(user.role)} replace />;
}
