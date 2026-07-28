import { useFetch } from '../../hooks/useFetch';
import * as statsApi from '../../api/statsApi';
import StatCard from '../../components/stats/StatCard';
import DepartmentBarChart from '../../components/stats/DepartmentBarChart';
import GenderPieChart from '../../components/stats/GenderPieChart';
import { ErrorState } from '../../components/common/StateViews';
import { StatCardSkeleton } from '../../components/common/Skeleton';

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
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Tableau de bord</h1>

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
            <StatCard label="Total DUT1" value={o.total} />
            <StatCard label="Avec chambre" value={o.withRoom} sublabel={`${o.withoutRoom} en attente`} />
            <StatCard label="Bagages photographiés" value={o.withLuggage} sublabel={`${o.withoutLuggage} restants`} />
            <StatCard label="Phase 2 complétée" value={o.complementaryDone} sublabel={`${o.complementaryPending} restants`} />
          </>
        )}
      </div>

      {!loading && (
        <>
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
            <p className="mb-1 text-sm font-semibold text-slate-900">Occupation des chambres</p>
            <p className="text-2xl font-semibold text-slate-900">{occupancy.data.occupancyRate}%</p>
            <p className="text-xs text-slate-500">
              {occupancy.data.totalOccupied} / {occupancy.data.totalCapacity} places occupées
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <DepartmentBarChart rows={byDepartment.data.rows} />
            <GenderPieChart rows={byGender.data.rows} />
          </div>
        </>
      )}
    </div>
  );
}
