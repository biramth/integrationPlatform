import { Users, DoorOpen, Luggage, HeartPulse, Home } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import * as statsApi from '../../api/statsApi';
import StatCard from '../../components/stats/StatCard';
import DepartmentBarChart from '../../components/stats/DepartmentBarChart';
import GenderPieChart from '../../components/stats/GenderPieChart';
import IllnessTrendChart from '../../components/stats/IllnessTrendChart';
import AllergyPrevalenceChart from '../../components/stats/AllergyPrevalenceChart';
import AdmissionListChart from '../../components/stats/AdmissionListChart';
import Card from '../../components/common/Card';
import PageHeader from '../../components/common/PageHeader';
import { Progress } from '@/components/ui/progress';
import { ErrorState } from '../../components/common/StateViews';
import { StatCardSkeleton } from '../../components/common/Skeleton';
import { staggerStyle } from '../../utils/stagger';

export default function AdminDashboardPage() {
  const overview = useFetch(statsApi.getOverview, []);
  const byDepartment = useFetch(statsApi.getByDepartment, []);
  const byGender = useFetch(statsApi.getByGender, []);
  const occupancy = useFetch(statsApi.getRoomsOccupancy, []);
  const illnessTrend = useFetch(statsApi.getIllnessTrend, []);
  const allergyPrevalence = useFetch(statsApi.getAllergyPrevalence, []);
  const admissionList = useFetch(statsApi.getByAdmissionList, []);

  const loading =
    overview.loading ||
    byDepartment.loading ||
    byGender.loading ||
    occupancy.loading ||
    illnessTrend.loading ||
    allergyPrevalence.loading ||
    admissionList.loading;
  const error =
    overview.error ||
    byDepartment.error ||
    byGender.error ||
    occupancy.error ||
    illnessTrend.error ||
    allergyPrevalence.error ||
    admissionList.error;

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
              <StatCard label="Total DUT1" value={o.total} icon={Users} tone="blue" />
            </div>
            <div className="animate-fade-in-up" style={staggerStyle(1)}>
              <StatCard
                label="Avec chambre"
                value={o.withRoom}
                sublabel={
                  <span className={o.withoutRoom > 0 ? 'font-medium text-warning-soft-foreground' : undefined}>
                    {o.withoutRoom} en attente
                  </span>
                }
                icon={DoorOpen}
                tone="emerald"
              />
            </div>
            <div className="animate-fade-in-up" style={staggerStyle(2)}>
              <StatCard
                label="Bagages photographiés"
                value={o.withLuggage}
                sublabel={
                  <span className={o.withoutLuggage > 0 ? 'font-medium text-warning-soft-foreground' : undefined}>
                    {o.withoutLuggage} restants
                  </span>
                }
                icon={Luggage}
                tone="amber"
              />
            </div>
            <div className="animate-fade-in-up" style={staggerStyle(3)}>
              <StatCard
                label="Restrictions santé actives"
                value={o.activeRestrictions}
                sublabel={
                  o.activeRestrictions > 0 ? (
                    <span className="font-medium text-warning-soft-foreground">à suivre</span>
                  ) : (
                    'aucune'
                  )
                }
                icon={HeartPulse}
                tone="rose"
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

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 animate-fade-in-up" style={staggerStyle(5)}>
            <DepartmentBarChart rows={byDepartment.data.rows} />
            <GenderPieChart rows={byGender.data.rows} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 animate-fade-in-up" style={staggerStyle(6)}>
            <IllnessTrendChart rows={illnessTrend.data.rows} />
            <AllergyPrevalenceChart rows={allergyPrevalence.data.rows} />
          </div>

          <div className="mt-4 animate-fade-in-up" style={staggerStyle(7)}>
            <AdmissionListChart rows={admissionList.data.rows} />
          </div>
        </>
      )}
    </div>
  );
}
