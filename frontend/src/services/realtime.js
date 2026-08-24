// Connexion SSE unique pour toute l'application : le serveur pousse un
// événement « data_changed » après chaque mutation réussie, et toutes les
// pages abonnées (via useFetch) rafraîchissent silencieusement leurs données.
//
// - Un seul EventSource pour toute la session, ouvert à la connexion (cf.
//   AuthContext) et fermé à la déconnexion.
// - Reconnexion automatique avec backoff exponentiel (le retry natif du
//   navigateur ne suffit pas quand la connexion est fermée définitivement,
//   ex. token expiré ou coupure Render).
// - Coalescing global : une salve de mutations n'émet qu'un lot toutes les
//   800 ms vers les abonnés — les imports massifs ne provoquent pas d'avalanche
//   de rechargements.

const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
const EVENTS_URL = `${apiUrl}/api/events`;

const FLUSH_INTERVAL_MS = 800;
const BACKOFF_INITIAL_MS = 1000;
const BACKOFF_MAX_MS = 60000;

let source = null;
let currentToken = null;
let reconnectTimer = null;
let backoffMs = BACKOFF_INITIAL_MS;

let connected = false;
const pendingChanges = [];
let flushTimer = null;

const dataListeners = new Set();
const statusListeners = new Set();

export function isConnected() {
  return connected;
}

export function onStatusChange(listener) {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

// S'abonner aux lots de changements. Retourne la fonction de désabonnement.
export function onDataChanged(listener) {
  dataListeners.add(listener);
  return () => dataListeners.delete(listener);
}

function setStatus(next) {
  if (connected === next) return;
  connected = next;
  for (const listener of statusListeners) listener(connected);
}

function flushPendingChanges() {
  flushTimer = null;
  if (pendingChanges.length === 0) return;
  const batch = pendingChanges.splice(0);
  for (const listener of dataListeners) {
    try {
      listener(batch);
    } catch {
      // Un listener défaillant ne doit jamais casser la diffusion.
    }
  }
}

function handleEvent(e) {
  let parsed;
  try {
    parsed = JSON.parse(e.data);
  } catch {
    parsed = { changes: [] };
  }
  pendingChanges.push(...(parsed.changes || []));
  if (!flushTimer) {
    flushTimer = setTimeout(flushPendingChanges, FLUSH_INTERVAL_MS);
  }
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect() {
  clearReconnectTimer();
  if (!currentToken) return;
  reconnectTimer = setTimeout(() => openConnection(), backoffMs);
  backoffMs = Math.min(backoffMs * 2, BACKOFF_MAX_MS);
}

function openConnection() {
  // Token expiré entre-temps (déconnexion) : on n'insiste pas.
  if (!currentToken) return;
  source?.close();

  source = new EventSource(`${EVENTS_URL}?token=${encodeURIComponent(currentToken)}`);

  source.onopen = () => {
    backoffMs = BACKOFF_INITIAL_MS;
    setStatus(true);
  };

  source.addEventListener('data_changed', handleEvent);

  source.onerror = () => {
    setStatus(false);
    // readyState CLOSED = le navigateur a abandonné (réponse non event-stream,
    // ex. 401/403/503) : il ne retentera jamais seul, on prend le relais.
    // Sinon (CONNECTING), le retry natif tourne déjà, on laisse faire.
    if (source && source.readyState === EventSource.CLOSED) {
      source = null;
      scheduleReconnect();
    }
  };
}

// À appeler au login (et au démarrage avec un token stocké). Remplace toute
// connexion existante si le token a changé.
export function connectRealtime(token) {
  if (!token || !window.EventSource) return;
  if (source && currentToken === token) return;
  currentToken = token;
  backoffMs = BACKOFF_INITIAL_MS;
  openConnection();
}

// À appeler à la déconnexion.
export function disconnectRealtime() {
  currentToken = null;
  clearReconnectTimer();
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  pendingChanges.length = 0;
  source?.close();
  source = null;
  setStatus(false);
}
