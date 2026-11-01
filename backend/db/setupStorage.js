require('dotenv').config();
const { BUCKET, isR2, isSupabase } = require('../services/storageService');

async function setupStorage() {
  if (isR2) {
    console.log(`[setupStorage] Cloudflare R2 configuré pour le bucket "${BUCKET}".`);
    return;
  }

  if (isSupabase && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.warn(`[setupStorage] Impossible de lister les buckets Supabase : ${listError.message}`);
      return;
    }

    if (buckets && buckets.some((b) => b.name === BUCKET)) {
      console.log(`Bucket Supabase "${BUCKET}" déjà existant.`);
      return;
    }

    const { error: createError } = await supabase.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: '10MB',
    });
    if (createError) {
      console.warn(`[setupStorage] Impossible de créer le bucket Supabase : ${createError.message}`);
      return;
    }

    console.log(`Bucket Supabase "${BUCKET}" créé (privé).`);
    return;
  }

  console.log('[setupStorage] Aucun fournisseur cloud distant détecté — étape ignorée.');
}

setupStorage().catch((err) => {
  console.warn('[setupStorage] Avertissement non bloquant :', err.message);
});
