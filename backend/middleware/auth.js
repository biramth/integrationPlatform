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

// Comme requireRole, mais SANS le bypass superutilisateur d'IT : à réserver
// aux actions qui ne relèvent explicitement pas d'IT même en admin d'urgence
// (gérer les chambres, créer/modifier/supprimer une activité — le ressort
// d'Orga et de Présidentielle, pas d'IT). Le bypass générique de requireRole
// reste la norme partout ailleurs sur la plateforme ; celui-ci est
// l'exception délibérée, pas un nouveau modèle par défaut.
function requireRoleStrict(...roles) {
  return (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ error: 'Accès refusé pour ce rôle.' });
  };
}

// Restreint un agent Orga à son sous-domaine (chambres / enregistrement / bagages)
// quand on lui en a assigné un. sub_role NULL = accès aux trois — sauf pour le
// chef de commission, qui supervise et n'exécute pas les tâches quotidiennes
// des sous-rôles : il n'a jamais accès à ces routes, quel que soit son
// sub_role. Ne s'applique qu'au rôle "orga" : les autres rôles autorisés par
// requireRole (it via le bypass ci-dessus) ne sont jamais restreints par un
// sous-rôle.
function requireOrgaScope(scope) {
  return (req, res, next) => {
    if (req.user.role === 'orga') {
      if (req.user.isCommissionLead) {
        return res.status(403).json({ error: 'Réservé aux agents Orga — le chef de commission supervise, il n\'exécute pas les tâches de sous-rôle.' });
      }
      if (req.user.subRole && req.user.subRole !== scope) {
        return res.status(403).json({ error: 'Accès refusé pour ce sous-rôle de la commission Orga.' });
      }
    }
    next();
  };
}

// Même principe que requireOrgaScope, pour la commission Santé : "suivi"
// (risques, suivi santé, allergènes) et "phase2" (complément de dossier —
// traitement, allergies), déplacé depuis Orga car ce sont des questions
// médicales. sub_role NULL = accès aux deux — le chef supervise et n'exécute
// pas les tâches de sous-rôle lui-même, SAUF pour "suivi" (Risques du jour,
// Suivi santé, Allergènes) où il reste un agent Santé à part entière, et pour
// la configuration du questionnaire phase2 (pas son remplissage — cf.
// requireCommissionLead sur phase2QuestionsRoutes.js) : les deux passent
// { allowLead: true }.
function requireSanteScope(scope, { allowLead = false } = {}) {
  return (req, res, next) => {
    if (req.user.role === 'sante' && !(allowLead && req.user.isCommissionLead)) {
      if (req.user.isCommissionLead) {
        return res.status(403).json({ error: 'Réservé aux agents Santé — le chef de commission supervise, il n\'exécute pas les tâches de sous-rôle.' });
      }
      if (req.user.subRole && req.user.subRole !== scope) {
        return res.status(403).json({ error: 'Accès refusé pour ce sous-rôle de la commission Santé.' });
      }
    }
    next();
  };
}

// Gestion des comptes agents : it gère tout le monde ; un chef de commission
// (is_commission_lead) peut gérer les comptes de sa propre commission (la
// portée exacte — même commission, pas de promotion de privilèges — est
// vérifiée dans agentController.js).
function requireAgentManagement(req, res, next) {
  if (req.user && (req.user.role === 'it' || req.user.isCommissionLead)) {
    return next();
  }
  return res.status(403).json({ error: 'Accès refusé pour ce rôle.' });
}

// À utiliser après requireRole(...) pour restreindre une action au chef de la
// commission plutôt qu'à tous ses membres — ex: la commission Cuisine peut
// tous voir le menu du jour, mais seul le chef le crée/modifie.
function requireCommissionLead(req, res, next) {
  if (req.user.role === 'it' || req.user.isCommissionLead) {
    return next();
  }
  return res.status(403).json({ error: 'Réservé au chef de commission.' });
}

// Comme requireCommissionLead, mais SANS le bypass superutilisateur d'IT — à
// utiliser après requireRoleStrict(...) pour réserver une action au chef d'une
// commission qui n'admet pas l'admin d'urgence IT. Cas d'usage : configurer
// les chambres (créer/modifier/supprimer, matelas, import) est un travail de
// mise en place réservé au chef Orga — le sous-rôle "chambres" ne le fait
// plus, son travail quotidien est de livrer les bagages déjà photographiés
// dans la chambre assignée à chaque DUT1, pas de configurer les chambres.
function requireCommissionLeadStrict(req, res, next) {
  if (req.user && req.user.isCommissionLead) {
    return next();
  }
  return res.status(403).json({ error: 'Réservé au chef de commission.' });
}

module.exports = {
  verifyToken,
  requireRole,
  requireRoleStrict,
  requireOrgaScope,
  requireSanteScope,
  requireAgentManagement,
  requireCommissionLead,
  requireCommissionLeadStrict,
};
