import { cn } from '@/lib/utils';
import { buildTimelineDays, formatDayMonth, formatDateShort, isToday, weekdayName } from '../../utils/activityDates';

function importanceMark(importance) {
  const n = Number(importance ?? 2);
  return n <= 0 ? '+' : '★'.repeat(Math.min(n, 3));
}

function cardTone(activity) {
  if (activity.highlight) {
    return 'border-tl-highlight-border bg-tl-highlight text-white';
  }
  switch (Number(activity.importance ?? 2)) {
    case 3:
      return 'border-tl-deep-border bg-tl-deep text-white';
    case 1:
      return 'border-tl-low-border border-l-4 bg-tl-low text-foreground';
    case 0:
      return 'border-dashed border-tl-deep border-l-4 bg-card text-foreground';
    default:
      return 'border-tl-mid-border border-l-4 bg-tl-mid text-tl-mid-foreground';
  }
}

function TimelineCard({ activity, onSelect }) {
  const time = activity.time_label || activity.start_time || '—';
  const Tag = onSelect ? 'button' : 'div';
  const inverted = activity.highlight || Number(activity.importance ?? 2) === 3;

  return (
    <Tag
      type={onSelect ? 'button' : undefined}
      onClick={onSelect ? () => onSelect(activity) : undefined}
      className={cn(
        'w-full rounded-md border px-3 py-2.5 text-left shadow-soft transition-[transform,box-shadow]',
        onSelect && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lifted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        cardTone(activity)
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[0.95rem] font-bold tabular-nums leading-tight">{time}</span>
        <span
          className={cn('shrink-0 text-[0.7rem] leading-tight tracking-tight', inverted ? 'text-white/90' : 'opacity-70')}
          aria-label={Number(activity.importance) === 0 ? 'Optionnel' : `Importance ${activity.importance ?? 2} sur 3`}
        >
          {importanceMark(activity.importance)}
        </span>
      </div>
      <p className={cn('mt-1 text-sm leading-snug', activity.highlight ? 'font-bold uppercase' : 'font-medium')}>
        {activity.name}
      </p>
      {activity.description && (
        <p className={cn('mt-1 text-xs leading-snug', inverted ? 'text-white/80' : 'opacity-75')}>
          {activity.description}
        </p>
      )}
      {activity.end_date && activity.end_date !== activity.activity_date && (
        <p className={cn('mt-1 text-xs italic', inverted ? 'text-white/80' : 'opacity-75')}>
          jusqu'au {formatDateShort(activity.end_date)}
        </p>
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
 * Timeline horizontale "J0 … Jn" : une colonne par jour, reliées par un rail,
 * chaque activité en carte colorée selon son importance. Défile
 * horizontalement sur petit écran. `onSelect` (optionnel) rend les cartes
 * cliquables — utilisé côté admin pour ouvrir l'édition.
 */
export default function ActivityTimeline({ activities, onSelect }) {
  const days = buildTimelineDays(activities);
  if (days.length === 0) return null;

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-3">
      <div
        className="grid gap-x-3"
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(10.5rem, 1fr))` }}
      >
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

export function ActivityTimelineLegend() {
  const items = [
    { mark: '★★★', label: 'Incontournable', className: 'border-tl-deep-border bg-tl-deep text-white' },
    { mark: '★★', label: 'Important', className: 'border-tl-mid-border border-l-4 bg-tl-mid text-tl-mid-foreground' },
    { mark: '★', label: 'Secondaire', className: 'border-tl-low-border border-l-4 bg-tl-low text-foreground' },
    { mark: '+', label: 'Optionnel', className: 'border-dashed border-tl-deep border-l-4 bg-card text-foreground' },
    { mark: '!', label: 'Temps fort', className: 'border-tl-highlight-border bg-tl-highlight text-white' },
  ];
  return (
    <ul className="mb-4 flex flex-wrap gap-2 text-xs">
      {items.map((item) => (
        <li key={item.label} className={cn('flex items-center gap-1.5 rounded border px-2 py-1', item.className)}>
          <span className="font-semibold">{item.mark}</span>
          {item.label}
        </li>
      ))}
    </ul>
  );
}
