import { useFetch } from '../../hooks/useFetch';
import * as statsApi from '../../api/statsApi';
import StatCard from '../../components/stats/StatCard';
import DepartmentBarChart from '../../components/stats/DepartmentBarChart';
import GenderPieChart from '../../components/stats/GenderPieChart';
import Card from '../../components/common/Card';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState } from '../../components/common/StateViews';
import { StatCardSkeleton } from '../../components/common/Skeleton';
import { staggerStyle } from '../../utils/stagger';

export default function AdminDashboardPage() {
  const overview = useFetch(statsApi.getOverview, []);
  const byDepartment = useFetch(statsApi.getByDepartment, []);
  const byGender = useFetch(statsApi.getByGender, []);
  const occupancy = useFetch(statsApi.getRoomsOccupancy, []);

  const loading = overview.loading || byDepartment.loading || byGender.loading || occupancy.loading;
  const error = overview.error || byDepartment.error || byGender.error || occupancy.error;

  if (error) return <ErrorState label={error} onRetry={() => window.location.reload()} />;

  const o = overview.data;

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
              <StatCard label="Total DUT1" value={o.total} icon="👥" accent="bg-blue-800" />
            </div>
            <div className="animate-fade-in-up" style={staggerStyle(1)}>
              <StatCard
                label="Avec chambre"
                value={o.withRoom}
                sublabel={`${o.withoutRoom} en attente`}
                icon="🚪"
                accent="bg-emerald-600"
              />
            </div>
            <div className="animate-fade-in-up" style={staggerStyle(2)}>
              <StatCard
                label="Bagages photographiés"
                value={o.withLuggage}
                sublabel={`${o.withoutLuggage} restants`}
                icon="🧳"
                accent="bg-amber-500"
              />
            </div>
            <div className="animate-fade-in-up" style={staggerStyle(3)}>
              <StatCard
                label="Phase 2 complétée"
                value={o.complementaryDone}
                sublabel={`${o.complementaryPending} restants`}
                icon="📋"
                accent="bg-sky-600"
              />
            </div>
          </>
        )}
      </div>

      {!loading && (
        <>
          <Card interactive className="mb-6 animate-fade-in-up" style={staggerStyle(4)}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="mb-1 text-sm font-semibold text-slate-900">Occupation des chambres</p>
                <p className="text-2xl font-semibold tabular-nums text-slate-900">{occupancy.data.occupancyRate}%</p>
                <p className="text-xs text-slate-500">
                  {occupancy.data.totalOccupied} / {occupancy.data.totalCapacity} places occupées
                </p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-lg">🏠</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-800 transition-all duration-500"
                style={{ width: `${Math.min(occupancy.data.occupancyRate, 100)}%` }}
              />
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 animate-fade-in-up" style={staggerStyle(5)}>
            <DepartmentBarChart rows={byDepartment.data.rows} />
            <GenderPieChart rows={byGender.data.rows} />
          </div>
        </>
      )}
    </div>
  );
}
