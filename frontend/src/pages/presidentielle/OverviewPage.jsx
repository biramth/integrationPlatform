import { Users, DoorOpen, Luggage, Home, ClipboardCheck, HeartPulse, ScrollText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import * as statsApi from '../../api/statsApi';
import * as auditApi from '../../api/auditApi';
import StatCard from '../../components/stats/StatCard';
import DepartmentBarChart from '../../components/stats/DepartmentBarChart';
import GenderPieChart from '../../components/stats/GenderPieChart';
import AuditLogFeed from '../../components/audit/AuditLogFeed';
import Card from '../../components/common/Card';
import PageHeader from '../../components/common/PageHeader';
import { Progress } from '@/components/ui/progress';
import { ErrorState } from '../../components/common/StateViews';
import { StatCardSkeleton, CardListSkeleton } from '../../components/common/Skeleton';
import { staggerStyle } from '../../utils/stagger';

// Tableau de bord de la commission Présidentielle : supervision globale de
// TOUTES les intégrations. Contrairement à la vue d'ensemble Orga (qui
// se concentre sur les chambres/bagages), Présidentielle voit le taux
// de complétion médicale, les restrictions actives, et le journal d'audit
// transversal — c'est la seule commission qui a une vue complète.
export default function PresidentielleOverviewPage() {
  const overview = useFetch(statsApi.getOverview, []);
  const byDepartment = useFetch(statsApi.getByDepartment, []);
  const byGender = useFetch(statsApi.getByGender, []);
  const occupancy = useFetch(statsApi.getRoomsOccupancy, []);
  const logsFetch = useFetch(() => auditApi.listAuditLogs({ pageSize: 8 }), []);

  const loading = overview.loading || byDepartment.loading || byGender.loading || occupancy.loading;
  const error = overview.error || byDepartment.error || byGender.error || occupancy.error;

  if (error) return <ErrorState label={error} onRetry={() => window.location.reload()} />;

  const o = overview.data;
  const medicalRate = o.total > 0 ? ((o.complementaryDone / o.total) * 100).toFixed(0) : 0;

  return (
    <div>
      <PageHeader
        eyebrow="Présidentielle"
        title="Supervision des intégrations"
        description="Vue d'ensemble complète de toutes les commissions."
      />

      {/* Statistiques globales */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {loading ? (
          <>
            <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
            <StatCardSkeleton /><StatCardSkeleton />
          </>
        ) : (
          <>
            <div className="animate-fade-in-up" style={staggerStyle(0)}>
              <StatCard label="Total DUT1" value={o.total} icon={Users} tone="blue" />
            </div>
            <div className="animate-fade-in-up" style={staggerStyle(1)}>
              <StatCard
                label="Chambres attribuées"
                value={o.withRoom}
                sublabel={<span className={o.withoutRoom > 0 ? 'font-medium text-warning-soft-foreground' : undefined}>{o.withoutRoom} en attente</span>}
                icon={DoorOpen}
                tone="emerald"
              />
            </div>
            <div className="animate-fade-in-up" style={staggerStyle(2)}>
              <StatCard
                label="Bagages photographiés"
                value={o.withLuggage}
                sublabel={<span className={o.withoutLuggage > 0 ? 'font-medium text-warning-soft-foreground' : undefined}>{o.withoutLuggage} restants</span>}
                icon={Luggage}
                tone="amber"
              />
            </div>
            <div className="animate-fade-in-up" style={staggerStyle(3)}>
              <StatCard
                label="Dossier médical"
                value={`${medicalRate}%`}
                sublabel={<span className={o.complementaryPending > 0 ? 'font-medium text-warning-soft-foreground' : undefined}>{o.complementaryPending} en attente</span>}
                icon={ClipboardCheck}
                tone="violet"
              />
            </div>
            <div className="animate-fade-in-up" style={staggerStyle(4)}>
              <StatCard
                label="Restrictions actives"
                value={o.activeRestrictions}
                sublabel={o.activeRestrictions > 0 ? 'à suivre' : 'aucune'}
                icon={HeartPulse}
                tone="rose"
              />
            </div>
          </>
        )}
      </div>

      {!loading && (
        <>
          {/* Occupation des chambres */}
          <Card interactive className="mb-6 animate-fade-in-up" style={staggerStyle(5)}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="mb-1 text-sm font-semibold text-foreground">Occupation des chambres</p>
                <p className="text-3xl font-bold tabular-nums text-foreground">{occupancy.data.occupancyRate}%</p>
                <p className="text-xs text-muted-foreground">
                  {occupancy.data.totalOccupied} / {occupancy.data.totalCapacity} places occupées
                </p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-info/20 to-info/5 text-info shadow-soft transition-transform duration-150 group-hover:scale-110">
                <Home className="h-4.5 w-4.5" size={18} strokeWidth={2} />
              </span>
            </div>
            <Progress value={Math.min(occupancy.data.occupancyRate, 100)} className="mt-3 h-2" />
          </Card>

          {/* Graphiques */}
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2 animate-fade-in-up" style={staggerStyle(6)}>
            <DepartmentBarChart rows={byDepartment.data.rows} />
            <GenderPieChart rows={byGender.data.rows} />
          </div>

          {/* Journal d'audit */}
          <div className="mb-3 flex items-center justify-between animate-fade-in-up" style={staggerStyle(7)}>
            <p className="text-sm font-semibold text-foreground">Dernières actions (toutes commissions)</p>
            <Link to="/audit" className="flex items-center gap-1 text-xs text-role-accent transition-colors hover:underline">
              Voir le journal complet <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="animate-fade-in-up" style={staggerStyle(8)}>
            {logsFetch.loading ? <CardListSkeleton rows={3} /> : <AuditLogFeed logs={logsFetch.data?.logs || []} showCommission />}
          </div>
        </>
      )}
    </div>
  );
}
