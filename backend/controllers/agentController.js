const db = require('../db/database');
const { hashPassword } = require('../services/passwordService');

function serialize(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

function listAgents(req, res) {
  const agents = db
    .prepare('SELECT * FROM users ORDER BY full_name ASC')
    .all();
  res.json({ agents: agents.map(serialize) });
}

function createAgent(req, res) {
  const { fullName, username, password, role } = req.body;

  if (!fullName || !username || !password || !role) {
    return res.status(400).json({ error: 'fullName, username, password et role sont requis.' });
  }
  if (!['registrar', 'logistics', 'admin', 'sante', 'cuisine'].includes(role)) {
    return res.status(400).json({ error: 'role invalide.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }

  try {
    const result = db
      .prepare('INSERT INTO users (full_name, username, password_hash, role) VALUES (?, ?, ?, ?)')
      .run(fullName, username, hashPassword(password), role);

    const agent = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ agent: serialize(agent) });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Ce nom d\'utilisateur existe déjà.' });
    }
    throw err;
  }
}

function updateAgent(req, res) {
  const { id } = req.params;
  const agent = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent introuvable.' });
  }

  const { fullName, role, isActive } = req.body;
  if (role && !['registrar', 'logistics', 'admin', 'sante', 'cuisine'].includes(role)) {
    return res.status(400).json({ error: 'role invalide.' });
  }

  db.prepare(
    `UPDATE users SET full_name = ?, role = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(
    fullName ?? agent.full_name,
    role ?? agent.role,
    isActive !== undefined ? (isActive ? 1 : 0) : agent.is_active,
    id
  );

  res.json({ agent: serialize(db.prepare('SELECT * FROM users WHERE id = ?').get(id)) });
}

function resetPassword(req, res) {
  const { id } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }

  const result = db
    .prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(hashPassword(password), id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Agent introuvable.' });
  }

  res.status(204).send();
}

function deactivateAgent(req, res) {
  const result = db
    .prepare(`UPDATE users SET is_active = 0, updated_at = datetime('now') WHERE id = ?`)
    .run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Agent introuvable.' });
  }

  res.status(204).send();
}

module.exports = { listAgents, createAgent, updateAgent, resetPassword, deactivateAgent };
