const { VALID_KEYS, getAllSettings, setSetting } = require('../services/platformSettingsService');
const auditService = require('../services/auditService');

async function listSettings(req, res) {
  res.json({ settings: await getAllSettings() });
}

async function updateSetting(req, res) {
  const { key } = req.params;
  const { enabled } = req.body;
  if (!VALID_KEYS.includes(key)) {
    return res.status(400).json({ error: 'Fonctionnalité inconnue.' });
  }
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled doit être un booléen.' });
  }

  await setSetting(key, enabled, req.user.id);

  await auditService.logAction(req, {
    action: 'platform.toggle_feature',
    resourceType: 'platform_setting',
    resourceId: key,
    resourceLabel: key,
    commission: 'global',
    after: { key, enabled },
  });

  res.json({ settings: await getAllSettings() });
}

module.exports = { listSettings, updateSetting };
