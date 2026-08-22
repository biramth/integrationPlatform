const db = require('../db/database');

const VALID_KEYS = ['registration', 'phase2'];

async function getSetting(key) {
  const row = await db.get('SELECT enabled FROM platform_settings WHERE key = $1', [key]);
  return row ? row.enabled : true;
}

async function getAllSettings() {
  const rows = await db.all('SELECT key, enabled FROM platform_settings');
  return Object.fromEntries(rows.map((r) => [r.key, r.enabled]));
}

async function setSetting(key, enabled, userId) {
  await db.run(
    `INSERT INTO platform_settings (key, enabled, updated_at, updated_by)
     VALUES ($1, $2, NOW(), $3)
     ON CONFLICT (key) DO UPDATE SET enabled = $2, updated_at = NOW(), updated_by = $3`,
    [key, enabled, userId]
  );
}

module.exports = { VALID_KEYS, getSetting, getAllSettings, setSetting };
