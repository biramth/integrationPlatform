import { HeartPulse, Pill } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import * as statsApi from '../../api/statsApi';
import { getActiveRestrictions, getOnTreatment } from '../../api/healthApi';
import StatCard from '../../components/stats/StatCard';
import IllnessTrendChart from '../../components/stats/IllnessTrendChart';
import AllergyPrevalenceChart from '../../components/stats/AllergyPrevalenceChart';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState } from '../../components/common/StateViews';
import { StatCardSkeleton } from '../../components/common/Skeleton';
import { staggerStyle } from '../../utils/stagger';

// Vue d'ensemble pour la commission Santé : les statistiques médicales
// (tendance des maladies, prévalence des allergies, restrictions actives) sont
// justement ce qui reste hors de portée des autres tableaux de bord — cf. le
// principe "le médical reste médical" appliqué partout ailleurs sur la
// plateforme (annuaire Communication/Présidentielle, vue d'ensemble Orga…).
export default function SanteOverviewPage() {
  const illnessTrend = useFetch(statsApi.getIllnessTrend, []);
  const allergyPrevalence = useFetch(statsApi.getAllergyPrevalence, []);
  const activeRestrictions = useFetch(getActiveRestrictions, []);
  const onTreatment = useFetch(getOnTreatment, []);

  const loading = illnessTrend.loading || allergyPrevalence.loading || activeRestrictions.loading || onTreatment.loading;
  const error = illnessTrend.error || allergyPrevalence.error || activeRestrictions.error || onTreatment.error;

  if (error) return <ErrorState label={error} onRetry={() => window.location.reload()} />;

  return (
    <div>
      <PageHeader eyebrow="Vue d'ensemble" title="Tableau de bord" />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <div className="animate-fade-in-up" style={staggerStyle(0)}>
              <StatCard
                label="Restrictions actives"
                value={activeRestrictions.data.restrictions.length}
                sublabel={activeRestrictions.data.restrictions.length > 0 ? 'à suivre' : 'aucune'}
                icon={HeartPulse}
                tone="rose"
              />
            </div>
            <div className="animate-fade-in-up" style={staggerStyle(1)}>
              <StatCard
                label="Sous traitement"
                value={onTreatment.data.dut1.length}
                sublabel={onTreatment.data.dut1.length > 0 ? 'à suivre' : 'aucun'}
                icon={Pill}
                tone="amber"
              />
            </div>
          </>
        )}
      </div>

      {!loading && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 animate-fade-in-up" style={staggerStyle(2)}>
          <IllnessTrendChart rows={illnessTrend.data.rows} />
          <AllergyPrevalenceChart rows={allergyPrevalence.data.rows} />
        </div>
      )}
    </div>
  );
}
