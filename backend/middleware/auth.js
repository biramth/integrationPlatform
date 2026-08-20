const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
}

// La commission IT est super-utilisateur : elle gère et améliore la plateforme,
// donc un compte "it" passe toujours, quels que soient les rôles autorisés par
// la route. Ça évite de devoir lister "it" dans chaque requireRole(...) du code.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ error: 'Accès refusé pour ce rôle.' });
    }
    if (req.user.role === 'it' || roles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ error: 'Accès refusé pour ce rôle.' });
  };
}

// Restreint un agent Orga à son sous-domaine (chambres / enregistrement / bagages)
// quand on lui en a assigné un. sub_role NULL = accès aux trois. Ne s'applique
// qu'au rôle "orga" : les autres rôles autorisés par requireRole (admin, it via
// le bypass ci-dessus) ne sont jamais restreints par un sous-rôle.
function requireOrgaScope(scope) {
  return (req, res, next) => {
    if (req.user.role === 'orga' && req.user.subRole && req.user.subRole !== scope) {
      return res.status(403).json({ error: 'Accès refusé pour ce sous-rôle de la commission Orga.' });
    }
    next();
  };
}

// Gestion des comptes agents : admin et it gèrent tout le monde ; un chef de
// commission (is_commission_lead) peut gérer les comptes de sa propre
// commission (la portée exacte — même commission, pas de promotion de
// privilèges — est vérifiée dans agentController.js).
function requireAgentManagement(req, res, next) {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'it' || req.user.isCommissionLead)) {
    return next();
  }
  return res.status(403).json({ error: 'Accès refusé pour ce rôle.' });
}

module.exports = { verifyToken, requireRole, requireOrgaScope, requireAgentManagement };
