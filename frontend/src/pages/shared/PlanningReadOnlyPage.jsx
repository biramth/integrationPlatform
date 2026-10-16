import { CalendarDays } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import * as activityApi from '../../api/activityApi';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState, EmptyState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import ActivityTimeline from '../../components/activities/ActivityTimeline';

// Vue planning en lecture seule, partagée par toutes les commissions : même
// timeline "J0 … Jn" que /admin/activites, sans les actions de
// création/modification/suppression réservées à it/presidentielle.
export default function PlanningReadOnlyPage() {
  const { data, loading, error, reload } = useFetch(activityApi.listActivities, []);
  const activities = data?.activities || [];

  return (
    <div>
      <PageHeader title="Planning" description="Programme de la semaine d'intégration, jour par jour." />

      {loading && <CardListSkeleton />}
      {error && <ErrorState label={error} onRetry={reload} />}
      {!loading && !error && activities.length === 0 && (
        <EmptyState label="Aucune activité configurée." icon={CalendarDays} />
      )}

      {!loading && !error && activities.length > 0 && (
        <ActivityTimeline activities={activities} />
      )}
    </div>
  );
}
