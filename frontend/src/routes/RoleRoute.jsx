import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { homePathForRole } from '../utils/roles';

// La commission IT est super-utilisateur côté front aussi : elle a accès à
// toutes les pages, comme côté backend (cf. requireRole dans middleware/auth.js).
// allowLeads : ouvre la route à tout chef de commission (is_commission_lead)
// ou chef de pôle (is_pole_lead, parité complète voulue) — utilisé pour
// /admin/agents, /audit, géré aussi par les chefs.
// subScope : pour les pages à sous-rôles (Orga, Santé), redirige un agent
// restreint à un autre sous-rôle vers sa page — le backend refuse déjà les
// appels API, ceci évite juste d'afficher une page dont il ne peut rien faire.
// Les valeurs de sub_role sont propres à chaque commission (ex: "chambres"
// n'existe que pour Orga), donc comparer juste user.subRole suffit sans avoir
// à revérifier le rôle ici. Le chef de commission (isCommissionLead) est
// exclu d'une page à subScope par défaut, même avec sub_role NULL : il
// supervise, il n'exécute pas les tâches de sous-rôle (le backend refuse déjà
// l'appel API correspondant, cf. requireOrgaScope/requireSanteScope).
// leadBypassesScope : exception à cette exclusion, pour les domaines où le
// chef reste un agent à part entière (ex: Santé "suivi" — Risques du jour et
// Suivi santé restent son travail au quotidien, contrairement à la saisie de
// phase 1/2 dans les autres commissions) — le backend applique
// la même exception via requireOrgaScope/requireSanteScope({ allowLead }).
// Le chef de pôle (isPoleLead, propre à Orga) est toujours exclu de cette
// exclusion, indépendamment de leadBypassesScope : il peut jouer tous les
// sous-rôles de la commission Orga (cf. requireOrgaScope côté backend), donc
// une page à subScope ne le redirige jamais.
// requireLead : pour les pages "Vue d'ensemble", en plus d'être dans la bonne
// commission il faut être chef — sans ça la page reste joignable par URL même
// si le lien de nav est déjà masqué pour les non-chefs. Le chef de pôle
// (isPoleLead, propre à Orga) compte comme chef ICI — contrairement à
// allowLeads (agents/audit) plus haut, volontairement laissé sur
// isCommissionLead seul : cf. navConfig.js et requireCommissionLeadStrict côté
// backend pour la même distinction (délégation opérationnelle, jamais agents/audit).
// excludeIt : coupe le bypass superutilisateur pour cette route précise —
// réservé aux pages qui relèvent explicitement d'une autre commission que IT
// (chambres, création d'activités), là où le backend refuse déjà l'appel API
// correspondant (requireRoleStrict) : ceci évite juste qu'IT atterrisse sur
// une page qui échouerait de toute façon à la moindre action.
export default function RoleRoute({
  roles,
  allowLeads = false,
  subScope,
  requireLead = false,
  excludeIt = false,
  leadBypassesScope = false,
}) {
  const { user } = useAuth();
  const isLead = user.isCommissionLead || user.isPoleLead;

  const allowed = (user.role === 'it' && !excludeIt) || roles.includes(user.role) || (allowLeads && isLead);
  if (!allowed) {
    return <Navigate to={homePathForRole(user.role, user.subRole, user.isCommissionLead, user.isPoleLead)} replace />;
  }
  if (requireLead && user.role !== 'it' && !isLead) {
    return <Navigate to={homePathForRole(user.role, user.subRole, user.isCommissionLead, user.isPoleLead)} replace />;
  }
  if (
    subScope &&
    !user.isPoleLead &&
    !(leadBypassesScope && isLead) &&
    (user.isCommissionLead || (user.subRole && user.subRole !== subScope))
  ) {
    return <Navigate to={homePathForRole(user.role, user.subRole, user.isCommissionLead, user.isPoleLead)} replace />;
  }

  return <Outlet />;
}
