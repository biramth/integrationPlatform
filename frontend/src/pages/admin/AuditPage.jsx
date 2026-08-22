import AuditPageView from '../../components/audit/AuditPageView';

// Vue IT : toutes les commissions, avec filtre par commission (y compris
// 'global', réservé aux actions comme la réinitialisation de la plateforme).
export default function AdminAuditPage() {
  return <AuditPageView description="Toutes les commissions, toutes les actions." showCommission />;
}
