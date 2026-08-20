const db = require('../db/database');

const CONFIRMATION_PHRASE = 'RESET PLATEFORME';

// Transmission de la plateforme à la génération IT suivante : efface les
// données propres à l'édition en cours (dossiers DUT1 et tout ce qui en
// dépend, admis importés, chambres, repas, activités) sans toucher aux
// comptes (users) ni à la liste des allergènes (référentiel réutilisable).
// Réservé aux comptes it explicitement habilités (can_reset_platform).
async function resetPlatform(req, res) {
  if (!req.user.canResetPlatform) {
    return res.status(403).json({ error: "Ton compte n'est pas habilité à réinitialiser la plateforme." });
  }

  if (req.body.confirmationPhrase !== CONFIRMATION_PHRASE) {
    return res.status(400).json({ error: `Phrase de confirmation incorrecte. Tape exactement : ${CONFIRMATION_PHRASE}` });
  }

  await db.transaction(async (tx) => {
    await tx.run('DELETE FROM dut1_records');
    await tx.run('DELETE FROM admitted_students');
    await tx.run('DELETE FROM rooms');
    await tx.run('DELETE FROM meal_services');
    await tx.run('DELETE FROM activities');
  });

  res.json({ success: true });
}

module.exports = { resetPlatform, CONFIRMATION_PHRASE };
