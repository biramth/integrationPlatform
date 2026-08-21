import { CalendarDays } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import * as activityApi from '../../api/activityApi';
import Badge from '../../components/common/Badge';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState, EmptyState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { staggerStyle } from '../../utils/stagger';
import { formatDateLong, formatDateShort, formatTime, isToday, groupActivitiesByDate } from '../../utils/activityDates';

// Vue planning en lecture seule, partagée par toutes les commissions : mêmes
// activités que /admin/activites, regroupées en agenda par jour plutôt qu'en
// grille de cartes — plus facile à parcourir pour "qu'est-ce qui se passe
// cette semaine", sans les actions de création/modification/suppression
// réservées à it/presidentielle.
export default function PlanningReadOnlyPage() {
  const { data, loading, error, reload } = useFetch(activityApi.listActivities, []);

  const groups = data ? groupActivitiesByDate(data.activities) : [];

  return (
    <div>
      <PageHeader title="Planning" description="Programme de la semaine d'intégration." />

      {loading && <CardListSkeleton />}
      {error && <ErrorState label={error} onRetry={reload} />}
      {!loading && !error && groups.length === 0 && (
        <EmptyState label="Aucune activité configurée." icon={CalendarDays} />
      )}

      {!loading && !error && groups.length > 0 && (
        <div className="flex flex-col">
          {groups.map((group, groupIndex) => (
            <div key={group.date} className="animate-fade-in-up" style={staggerStyle(groupIndex, 60)}>
              <div className="sticky top-0 z-10 -mx-1 flex items-center gap-2 bg-background/95 px-1 py-2 backdrop-blur-sm">
                <h2 className="text-sm font-semibold capitalize text-foreground">{formatDateLong(group.date)}</h2>
                {isToday(group.date) && <Badge variant="info">Aujourd'hui</Badge>}
              </div>

              <ul className="relative ml-2.5 flex flex-col gap-3 border-l-2 border-border pb-2 pl-6">
                {group.items.map((activity) => (
                  <li key={activity.id} className="relative">
                    <span className="absolute -left-[1.85rem] top-1.5 h-3 w-3 rounded-full border-2 border-card bg-role-accent" />
                    <div className="rounded-xl border border-border bg-card p-3.5 shadow-soft">
                      <div className="flex items-baseline gap-2">
                        {activity.start_time && (
                          <span className="shrink-0 text-xs font-semibold tabular-nums text-role-accent">
                            {formatTime(activity.start_time)}
                          </span>
                        )}
                        <p className="font-medium text-foreground">{activity.name}</p>
                      </div>
                      {activity.end_date && activity.end_date !== activity.activity_date && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Jusqu'au {formatDateShort(activity.end_date)}
                        </p>
                      )}
                      {activity.description && (
                        <p className="mt-1.5 text-sm text-muted-foreground">{activity.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
