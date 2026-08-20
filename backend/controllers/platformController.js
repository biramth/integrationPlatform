const db = require('../db/database');

const CONFIRMATION_PHRASE = 'RESET PLATEFORME';

// Transmission de la plateforme à la génération IT suivante : reset complet.
// Efface les données propres à l'édition en cours (dossiers DUT1 et tout ce
// qui en dépend, admis importés, chambres, repas, activités) ET tous les
// comptes agents de la génération sortante — seul le compte qui déclenche le
// reset survit, pour pouvoir créer les comptes de la nouvelle génération IT
// juste après. La liste des allergènes (référentiel réutilisable, pas propre
// à une édition) est conservée. Réservé aux comptes it explicitement
// habilités (can_reset_platform).
//
// Ordre important : les dossiers/admis/repas/activités sont effacés AVANT les
// comptes, pour que plus rien ne référence un user (created_by, uploaded_by,
// declared_by…) au moment du DELETE FROM users — sinon les FK bloqueraient.
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
    await tx.run('DELETE FROM users WHERE id != $1', [req.user.id]);
  });

  res.json({ success: true });
}

module.exports = { resetPlatform, CONFIRMATION_PHRASE };
