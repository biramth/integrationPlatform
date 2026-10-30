const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { comparePassword, hashPassword } = require('../services/passwordService');
const { invalidateUserCheck } = require('../middleware/auth');

async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Identifiant et mot de passe requis.' });
  }

  const user = await db.get('SELECT * FROM users WHERE username = $1', [username]);

  if (!user || !user.is_active || !(await comparePassword(password, user.password_hash))) {
    return res.status(401).json({ error: 'Identifiants incorrects.' });
  }

  const payload = {
    id: user.id,
    fullName: user.full_name,
    username: user.username,
    role: user.role,
    subRole: user.sub_role,
    isCommissionLead: user.is_commission_lead,
    isPoleLead: user.is_pole_lead,
    canResetPlatform: user.can_reset_platform,
    tokenVersion: user.token_version,
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });

  res.json({ token, user: payload });
}

async function me(req, res) {
  const user = await db.get(
    'SELECT id, full_name, username, role, sub_role, is_commission_lead, is_pole_lead, can_reset_platform, is_active FROM users WHERE id = $1',
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
      isPoleLead: user.is_pole_lead,
      canResetPlatform: user.can_reset_platform,
    },
  });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Mot de passe actuel et nouveau mot de passe requis.' });
  }

  // Mêmes règles que agentController : 8+ caractères, au moins une lettre et un chiffre.
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
  }
  if (!/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
    return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins une lettre et un chiffre.' });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ error: 'Le nouveau mot de passe doit être différent de l\'actuel.' });
  }

  const user = await db.get('SELECT id, password_hash FROM users WHERE id = $1', [req.user.id]);
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable.' });
  }

  if (!(await comparePassword(currentPassword, user.password_hash))) {
    return res.status(403).json({ error: 'Le mot de passe actuel est incorrect.' });
  }

  await db.run(
    'UPDATE users SET password_hash = $1, token_version = token_version + 1, updated_at = NOW() WHERE id = $2',
    [await hashPassword(newPassword), req.user.id]
  );
  // L'ancien jeton doit être refusé dès la requête suivante, sans attendre
  // l'expiration du cache de verifyToken.
  invalidateUserCheck(req.user.id);

  // Générer un nouveau token (l'ancien sera rejeté à cause de token_version incrémenté).
  const fullUser = await db.get(
    'SELECT * FROM users WHERE id = $1',
    [req.user.id]
  );
  const payload = {
    id: fullUser.id,
    fullName: fullUser.full_name,
    username: fullUser.username,
    role: fullUser.role,
    subRole: fullUser.sub_role,
    isCommissionLead: fullUser.is_commission_lead,
    isPoleLead: fullUser.is_pole_lead,
    canResetPlatform: fullUser.can_reset_platform,
    tokenVersion: fullUser.token_version,
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });

  res.json({ token, message: 'Mot de passe modifié avec succès.' });
}

module.exports = { login, me, changePassword };
