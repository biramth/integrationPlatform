#!/usr/bin/env node
/**
 * Script de transfert des photos de bagages depuis Supabase Storage vers Cloudflare R2.
 *
 * Utilisation :
 *   node backend/scripts/migrateStorageToR2.js [--delete-source]
 *
 * Options :
 *   --delete-source : Supprime les photos transférées de Supabase Storage pour libérer l'espace.
 */
require('dotenv').config();
const storage = require('../services/storageService');

async function main() {
  const deleteSource = process.argv.includes('--delete-source');

  console.log('====================================================');
  console.log('   MIGRATION PHOTOS : SUPABASE STORAGE -> CLOUDFLARE R2');
  console.log('====================================================\n');

  console.log(`Cloudflare R2 configuré : ${storage.isR2 ? 'OUI' : 'NON'} (bucket: "${storage.R2_BUCKET}")`);
  console.log(`Supabase Storage configuré : ${storage.isSupabase ? 'OUI' : 'NON'} (bucket: "${storage.SUPABASE_BUCKET}")`);
  console.log(`Option suppression source : ${deleteSource ? 'ACTIVÉE' : 'DÉSACTIVÉE (conservation source)'}\n`);

  if (!storage.isR2) {
    console.error('Erreur : Clés Cloudflare R2 manquantes.');
    console.error('Veuillez définir R2_ACCOUNT_ID, R2_ACCESS_KEY_ID et R2_SECRET_ACCESS_KEY.');
    process.exit(1);
  }

  if (!storage.isSupabase) {
    console.error('Erreur : Clés Supabase manquantes.');
    console.error('Veuillez définir SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  console.log('Démarrage du transfert...\n');

  let lastReported = 0;
  const startTime = Date.now();

  const stats = await storage.migrateSupabaseToR2({
    deleteSource,
    onProgress(progress) {
      const processed = progress.migrated + progress.alreadyInR2 + progress.failed;
      if (processed - lastReported >= 5 || processed === progress.total) {
        lastReported = processed;
        process.stdout.write(
          `\r[Progression] ${processed}/${progress.total} (Migrés: ${progress.migrated}, Déjà sur R2: ${progress.alreadyInR2}, Échecs: ${progress.failed})`
        );
      }
    },
  });

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  console.log('\n\n====================================================');
  console.log('                 RÉSULTAT DU TRANSFERT              ');
  console.log('====================================================');
  console.log(`Total photos en base : ${stats.total}`);
  console.log(`Transférées vers R2  : ${stats.migrated}`);
  console.log(`Déjà présentes sur R2: ${stats.alreadyInR2}`);
  console.log(`Échecs               : ${stats.failed}`);
  if (deleteSource) {
    console.log(`Supprimées de Supabase : ${stats.deletedFromSource}`);
  }
  console.log(`Durée                : ${durationSec}s`);

  if (stats.errors.length > 0) {
    console.log('\nDétail des erreurs :');
    stats.errors.forEach((e) => console.log(` - Photo ID ${e.id} (${e.path}): ${e.error}`));
  }

  console.log('\nMigration terminée avec succès.');
  process.exit(stats.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('\nErreur fatale lors de la migration :', err);
  process.exit(1);
});
