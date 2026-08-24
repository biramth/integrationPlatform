// Correspondance tolérante entre noms propres. Le fichier officiel des admis
// passe souvent par un convertisseur PDF→Excel qui déforme les noms africains
// ("Mame" → "Marne") — aucune OCR n'est fiable sur ces listes. À l'inverse, la
// saisie de l'agent vient de la pièce d'identité du DUT1 : c'est la source de
// vérité. Ces helpers servent à rattraper les écarts au lieu de faire échouer
// une association ou masquer un doublon.

function normalizeName(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Distance d'édition classique (insertion/suppression/substitution).
function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// Tolérance croissante avec la longueur : une erreur sur 4 lettres est plus
// significative qu'une sur 10 ("Mame"→"Marne", dist 1, est détecté sans
// ouvrir la porte à des rapprochements hasardeux).
function toleranceFor(length) {
  if (length <= 4) return 1;
  if (length <= 9) return 2;
  return 3;
}

function namesSimilar(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return levenshtein(na, nb) <= toleranceFor(Math.max(na.length, nb.length));
}

function tokenize(text) {
  return normalizeName(text)
    .split(' ')
    .filter((t) => t.length >= 2);
}

// Chaque token recherché doit trouver un pendant dans le nom stocké — sinon
// null. Retourne la somme des distances (plus petit = plus proche), utilisée
// pour trier les suggestions floues. "mame ndiaye" ne matche pas "awa marne"
// mais rattrape "marne ndiaye".
function nameTokensOverlap(queryText, storedText) {
  const queryTokens = tokenize(queryText);
  const storedTokens = tokenize(storedText);
  if (!queryTokens.length || !storedTokens.length) return null;
  let score = 0;
  for (const qt of queryTokens) {
    let best = Infinity;
    for (const st of storedTokens) {
      const distance = qt === st ? 0 : levenshtein(qt, st);
      if (distance <= toleranceFor(Math.max(qt.length, st.length)) && distance < best) best = distance;
    }
    if (best === Infinity) return null;
    score += best;
  }
  return score;
}

module.exports = { normalizeName, levenshtein, toleranceFor, namesSimilar, nameTokensOverlap };
