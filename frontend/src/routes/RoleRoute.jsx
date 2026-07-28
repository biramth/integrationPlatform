import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { homePathForRole } from '../utils/roles';

export default function RoleRoute({ roles }) {
  const { user } = useAuth();

  if (!roles.includes(user.role)) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  return <Outlet />;
}
