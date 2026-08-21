const db = require('../db/database');
const { hashPassword } = require('../services/passwordService');

const ROLES = ['orga', 'sante', 'cuisine', 'it', 'communication', 'culturelle', 'presidentielle'];
// Sous-rôles valides par commission — NULL = accès à tout le périmètre de la
// commission. Santé : "suivi" (risques, suivi santé, allergènes) et "phase2"
// (complément de dossier, transféré depuis Orga car médical).
const SUB_ROLES_BY_ROLE = {
  orga: ['chambres', 'enregistrement', 'bagages'],
  sante: ['suivi', 'phase2'],
};

function isValidSubRole(role, subRole) {
  return (SUB_ROLES_BY_ROLE[role] || []).includes(subRole);
}

function serialize(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

// it gère tout le monde. Un chef de commission ne gère que les comptes de sa
// propre commission (jamais it, jamais lui-même en promotion).
function canManage(requester, targetRole) {
  if (requester.role === 'it') return true;
  return !!requester.isCommissionLead && requester.role === targetRole;
}

async function listAgents(req, res) {
  const isPrivileged = req.user.role === 'it';
  const agents = isPrivileged
    ? await db.all('SELECT * FROM users ORDER BY full_name ASC')
    : await db.all('SELECT * FROM users WHERE role = $1 ORDER BY full_name ASC', [req.user.role]);
  res.json({ agents: agents.map(serialize) });
}

async function createAgent(req, res) {
  const { fullName, username, password, role } = req.body;
  let { subRole, isCommissionLead, canResetPlatform } = req.body;

  if (!fullName || !username || !password || !role) {
    return res.status(400).json({ error: 'fullName, username, password et role sont requis.' });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: 'role invalide.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }
  if (!canManage(req.user, role)) {
    return res.status(403).json({ error: "Tu ne peux créer un compte que pour ta propre commission." });
  }
  if (subRole && !isValidSubRole(role, subRole)) {
    return res.status(400).json({ error: 'sub_role invalide pour ce rôle.' });
  }
  // Seul it peut désigner un chef de commission ou accorder le droit de
  // réinitialiser la plateforme — un chef de commission ne peut pas
  // s'auto-répliquer ni élever les privilèges d'un compte qu'il crée.
  if (req.user.role !== 'it') {
    isCommissionLead = false;
    canResetPlatform = false;
  }
  if (canResetPlatform && role !== 'it') {
    return res.status(400).json({ error: 'can_reset_platform ne peut être activé que pour un compte it.' });
  }

  try {
    const result = await db.run(
      `INSERT INTO users (full_name, username, password_hash, role, sub_role, is_commission_lead, can_reset_platform)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [fullName, username, hashPassword(password), role, SUB_ROLES_BY_ROLE[role] ? subRole || null : null, !!isCommissionLead, !!canResetPlatform]
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
  if (!canManage(req.user, agent.role)) {
    return res.status(403).json({ error: "Tu ne peux gérer que les comptes de ta propre commission." });
  }

  const { fullName, role, isActive } = req.body;
  let { subRole, isCommissionLead, canResetPlatform } = req.body;
  const isPrivileged = req.user.role === 'it';

  if (role && !ROLES.includes(role)) {
    return res.status(400).json({ error: 'role invalide.' });
  }
  // Un chef de commission ne peut pas changer le rôle d'un agent (ça reviendrait
  // à le faire changer de commission) ni toucher aux drapeaux de privilège.
  if (!isPrivileged) {
    if (role && role !== agent.role) {
      return res.status(403).json({ error: "Seul it peut changer le rôle d'un agent." });
    }
    isCommissionLead = undefined;
    canResetPlatform = undefined;
  }

  const nextRole = role ?? agent.role;
  const nextSubRole = subRole !== undefined ? subRole : agent.sub_role;
  if (nextSubRole && !isValidSubRole(nextRole, nextSubRole)) {
    return res.status(400).json({ error: 'sub_role invalide pour ce rôle.' });
  }
  const nextCanResetPlatform = canResetPlatform !== undefined ? !!canResetPlatform : agent.can_reset_platform;
  if (nextCanResetPlatform && nextRole !== 'it') {
    return res.status(400).json({ error: 'can_reset_platform ne peut être activé que pour un compte it.' });
  }

  await db.run(
    `UPDATE users SET full_name = $1, role = $2, is_active = $3, sub_role = $4,
       is_commission_lead = $5, can_reset_platform = $6, updated_at = NOW() WHERE id = $7`,
    [
      fullName ?? agent.full_name,
      nextRole,
      isActive !== undefined ? !!isActive : agent.is_active,
      SUB_ROLES_BY_ROLE[nextRole] ? nextSubRole || null : null,
      isCommissionLead !== undefined ? !!isCommissionLead : agent.is_commission_lead,
      nextCanResetPlatform,
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

  const agent = await db.get('SELECT role FROM users WHERE id = $1', [id]);
  if (!agent) {
    return res.status(404).json({ error: 'Agent introuvable.' });
  }
  if (!canManage(req.user, agent.role)) {
    return res.status(403).json({ error: "Tu ne peux gérer que les comptes de ta propre commission." });
  }

  await db.run(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [hashPassword(password), id]);
  res.status(204).send();
}

async function deactivateAgent(req, res) {
  const { id } = req.params;
  const agent = await db.get('SELECT role FROM users WHERE id = $1', [id]);
  if (!agent) {
    return res.status(404).json({ error: 'Agent introuvable.' });
  }
  if (!canManage(req.user, agent.role)) {
    return res.status(403).json({ error: "Tu ne peux gérer que les comptes de ta propre commission." });
  }

  await db.run(`UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1`, [id]);
  res.status(204).send();
}

// Suppression définitive du compte — réservée à it (jamais aux chefs de
// commission, action trop sensible). Si l'agent a créé des dossiers/bagages/etc.
// historiques, la FK bloque la suppression : on renvoie un message clair plutôt
// que l'erreur Postgres brute, la désactivation restant l'alternative.
async function hardDeleteAgent(req, res) {
  const { id } = req.params;
  if (Number(id) === req.user.id) {
    return res.status(400).json({ error: 'Tu ne peux pas supprimer ton propre compte.' });
  }

  try {
    const result = await db.run('DELETE FROM users WHERE id = $1', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Agent introuvable.' });
    }
    res.status(204).send();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({
        error:
          'Impossible de supprimer ce compte : il est lié à des dossiers ou actions déjà enregistrés (dossiers DUT1, bagages, activités…). Désactive-le plutôt.',
      });
    }
    throw err;
  }
}

module.exports = { listAgents, createAgent, updateAgent, resetPassword, deactivateAgent, hardDeleteAgent };
