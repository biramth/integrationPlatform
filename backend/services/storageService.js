const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const BUCKET = 'luggage-photos';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function extensionFor(file) {
  const fromName = (file.originalname.match(/\.[a-zA-Z0-9]+$/) || [])[0];
  return fromName || '.jpg';
}

async function uploadLuggagePhoto(dut1Id, file) {
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extensionFor(file)}`;
  const objectPath = `${dut1Id}/${unique}`;

  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });

  if (error) {
    throw new Error(`Échec de l'upload vers Supabase Storage : ${error.message}`);
  }

  return objectPath;
}

async function deleteLuggagePhoto(objectPath) {
  const { error } = await supabase.storage.from(BUCKET).remove([objectPath]);
  if (error) {
    throw new Error(`Échec de la suppression sur Supabase Storage : ${error.message}`);
  }
}

async function getSignedUrl(objectPath, expiresInSeconds = 300) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(objectPath, expiresInSeconds);
  if (error) {
    throw new Error(`Échec de la génération de l'URL signée : ${error.message}`);
  }
  return data.signedUrl;
}

module.exports = { uploadLuggagePhoto, deleteLuggagePhoto, getSignedUrl, BUCKET };
