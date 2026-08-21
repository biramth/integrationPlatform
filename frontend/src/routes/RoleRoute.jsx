import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { homePathForRole } from '../utils/roles';

// La commission IT est super-utilisateur côté front aussi : elle a accès à
// toutes les pages, comme côté backend (cf. requireRole dans middleware/auth.js).
// allowLeads : ouvre la route à tout chef de commission (is_commission_lead),
// quel que soit son rôle — utilisé pour /admin/agents, géré aussi par les chefs.
// subScope : pour les pages à sous-rôles (Orga, Santé), redirige un agent
// restreint à un autre sous-rôle vers sa page — le backend refuse déjà les
// appels API, ceci évite juste d'afficher une page dont il ne peut rien faire.
// Les valeurs de sub_role sont propres à chaque commission (ex: "chambres"
// n'existe que pour Orga), donc comparer juste user.subRole suffit sans avoir
// à revérifier le rôle ici.
// requireLead : pour les pages "Vue d'ensemble", en plus d'être dans la bonne
// commission il faut être chef — sans ça la page reste joignable par URL même
// si le lien de nav est déjà masqué pour les non-chefs.
export default function RoleRoute({ roles, allowLeads = false, subScope, requireLead = false }) {
  const { user } = useAuth();

  const allowed = user.role === 'it' || roles.includes(user.role) || (allowLeads && user.isCommissionLead);
  if (!allowed) {
    return <Navigate to={homePathForRole(user.role, user.subRole)} replace />;
  }
  if (requireLead && user.role !== 'it' && !user.isCommissionLead) {
    return <Navigate to={homePathForRole(user.role, user.subRole)} replace />;
  }
  if (subScope && user.subRole && user.subRole !== subScope) {
    return <Navigate to={homePathForRole(user.role, user.subRole)} replace />;
  }

  return <Outlet />;
}
