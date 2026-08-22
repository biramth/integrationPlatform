const { getSetting } = require('../services/platformSettingsService');

const DISABLED_MESSAGES = {
  registration: "L'enregistrement des DUT1 est désactivé pour cette édition.",
  phase2: 'Le complément de dossier (phase 2) est désactivé pour cette édition.',
  luggage: 'La photographie et le comptage des bagages sont désactivés pour cette édition.',
  logistics: 'La livraison des bagages en chambre est désactivée pour cette édition.',
};

// Enregistrement, phase 2, bagages et logistique n'ont d'utilité que le
// premier jour — la "journée d'accueil" ne se limite pas à l'enregistrement :
// elle couvre tout le parcours Orga (enregistrement, photo/comptage des
// bagages, puis livraison en chambre). Une fois désactivée par IT, l'action
// est refusée pour TOUT LE MONDE, y compris IT — le but est de figer les
// données contre toute altération accidentelle après coup, pas de garder un
// accès d'urgence (contrairement à requireRole, qui laisse toujours IT passer).
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
