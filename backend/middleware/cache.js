// Cache en mémoire avec TTL : pas de dépendance externe, parfait pour ≤50
// utilisateurs simultanés. Chaque clé expire après `ttlMs` millisecondes ;
// les mutations appelant `invalidate(prefix)` purgent les entrées concernées.

const store = new Map();

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
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

// Nettoyage périodique des entrées expirées ( toutes les 60s )
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) store.delete(key);
  }
}, 60_000);

// Middleware Express : cache(req, ttlMs) → retourne le TTL à passer à res.json
// Usage dans un controller :
//   const cached = cache(req, 30_000);
//   if (cached) return res.json(cached);
//   res.json(data);
//   store.set(cacheKey(req), data, 30_000);
//
// Ou middleware automatique :
//   router.get('/overview', cached(30_000), statsController.overview);
function cacheKey(req) {
  return `${req.baseUrl}${req.path}:${JSON.stringify(req.query)}`;
}

function cached(ttlMs, prefix) {
  return (req, res, next) => {
    const key = cacheKey(req);
    const entry = get(key);
    if (entry) {
      return res.json(entry);
    }
    // Intercepte res.json pour capturer la réponse
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        set(key, body, ttlMs);
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { get, set, invalidate, cacheKey, cached };
