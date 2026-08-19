const db = require('../db/database');
const { hashPassword } = require('../services/passwordService');

function serialize(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

async function listAgents(req, res) {
  const agents = await db.all('SELECT * FROM users ORDER BY full_name ASC');
  res.json({ agents: agents.map(serialize) });
}

async function createAgent(req, res) {
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
    const result = await db.run(
      'INSERT INTO users (full_name, username, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [fullName, username, hashPassword(password), role]
    );

    const agent = await db.get('SELECT * FROM users WHERE id = $1', [result.rows[0].id]);
    res.status(201).json({ agent: serialize(agent) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: "Ce nom d'utilisateur existe déjà." });
    }
    throw err;
  }
}

async function updateAgent(req, res) {
  const { id } = req.params;
  const agent = await db.get('SELECT * FROM users WHERE id = $1', [id]);
  if (!agent) {
    return res.status(404).json({ error: 'Agent introuvable.' });
  }

  const { fullName, role, isActive } = req.body;
  if (role && !['registrar', 'logistics', 'admin', 'sante', 'cuisine'].includes(role)) {
    return res.status(400).json({ error: 'role invalide.' });
  }

  await db.run(
    `UPDATE users SET full_name = $1, role = $2, is_active = $3, updated_at = NOW() WHERE id = $4`,
    [
      fullName ?? agent.full_name,
      role ?? agent.role,
      isActive !== undefined ? !!isActive : agent.is_active,
      id,
    ]
  );

  res.json({ agent: serialize(await db.get('SELECT * FROM users WHERE id = $1', [id])) });
}

async function resetPassword(req, res) {
  const { id } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }

  const result = await db.run(
    `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
    [hashPassword(password), id]
  );

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Agent introuvable.' });
  }

  res.status(204).send();
}

async function deactivateAgent(req, res) {
  const result = await db.run(
    `UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
    [req.params.id]
  );

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Agent introuvable.' });
  }

  res.status(204).send();
}

module.exports = { listAgents, createAgent, updateAgent, resetPassword, deactivateAgent };
