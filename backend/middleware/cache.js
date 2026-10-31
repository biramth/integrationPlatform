// Cache en mémoire avec TTL : pas de dépendance externe, adapté à une seule
// instance Render. Chaque clé expire après `ttlMs` millisecondes.
//
// Invalidation : toute mutation réussie passe par auditService.logAction, qui
// appelle invalidateAll() — la même source que le signal temps réel. Ainsi,
// quand les navigateurs rechargent après un événement « data_changed », ils
// obtiennent toujours la donnée à jour, jamais une réponse mise en cache juste
// avant la modification.

const store = new Map();
// Requêtes en cours de calcul, par clé : quand 100 navigateurs rechargent la
// même liste au même instant (événement temps réel), une seule requête SQL
// part, les autres attendent son résultat.
const inflight = new Map();
// Incrémenté à chaque invalidation : une réponse calculée AVANT une
// invalidation ne doit pas être remise en cache APRÈS (elle serait périmée).
let generation = 0;

function get(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

function set(key, value, ttlMs) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function invalidate(prefix) {
  generation++;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

function invalidateAll() {
  generation++;
  store.clear();
}

// Nettoyage périodique des entrées expirées ( toutes les 60s )
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) store.delete(key);
  }
}, 60_000).unref?.();

// La clé inclut le rôle (et le sous-rôle) : certaines réponses dépendent de
// qui demande — ex. /api/dut1 retire les champs médicaux pour les rôles non
// médicaux. Sans ça, une réponse calculée pour Santé pouvait être resservie
// telle quelle à Communication pendant la durée du TTL.
function cacheKey(req) {
  const role = req.user?.role ?? '-';
  const subRole = req.user?.subRole ?? '-';
  return `${req.baseUrl}${req.path}:${JSON.stringify(req.query)}|${role}|${subRole}`;
}

// Middleware : router.get('/overview', cached(30_000), statsController.overview);
function cached(ttlMs) {
  return (req, res, next) => {
    const key = cacheKey(req);
    const entry = get(key);
    if (entry !== undefined) {
      return res.json(entry);
    }

    const waiting = inflight.get(key);
    if (waiting) {
      return waiting.then((body) => (body !== undefined ? res.json(body) : next()));
    }

    let resolveInflight;
    const promise = new Promise((resolve) => {
      resolveInflight = resolve;
    });
    inflight.set(key, promise);
    const startedAt = generation;
    let settled = false;
    const settle = (body) => {
      if (settled) return;
      settled = true;
      if (inflight.get(key) === promise) inflight.delete(key);
      resolveInflight(body);
    };

    // Intercepte res.json pour capturer la réponse
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Réponse à jour seulement si aucune modification n'a eu lieu pendant
      // le calcul ; sinon ni mise en cache, ni partage avec les requêtes en
      // attente (elles referont leur propre calcul, avec la donnée fraîche).
      const fresh = res.statusCode >= 200 && res.statusCode < 300 && startedAt === generation;
      if (fresh) {
        set(key, body, ttlMs);
      }
      settle(fresh ? body : undefined);
      return originalJson(body);
    };
    // Réponse terminée sans passer par res.json (erreur, client parti…) :
    // on libère les requêtes en attente, qui feront leur propre calcul.
    res.on('close', () => settle(undefined));
    next();
  };
}

module.exports = { get, set, invalidate, invalidateAll, cacheKey, cached };
