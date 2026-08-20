const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { comparePassword } = require('../services/passwordService');

async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Identifiant et mot de passe requis.' });
  }

  const user = await db.get('SELECT * FROM users WHERE username = $1', [username]);

  if (!user || !user.is_active || !comparePassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Identifiants incorrects.' });
  }

  const payload = {
    id: user.id,
    fullName: user.full_name,
    username: user.username,
    role: user.role,
    subRole: user.sub_role,
    isCommissionLead: user.is_commission_lead,
    canResetPlatform: user.can_reset_platform,
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });

  res.json({ token, user: payload });
}

async function me(req, res) {
  const user = await db.get(
    'SELECT id, full_name, username, role, sub_role, is_commission_lead, can_reset_platform, is_active FROM users WHERE id = $1',
    [req.user.id]
  );

  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Compte introuvable ou désactivé.' });
  }

  res.json({
    user: {
      id: user.id,
      fullName: user.full_name,
      username: user.username,
      role: user.role,
      subRole: user.sub_role,
      isCommissionLead: user.is_commission_lead,
      canResetPlatform: user.can_reset_platform,
    },
  });
}

module.exports = { login, me };
