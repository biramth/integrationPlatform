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
