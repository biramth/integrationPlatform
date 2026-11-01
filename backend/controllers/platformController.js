const db = require('../db/database');
const auditService = require('../services/auditService');
const { invalidateUserCheck } = require('../middleware/auth');

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
// Le stock de médicaments suit la même règle (recorded_by référence users) et
// est de toute façon propre à l'édition en cours, comme le reste effacé ici.
async function resetPlatform(req, res) {
  // Action la plus destructrice de la plateforme : contrairement aux 403/400
  // ordinaires ailleurs (non loggés), une tentative non habilitée ou une
  // phrase de confirmation erronée mérite une trace permanente.
  if (!req.user.canResetPlatform) {
    await auditService.logAction(req, {
      action: 'platform.reset_attempt',
      resourceType: 'platform',
      commission: 'global',
      success: false,
      errorMessage: "Compte non habilité à réinitialiser la plateforme.",
    });
    return res.status(403).json({ error: "Ce compte n'est pas habilité à réinitialiser la plateforme." });
  }

  if (req.body.confirmationPhrase !== CONFIRMATION_PHRASE) {
    await auditService.logAction(req, {
      action: 'platform.reset_attempt',
      resourceType: 'platform',
      commission: 'global',
      success: false,
      errorMessage: 'Phrase de confirmation incorrecte.',
    });
    return res.status(400).json({ error: `Phrase de confirmation incorrecte. Tape exactement : ${CONFIRMATION_PHRASE}` });
  }

  const before = await db.get(`SELECT
    (SELECT COUNT(*) FROM dut1_records) AS dut1_records,
    (SELECT COUNT(*) FROM admitted_students) AS admitted_students,
    (SELECT COUNT(*) FROM rooms) AS rooms,
    (SELECT COUNT(*) FROM meal_services) AS meal_services,
    (SELECT COUNT(*) FROM activities) AS activities,
    (SELECT COUNT(*) FROM users) AS users
  `);

  await db.transaction(async (tx) => {
    await tx.run('DELETE FROM room_assignment_history');
    await tx.run('DELETE FROM dut1_records');
    await tx.run('DELETE FROM admitted_students');
    await tx.run('DELETE FROM rooms');
    await tx.run('DELETE FROM meal_services');
    await tx.run('DELETE FROM activities');
    await tx.run('DELETE FROM medication_movements');
    await tx.run('DELETE FROM medications');
    await tx.run('DELETE FROM users WHERE id != $1', [req.user.id]);
  });

  // Tous les autres comptes viennent d'être supprimés : aucun jeton encore
  // valide ne doit rester accepté par le cache de verifyToken.
  invalidateUserCheck();

  await auditService.logAction(req, {
    action: 'platform.reset',
    resourceType: 'platform',
    commission: 'global',
    before,
    after: { remainingUserId: req.user.id },
  });

  res.json({ success: true });
}

const storage = require('../services/storageService');

let isMigratingStorage = false;

async function getStorageStatus(req, res) {
  const status = await storage.getStorageStatus();
  res.json({
    ...status,
    isMigrating: isMigratingStorage,
  });
}

async function migrateStorageToR2(req, res) {
  if (isMigratingStorage) {
    return res.status(409).json({ error: 'Une migration de stockage est déjà en cours d’exécution.' });
  }

  isMigratingStorage = true;
  const deleteSource = req.body.deleteSource === true;

  try {
    const stats = await storage.migrateSupabaseToR2({ deleteSource });

    await auditService.logAction(req, {
      action: 'storage.migrate_to_r2',
      resourceType: 'storage',
      commission: 'it',
      details: { stats, deleteSource },
    });

    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    isMigratingStorage = false;
  }
}

module.exports = {
  resetPlatform,
  CONFIRMATION_PHRASE,
  getStorageStatus,
  migrateStorageToR2,
};
