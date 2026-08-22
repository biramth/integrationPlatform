import { Link } from 'react-router-dom';
import { Users, UserCheck, Crown, ScrollText, ArrowRight } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import * as agentApi from '../../api/agentApi';
import * as auditApi from '../../api/auditApi';
import AuditLogFeed from '../../components/audit/AuditLogFeed';
import StatCard from '../../components/stats/StatCard';
import Card from '../../components/common/Card';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState } from '../../components/common/StateViews';
import { StatCardSkeleton, CardListSkeleton } from '../../components/common/Skeleton';
import { ROLES, ROLE_LABELS, useRoleColors } from '../../utils/roles';
import { staggerStyle } from '../../utils/stagger';

const RECENT_LOGS_COUNT = 5;

// Tableau de bord de la commission IT : ce qui relève vraiment de son travail
// au quotidien (comptes agents, journal d'audit), pas les statistiques DUT1
// (effectif, chambres, bagages...) qui vivent maintenant sur la Vue
// d'ensemble de la commission Présidentielle (pages/shared/OverviewPage.jsx).
export default function AdminDashboardPage() {
  const roleColors = useRoleColors();
  const agentsFetch = useFetch(agentApi.listAgents, []);
  const logsFetch = useFetch(() => auditApi.listAuditLogs({ pageSize: RECENT_LOGS_COUNT }), []);

  const loading = agentsFetch.loading || logsFetch.loading;
  const error = agentsFetch.error || logsFetch.error;

  if (error) return <ErrorState label={error} onRetry={() => window.location.reload()} />;

  const agents = agentsFetch.data?.agents || [];
  const activeAgents = agents.filter((a) => a.is_active);
  const leadCommissions = new Set(agents.filter((a) => a.is_commission_lead).map((a) => a.role));
  const allRoles = Object.values(ROLES);

  const countsByRole = Object.fromEntries(
    allRoles.map((role) => {
      const roleAgents = agents.filter((a) => a.role === role);
      return [
        role,
        {
          total: roleAgents.length,
          active: roleAgents.filter((a) => a.is_active).length,
          lead: roleAgents.find((a) => a.is_commission_lead) || null,
        },
      ];
    })
  );

  return (
    <div>
      <PageHeader eyebrow="Vue d'ensemble" title="Tableau de bord" />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <div className="animate-fade-in-up" style={staggerStyle(0)}>
              <StatCard label="Comptes agents" value={agents.length} icon={Users} tone="blue" />
            </div>
            <div className="animate-fade-in-up" style={staggerStyle(1)}>
              <StatCard
                label="Comptes actifs"
                value={activeAgents.length}
                sublabel={`${agents.length - activeAgents.length} désactivé(s)`}
                icon={UserCheck}
                tone="emerald"
              />
            </div>
            <div className="animate-fade-in-up" style={staggerStyle(2)}>
              <StatCard
                label="Chefs désignés"
                value={`${leadCommissions.size} / ${allRoles.length}`}
                sublabel="commissions avec un chef"
                icon={Crown}
                tone="amber"
              />
            </div>
            <div className="animate-fade-in-up" style={staggerStyle(3)}>
              <StatCard label="Actions journalisées" value={logsFetch.data?.total ?? 0} icon={ScrollText} tone="violet" />
            </div>
          </>
        )}
      </div>

      {!loading && (
        <>
          <Card className="mb-6 animate-fade-in-up" style={staggerStyle(4)}>
            <p className="mb-3 text-sm font-semibold text-foreground">Comptes par commission</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {allRoles.map((role) => {
                const c = countsByRole[role];
                return (
                  <div key={role} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: roleColors[role] }} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{ROLE_LABELS[role]}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.lead ? c.lead.full_name : <span className="italic">Pas de chef désigné</span>}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {c.active}/{c.total}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="mb-3 flex items-center justify-between animate-fade-in-up" style={staggerStyle(5)}>
            <p className="text-sm font-semibold text-foreground">Dernières actions</p>
            <Link to="/admin/audit" className="flex items-center gap-1 text-xs text-role-accent transition-colors hover:underline">
              Voir le journal complet <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="animate-fade-in-up" style={staggerStyle(6)}>
            {logsFetch.loading ? <CardListSkeleton rows={3} /> : <AuditLogFeed logs={logsFetch.data?.logs || []} showCommission />}
          </div>
        </>
      )}
    </div>
  );
}
