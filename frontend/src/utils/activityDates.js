const WEEKDAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

// Construit la date à partir des composants Y/M/D en heure locale (jamais via
// `new Date(isoString)`, qui parse en UTC et peut afficher la veille/le
// lendemain selon le fuseau du navigateur — même piège que birth_date ailleurs
// dans l'appli).
function parseLocalDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateLong(iso) {
  const date = parseLocalDate(iso);
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function formatDateShort(iso) {
  const date = parseLocalDate(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

// "08:00" -> "8h" / "14:30" -> "14h30" (format horaire francophone courant).
export function formatTime(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':');
  const hour = Number(h);
  return m && m !== '00' ? `${hour}h${m}` : `${hour}h`;
}

export function isToday(iso) {
  const date = parseLocalDate(iso);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
  );
}

// Regroupe une liste d'activités (déjà triée par activity_date par l'API) par
// jour, pour un rendu en agenda plutôt qu'une simple grille de cartes.
export function groupActivitiesByDate(activities) {
  const groups = new Map();
  for (const activity of activities) {
    if (!groups.has(activity.activity_date)) {
      groups.set(activity.activity_date, []);
    }
    groups.get(activity.activity_date).push(activity);
  }
  return [...groups.entries()].map(([date, items]) => ({ date, items }));
}

function toIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function weekdayName(iso) {
  return WEEKDAYS[parseLocalDate(iso).getDay()];
}

// "2026-10-18" -> "18/10"
export function formatDayMonth(iso) {
  const date = parseLocalDate(iso);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Colonnes de la timeline "J0 … Jn" : un jour par colonne, du premier au
// dernier jour programmé. Les jours sans activité restent affichés (colonne
// « Repos ») pour que la semaine se lise d'un bloc, sauf si l'écart entre deux
// dates dépasse MAX_GAP_DAYS : on n'affiche alors que les jours programmés,
// pour ne pas étaler des dizaines de colonnes vides.
const MAX_GAP_DAYS = 6;

export function buildTimelineDays(activities) {
  const groups = groupActivitiesByDate(activities);
  if (groups.length === 0) return [];

  const byDate = new Map(groups.map((g) => [g.date, g.items]));
  const days = [];
  for (let i = 0; i < groups.length; i++) {
    days.push(groups[i].date);
    if (i === groups.length - 1) break;
    const cursor = parseLocalDate(groups[i].date);
    const next = parseLocalDate(groups[i + 1].date);
    const gap = Math.round((next - cursor) / 86400000) - 1;
    if (gap > 0 && gap <= MAX_GAP_DAYS) {
      for (let k = 1; k <= gap; k++) {
        days.push(toIso(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + k)));
      }
    }
  }

  return days.map((date, index) => ({ index, date, items: byDate.get(date) || [] }));
}
