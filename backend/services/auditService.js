const db = require('../db/database');

// Écrit une ligne du journal d'audit. Toujours appelé APRÈS que l'opération
// métier a réussi (elle-même déjà commitée si elle était transactionnelle) —
// jamais depuis l'intérieur d'un db.transaction(fn) : un échec d'écriture ici
// ferait ROLLBACK toute l'action primaire, ce qui est l'inverse de l'effet
// recherché (un journal d'audit qui casse l'action qu'il est censé tracer).
//
// Ne lève jamais : un échec d'écriture d'audit ne doit jamais faire échouer
// la requête utilisateur ni annuler l'action déjà effectuée. Compromis
// assumé : fenêtre minime où l'action primaire réussit mais la ligne
// d'audit correspondante n'est pas écrite.
async function logAction(req, {
  action,
  resourceType,
  resourceId = null,
  resourceLabel = null,
  commission,
  before = null,
  after = null,
  success = true,
  errorMessage = null,
}) {
  try {
    const actor = req.user || {};
    const actorSnapshot = {
      id: actor.id ?? null,
      fullName: actor.fullName ?? null,
      username: actor.username ?? null,
      role: actor.role ?? null,
      subRole: actor.subRole ?? null,
      isCommissionLead: actor.isCommissionLead ?? null,
    };

    await db.run(
      `INSERT INTO audit_logs
        (actor_id, actor_snapshot, action, resource_type, resource_id, resource_label,
         commission, before_data, after_data, success, error_message, request_id, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        actor.id ?? null,
        JSON.stringify(actorSnapshot),
        action,
        resourceType,
        resourceId !== null && resourceId !== undefined ? String(resourceId) : null,
        resourceLabel,
        commission,
        before !== null ? JSON.stringify(before) : null,
        after !== null ? JSON.stringify(after) : null,
        success,
        errorMessage,
        req.id || null,
        req.ip || null,
        req.headers?.['user-agent'] || null,
      ]
    );
  } catch (err) {
    console.error("Échec d'écriture du journal d'audit :", err);
  }
}

module.exports = { logAction };
