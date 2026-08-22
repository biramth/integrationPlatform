import AuditPageView from '../../components/audit/AuditPageView';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../utils/roles';

// Vue chef de commission : scopée côté serveur à sa propre commission (domaine
// de la ressource touchée, pas seulement les actions de ses propres agents —
// cf. auditController.listAuditLogs). Pas de filtre "commission" ici, il
// serait de toute façon ignoré par le backend.
export default function AuditPage() {
  const { user } = useAuth();
  return <AuditPageView description={`Actions enregistrées sur le périmètre de la ${ROLE_LABELS[user.role]}.`} showCommission={false} />;
}
