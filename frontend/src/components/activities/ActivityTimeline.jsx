import { cn } from '@/lib/utils';
import { buildTimelineDays, formatDayMonth, formatDateShort, isToday, weekdayName } from '../../utils/activityDates';

function TimelineCard({ activity, onSelect }) {
  const Tag = onSelect ? 'button' : 'div';

  return (
    <Tag
      type={onSelect ? 'button' : undefined}
      onClick={onSelect ? () => onSelect(activity) : undefined}
      className={cn(
        'w-full rounded-md border border-l-4 border-tl-mid-border bg-tl-mid px-3 py-2.5 text-left text-tl-mid-foreground shadow-soft transition-[transform,box-shadow]',
        onSelect && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lifted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
      )}
    >
      {activity.start_time && (
        <span className="block text-[0.95rem] font-bold tabular-nums leading-tight">{activity.start_time}</span>
      )}
      <p className={cn('text-sm font-medium leading-snug', activity.start_time && 'mt-1')}>{activity.name}</p>
      {activity.description && <p className="mt-1 text-xs leading-snug opacity-75">{activity.description}</p>}
      {activity.end_date && activity.end_date !== activity.activity_date && (
        <p className="mt-1 text-xs italic opacity-75">jusqu'au {formatDateShort(activity.end_date)}</p>
      )}
    </Tag>
  );
}

function RestCard() {
  return (
    <div className="rounded-md border border-dashed border-tl-low-border px-3 py-2.5 text-sm text-muted-foreground">
      <span className="block font-bold">—</span>
      Repos · pas d'événement
    </div>
  );
}

/**
 * Timeline horizontale "J0 … Jn" : une colonne par jour, reliées par un rail.
 * Défile horizontalement sur petit écran. `onSelect` (optionnel) rend les
 * cartes cliquables — utilisé côté admin pour ouvrir l'édition.
 */
export default function ActivityTimeline({ activities, onSelect }) {
  const days = buildTimelineDays(activities);
  if (days.length === 0) return null;

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-3">
      <div className="grid gap-x-3" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(10.5rem, 1fr))` }}>
        {days.map((day) => {
          const today = isToday(day.date);
          return (
            <section key={day.date} aria-label={`J${day.index} ${weekdayName(day.date)}`} className="flex flex-col">
              {/* Rail + nœud du jour */}
              <div className="relative flex h-8 items-center justify-center" aria-hidden="true">
                <span className="absolute -inset-x-1.5 top-1/2 h-1 -translate-y-1/2 bg-tl-deep" />
                <span
                  className={cn(
                    'relative h-5 w-5 rounded-full border-[3px] border-tl-deep',
                    today ? 'bg-tl-deep ring-4 ring-tl-mid' : 'bg-card'
                  )}
                />
              </div>

              <header
                className={cn(
                  'mt-2 rounded-md bg-tl-header px-3 py-2 text-white',
                  today && 'ring-2 ring-tl-mid-border ring-offset-2 ring-offset-background'
                )}
              >
                <span className="text-base font-extrabold">J{day.index}</span>{' '}
                <span className="text-sm uppercase tracking-wide">{weekdayName(day.date)}</span>
              </header>
              <p className="mb-2 mt-1 text-center text-xs text-muted-foreground">
                {today ? "Aujourd'hui · " : 'Date : '}
                <span className="tabular-nums">{formatDayMonth(day.date)}</span>
              </p>

              <div className="flex flex-col gap-2">
                {day.items.length === 0 ? (
                  <RestCard />
                ) : (
                  day.items.map((activity) => (
                    <TimelineCard key={activity.id} activity={activity} onSelect={onSelect} />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
