const { getSetting } = require('../services/platformSettingsService');

const DISABLED_MESSAGES = {
  registration: "L'enregistrement des DUT1 est désactivé pour cette édition.",
  phase2: 'Le complément de dossier (phase 2) est désactivé pour cette édition.',
};

// Enregistrement et phase 2 n'ont d'utilité que le premier jour : une fois
// désactivés par IT, l'action est refusée pour TOUT LE MONDE, y compris IT —
// le but est de figer les données contre toute altération accidentelle après
// coup, pas de garder un accès d'urgence (contrairement à requireRole, qui
// laisse toujours IT passer).
function requireFeatureEnabled(key) {
  return async (req, res, next) => {
    const enabled = await getSetting(key);
    if (!enabled) {
      return res.status(403).json({ error: DISABLED_MESSAGES[key] || 'Fonctionnalité désactivée pour cette édition.' });
    }
    next();
  };
}

module.exports = { requireFeatureEnabled };
