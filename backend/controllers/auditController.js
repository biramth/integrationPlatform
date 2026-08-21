const db = require('../db/database');

// Un chef de commission ne voit que les lignes de sa propre commission
// (domaine de la ressource touchée, pas l'acteur) — appliqué ici, jamais côté
// client, en écrasant tout ?commission= fourni. IT (superuser) voit tout et
// peut filtrer par commission, y compris 'global' (reset plateforme).
function scopedCommission(req) {
  return req.user.role === 'it' ? req.query.commission || null : req.user.role;
}

function buildFilter(req) {
  const { action, resourceType, resourceId, actorId, success, from, to, search } = req.query;

  const clauses = [];
  const params = [];
  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  const commission = scopedCommission(req);
  if (commission) clauses.push(`commission = ${addParam(commission)}`);
  if (action) clauses.push(`action = ${addParam(action)}`);
  if (resourceType) clauses.push(`resource_type = ${addParam(resourceType)}`);
  if (resourceId) clauses.push(`resource_id = ${addParam(String(resourceId))}`);
  if (actorId) clauses.push(`actor_id = ${addParam(Number(actorId))}`);
  if (success === 'true') clauses.push('success = TRUE');
  if (success === 'false') clauses.push('success = FALSE');
  if (from) clauses.push(`created_at >= ${addParam(from)}`);
  if (to) clauses.push(`created_at <= ${addParam(to)}`);
  if (search) {
    const p = addParam(`%${search}%`);
    clauses.push(`(resource_label ILIKE ${p} OR actor_snapshot->>'fullName' ILIKE ${p})`);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return { whereSql, params };
}

async function listAuditLogs(req, res) {
  const { page = 1, pageSize = 25 } = req.query;
  const { whereSql, params } = buildFilter(req);
  const limit = Math.min(Number(pageSize) || 25, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

  const total = (await db.get(`SELECT COUNT(*) AS n FROM audit_logs ${whereSql}`, params)).n;

  const logs = await db.all(
    `SELECT * FROM audit_logs
     ${whereSql}
     ORDER BY created_at DESC, id DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  res.json({ logs, total, page: Number(page) || 1, pageSize: limit });
}

async function getAuditLog(req, res) {
  const log = await db.get('SELECT * FROM audit_logs WHERE id = $1', [req.params.id]);
  // 404 (pas 403) si la ligne existe mais hors périmètre : évite de confirmer
  // à un chef qu'une ligne d'une autre commission existe avec cet id.
  const commission = scopedCommission(req);
  if (!log || (commission && log.commission !== commission)) {
    return res.status(404).json({ error: "Entrée du journal d'audit introuvable." });
  }
  res.json({ log });
}

module.exports = { listAuditLogs, getAuditLog };
