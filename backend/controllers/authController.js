const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { comparePassword } = require('../services/passwordService');

function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Identifiant et mot de passe requis.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user || !user.is_active || !comparePassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Identifiants incorrects.' });
  }

  const payload = { id: user.id, fullName: user.full_name, username: user.username, role: user.role };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });

  res.json({ token, user: payload });
}

function me(req, res) {
  const user = db.prepare('SELECT id, full_name, username, role, is_active FROM users WHERE id = ?').get(req.user.id);

  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Compte introuvable ou désactivé.' });
  }

  res.json({ user: { id: user.id, fullName: user.full_name, username: user.username, role: user.role } });
}

module.exports = { login, me };
