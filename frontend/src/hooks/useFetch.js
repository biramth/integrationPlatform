import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { isConnected as isRealtimeConnected, onDataChanged, onStatusChange } from '../services/realtime';

// Repli si la connexion SSE est indisponible (coupure réseau, serveur qui
// redémarre…) : on repasse en rafraîchissement périodique léger pour ne pas
// revenir à des vues figées. Dès que le flux SSE est reconnecté, l'intervalle
// s'arrête — le push reprend la main.
const FALLBACK_POLL_MS = 30000;

// Un événement temps réel arrive au même instant dans tous les navigateurs
// ouverts : sans étalement, chacun recharge toutes ses listes à la même
// milliseconde et l'API (une petite instance) reçoit tout d'un bloc. On
// répartit les rechargements sur une fenêtre courte, invisible à l'œil.
const REALTIME_JITTER_MS = 1500;

function subscribeConnected(listener) {
  return onStatusChange(listener);
}

export function useFetch(fetcher, deps = [], options = {}) {
  const { pollMs = 0, realtime: enableRealtime = true } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Garde anti-réponse obsolète : seule la dernière requête lancée peut
  // écrire dans le state (sinon un rechargement silencieux lent écraserait
  // un résultat frais arrivé avant lui).
  const seqRef = useRef(0);

  const reload = useCallback(() => {
    const seq = ++seqRef.current;
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => {
        if (seq === seqRef.current) setData(result);
      })
      .catch((err) => {
        if (seq === seqRef.current) setError(err.response?.data?.error || 'Une erreur est survenue.');
      })
      .finally(() => {
        if (seq === seqRef.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
  }, deps);

  // Comme reload, mais sans basculer loading ni effacer les données : la page
  // reste utilisable pendant le rafraîchissement (pas de flash de squelette à
  // chaque événement temps réel), et une erreur transitoire n'efface jamais
  // l'affichage existant.
  const silentReload = useCallback(() => {
    const seq = ++seqRef.current;
    fetcher()
      .then((result) => {
        if (seq === seqRef.current) setData(result);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  const rtConnected = useSyncExternalStore(subscribeConnected, isRealtimeConnected);

  // 1) Push temps réel : chaque lot « data_changed » du serveur déclenche un
  // rafraîchissement silencieux (déjà coalescé côté service realtime), étalé
  // de quelques centaines de ms. Onglet en arrière-plan : on ne recharge pas
  // tout de suite, mais on retient qu'il y a du nouveau et on recharge dès que
  // l'onglet redevient visible (sinon il afficherait des données périmées
  // jusqu'au prochain événement).
  useEffect(() => {
    if (!enableRealtime) return undefined;
    let timer = null;
    let staleWhileHidden = false;

    const scheduleReload = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        silentReload();
      }, Math.random() * REALTIME_JITTER_MS);
    };

    const unsubscribe = onDataChanged(() => {
      if (document.visibilityState === 'visible') scheduleReload();
      else staleWhileHidden = true;
    });

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && staleWhileHidden) {
        staleWhileHidden = false;
        scheduleReload();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
      if (timer) clearTimeout(timer);
    };
  }, [enableRealtime, silentReload]);

  // 2) Polling : soit explicite via options.pollMs (fréquence imposée),
  // soit repli automatique uniquement quand le flux SSE est down.
  const effectivePollMs = pollMs > 0 ? pollMs : !rtConnected && enableRealtime ? FALLBACK_POLL_MS : 0;
  useEffect(() => {
    if (!effectivePollMs) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') silentReload();
    }, effectivePollMs);
    return () => clearInterval(id);
  }, [effectivePollMs, silentReload]);

  return { data, loading, error, reload };
}
