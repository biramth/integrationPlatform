const { randomUUID } = require('crypto');

// Identifiant unique par requête, pour corréler une action du journal d'audit
// avec les logs serveur d'un même appel. crypto.randomUUID est natif à Node,
// pas besoin d'une dépendance supplémentaire.
function requestId(req, res, next) {
  req.id = randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}

module.exports = { requestId };
