import { CalendarDays } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import * as activityApi from '../../api/activityApi';
import Card from '../../components/common/Card';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState, EmptyState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { staggerStyle } from '../../utils/stagger';

// Vue planning en lecture seule, partagée par les commissions Communication et
// Culturelle : mêmes activités que /admin/activites, sans les actions de
// création/modification/suppression réservées à admin/it/activites.
export default function PlanningReadOnlyPage() {
  const { data, loading, error, reload } = useFetch(activityApi.listActivities, []);

  return (
    <div>
      <PageHeader title="Planning" description="Programme de la semaine d'intégration." />

      {loading && <CardListSkeleton />}
      {error && <ErrorState label={error} onRetry={reload} />}
      {!loading && !error && data.activities.length === 0 && (
        <EmptyState label="Aucune activité configurée." icon={CalendarDays} />
      )}

      {!loading && !error && data.activities.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.activities.map((activity, i) => (
            <div key={activity.id} className="animate-fade-in-up" style={staggerStyle(i)}>
              <Card accent="bg-role-accent" className="pl-5">
                <p className="font-medium text-foreground">{activity.name}</p>
                <p className="text-sm text-muted-foreground">
                  {activity.activity_date}
                  {activity.end_date ? ` → ${activity.end_date}` : ''}
                </p>
                {activity.description && <p className="mt-1 text-xs text-muted-foreground">{activity.description}</p>}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
