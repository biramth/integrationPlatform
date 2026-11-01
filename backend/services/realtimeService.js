// Hub Server-Sent Events : chaque agent qui a la plateforme ouverte tient une
// connexion SSE vers le serveur ; à chaque mutation métier (diffusée via le
// journal d'audit, cf. auditService.logAction) on prévient tous les navigateurs
// pour qu'ils rafraîchissent leurs listes sans attendre une action de leur part.
//
// Pourquoi SSE et pas WebSocket : le flux est strictement unidirectionnel
// (serveur → client, « des données ont changé, recharge-toi »), SSE suffit,
// passe par le HTTP standard (compatible Render/Vercel/proxies) et se
// reconnecte tout seul côté navigateur.
//
// Les événements sont coalesqués : pendant un import Excel ou une salve de
// saisies, dix mutations en une seconde ne doivent déclencher qu'UN seul
// rechargement par page — on bufferise donc au plus 1 seconde avant d'émettre.

const clients = new Map();
let nextClientId = 1;
let pendingChanges = [];
let flushTimer = null;

const FLUSH_DELAY_MS = 3000;
const HEARTBEAT_INTERVAL_MS = 30000;
// Garde-fou : un import massif peut générer des centaines de lignes d'audit en
// quelques secondes — inutile de bufferiser un résumé infini, on borne.
const MAX_PENDING_CHANGES = 50;

function writeEvent(res, payload) {
  try {
    res.write(payload);
    return true;
  } catch {
    return false;
  }
}

function removeClient(id) {
  clients.delete(id);
}

// Ouvre le flux SSE pour cette requête. Le client est déjà authentifié
// (verifyToken dans la route) — EventSource ne sachant pas poser d'en-tête
// Authorization, le jeton voyage en query param côté front.
function addClient(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Empêche les buffers type nginx/Render proxy de retenir le stream.
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  // retry : si la connexion tombe, le navigateur retentera après 3 s.
  writeEvent(res, 'retry: 3000\n\n');
  // Commentaire initial : force l'événement onopen côté navigateur même si
  // aucune donnée n'a encore changé.
  writeEvent(res, `: connecté ${new Date().toISOString()}\n\n`);

  const id = nextClientId++;
  clients.set(id, res);

  req.on('close', () => removeClient(id));
}

function flushPending() {
  flushTimer = null;
  if (pendingChanges.length === 0 || clients.size === 0) {
    pendingChanges = [];
    return;
  }
  const changes = pendingChanges.slice(0, MAX_PENDING_CHANGES);
  const hasMore = pendingChanges.length > MAX_PENDING_CHANGES;
  pendingChanges = [];

  const data = JSON.stringify({ changes, truncated: hasMore });
  const frame = `event: data_changed\ndata: ${data}\n\n`;

  for (const [id, res] of clients) {
    if (!writeEvent(res, frame)) {
      removeClient(id);
    }
  }
}

// Appelé après chaque mutation réussie. Ne lève jamais : le temps réel est un
// confort, il ne doit jamais faire échouer l'action métier déjà commitée.
function broadcastDataChanged(change) {
  pendingChanges.push({
    action: change.action,
    resourceType: change.resourceType ?? null,
    commission: change.commission ?? null,
    at: new Date().toISOString(),
  });

  if (!flushTimer) {
    flushTimer = setTimeout(flushPending, FLUSH_DELAY_MS);
  }
  // En cas de test/process avec timer unref : ne pas empêcher l'arrêt propre.
  flushTimer.unref?.();
}

// Ping périodique : maintient ouvertes les connexions à travers les proxies et
// détecte les clients morts (Render ferme les flux inactifs).
setInterval(() => {
  for (const [id, res] of clients) {
    if (!writeEvent(res, ': ping\n\n')) {
      removeClient(id);
    }
  }
}, HEARTBEAT_INTERVAL_MS).unref?.();

module.exports = { addClient, broadcastDataChanged };
