require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { BUCKET } = require('../services/storageService');

async function setupStorage() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  if (buckets.some((b) => b.name === BUCKET)) {
    console.log(`Bucket "${BUCKET}" déjà existant.`);
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: '10MB',
  });
  if (createError) throw createError;

  console.log(`Bucket "${BUCKET}" créé (privé).`);
}

setupStorage().catch((err) => {
  console.error(err);
  process.exit(1);
});
