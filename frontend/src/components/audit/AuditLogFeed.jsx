import { CheckCircle2, XCircle } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Avatar from '../common/Avatar';
import { EmptyState } from '../common/StateViews';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ROLE_LABELS, useRoleColors } from '../../utils/roles';
import { actionLabel, resourceTypeLabel, commissionLabel } from '../../utils/audit';
import { staggerStyle } from '../../utils/stagger';

function formatDate(isoString) {
  return new Date(isoString).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ResultBadge({ log }) {
  return log.success ? (
    <Badge variant="success">
      <CheckCircle2 className="h-3 w-3" /> Réussie
    </Badge>
  ) : (
    <Badge variant="danger" title={log.error_message || undefined}>
      <XCircle className="h-3 w-3" /> Échouée
    </Badge>
  );
}

function ActorLine({ log }) {
  const roleColors = useRoleColors();
  const actor = log.actor_snapshot || {};
  return (
    <div className="flex items-center gap-2">
      <Avatar name={actor.fullName || '?'} size={28} />
      <div>
        <p className="font-medium text-foreground">{actor.fullName || 'Compte supprimé'}</p>
        {actor.role && (
          <p className="text-xs" style={{ color: roleColors[actor.role] }}>
            {ROLE_LABELS[actor.role] || actor.role}
          </p>
        )}
      </div>
    </div>
  );
}

export default function AuditLogFeed({ logs, showCommission = false }) {
  if (!logs.length) {
    return <EmptyState label="Aucune action enregistrée pour ce filtre." />;
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 text-xs uppercase text-muted-foreground hover:bg-muted/50">
              <TableHead className="py-3 pl-4">Date</TableHead>
              <TableHead>Qui</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Ressource</TableHead>
              {showCommission && <TableHead>Commission</TableHead>}
              <TableHead>Résultat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log, i) => (
              <TableRow key={log.id} className="animate-fade-in" style={staggerStyle(i, 25, 300)}>
                <TableCell className="whitespace-normal py-3 pl-4 text-muted-foreground">{formatDate(log.created_at)}</TableCell>
                <TableCell className="whitespace-normal">
                  <ActorLine log={log} />
                </TableCell>
                <TableCell className="whitespace-normal">{actionLabel(log.action)}</TableCell>
                <TableCell className="whitespace-normal">
                  <p className="text-foreground">{resourceTypeLabel(log.resource_type)}</p>
                  {log.resource_label && <p className="text-xs text-muted-foreground">{log.resource_label}</p>}
                </TableCell>
                {showCommission && (
                  <TableCell>
                    <Badge variant="info">{commissionLabel(log.commission)}</Badge>
                  </TableCell>
                )}
                <TableCell>
                  <ResultBadge log={log} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {logs.map((log, i) => (
          <div key={log.id} className="animate-fade-in-up" style={staggerStyle(i)}>
            <Card className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <ActorLine log={log} />
                <ResultBadge log={log} />
              </div>
              <p className="text-sm text-foreground">{actionLabel(log.action)}</p>
              <p className="text-xs text-muted-foreground">
                {resourceTypeLabel(log.resource_type)}
                {log.resource_label ? ` — ${log.resource_label}` : ''}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {showCommission && <Badge variant="info">{commissionLabel(log.commission)}</Badge>}
                <span className="text-xs text-muted-foreground">{formatDate(log.created_at)}</span>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </>
  );
}
