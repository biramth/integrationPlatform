import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { homePathForRole } from '../utils/roles';

// La commission IT est super-utilisateur côté front aussi : elle a accès à
// toutes les pages, comme côté backend (cf. requireRole dans middleware/auth.js).
// allowLeads : ouvre la route à tout chef de commission (is_commission_lead),
// quel que soit son rôle — utilisé pour /admin/agents, géré aussi par les chefs.
// orgaScope : pour les pages Orga, redirige un agent restreint à un autre
// sous-rôle (sub_role) vers sa page — le backend refuse déjà les appels API,
// ceci évite juste d'afficher une page dont il ne peut rien faire.
export default function RoleRoute({ roles, allowLeads = false, orgaScope }) {
  const { user } = useAuth();

  const allowed = user.role === 'it' || roles.includes(user.role) || (allowLeads && user.isCommissionLead);
  if (!allowed) {
    return <Navigate to={homePathForRole(user.role, user.subRole)} replace />;
  }
  if (orgaScope && user.role === 'orga' && user.subRole && user.subRole !== orgaScope) {
    return <Navigate to={homePathForRole(user.role, user.subRole)} replace />;
  }

  return <Outlet />;
}
