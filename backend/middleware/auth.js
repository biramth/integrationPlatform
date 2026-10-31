const jwt = require('jsonwebtoken');
const db = require('../db/database');

// --- Contrôle d'accès : cache court -----------------------------------------
// La signature et l'expiration du JWT sont vérifiées à chaque requête. Seule la
// lecture de `users` (token_version + is_active) est mémorisée quelques
// secondes : sans ça, chaque appel authentifié payait un aller-retour Supabase
// (~100 ms depuis Render) avant même d'atteindre le contrôleur.
//
// Les écritures qui révoquent un jeton (mot de passe, désactivation, changement
// de privilèges) appellent invalidateUserCheck() : la révocation reste donc
// immédiate. Le TTL n'est qu'un filet de sécurité pour les modifications faites
// hors application (SQL direct).
const USER_CHECK_TTL_MS = 15_000;
const userChecks = new Map();

// Clé normalisée : les routes passent l'id en chaîne, le JWT en nombre.
const userKey = (id) => String(id);

function getUserCheck(id) {
  const key = userKey(id);
  const entry = userChecks.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    userChecks.delete(key);
    return null;
  }
  return entry;
}

function rememberUserCheck(user) {
  const entry = {
    tokenVersion: user.token_version,
    isActive: user.is_active,
    expiresAt: Date.now() + USER_CHECK_TTL_MS,
  };
  userChecks.set(userKey(user.id), entry);
  return entry;
}

// À appeler après toute écriture qui doit révoquer les jetons d'un compte.
// Sans argument : vide tout (import/synchronisation en masse).
function invalidateUserCheck(id) {
  if (id === undefined || id === null) userChecks.clear();
  else userChecks.delete(userKey(id));
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of userChecks) {
    if (now > entry.expiresAt) userChecks.delete(key);
  }
}, 60_000).unref?.();

function applyUserCheck(entry, req, res, next) {
  if (!entry.isActive) {
    return res.status(401).json({ error: 'Compte désactivé ou introuvable.' });
  }
  if (entry.tokenVersion !== req.user.tokenVersion) {
    return res.status(401).json({ error: 'Token révoqué. Veuillez vous reconnecter.' });
  }
  return next();
}

function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }

  // Vérification du token_version : si le mot de passe a changé ou le compte
  // a été désactivé depuis l'émission du JWT, le token est révoqué.
  const cached = getUserCheck(req.user.id);
  if (cached) {
    return applyUserCheck(cached, req, res, next);
  }

  db.get('SELECT id, token_version, is_active FROM users WHERE id = $1', [req.user.id])
    .then((user) => {
      if (!user) {
        return res.status(401).json({ error: 'Compte désactivé ou introuvable.' });
      }
      return applyUserCheck(rememberUserCheck(user), req, res, next);
    })
    .catch((err) => {
      // Erreur transitoire DB : on laisse passer la requete si le JWT est valide
      // plutot que de deconnecter l'utilisateur en pleine saisie.
      console.warn('[auth] Verif utilisateur echouee, JWT conserve :', err.message);
      return next();
    });
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

// Restreint un agent Orga à son sous-domaine (logistique / enregistrement / bagages)
// quand on lui en a assigné un. sub_role NULL = accès aux trois — sauf pour le
// chef de commission, qui supervise et n'exécute pas les tâches quotidiennes
// des sous-rôles : il n'a jamais accès à ces routes, quel que soit son
// sub_role. Le chef de pôle (isPoleLead), lui, peut jouer tous les sous-rôles
// de la commission Orga : c'est la différence délibérée entre les deux
// postes — le chef supervise, le chef de pôle peut aussi exécuter. Ne
// s'applique qu'au rôle "orga" : les autres rôles autorisés par requireRole
// (it via le bypass ci-dessus) ne sont jamais restreints par un sous-rôle.
function requireOrgaScope(scope) {
  return (req, res, next) => {
    if (req.user.role === 'orga' && !req.user.isPoleLead) {
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

// Certaines actions Santé ne relèvent pas d'un seul sous-domaine : créer un
// allergène se fait aussi bien depuis la configuration du questionnaire
// (suivi/chef) que depuis la complétion d'un dossier, quand l'agent qui
// interroge le DUT1 découvre un allergène absent de la liste (phase2). Le
// sous-rôle NULL (accès aux deux) et le chef/IT passent, comme ailleurs.
function requireSanteScopeAny(...scopes) {
  return (req, res, next) => {
    if (req.user.role === 'sante' && req.user.subRole && !scopes.includes(req.user.subRole)) {
      return res.status(403).json({ error: 'Accès refusé pour ce sous-rôle de la commission Santé.' });
    }
    next();
  };
}

// Gestion des comptes agents : it gère tout le monde ; un chef de commission
// (is_commission_lead) peut gérer les comptes de sa propre commission (la
// portée exacte — même commission, pas de promotion de privilèges — est
// vérifiée dans agentController.js). Le chef de pôle (isPoleLead) a la même
// délégation que le chef de commission : parité complète voulue entre les
// deux postes.
function requireAgentManagement(req, res, next) {
  if (req.user && (req.user.role === 'it' || req.user.isCommissionLead || req.user.isPoleLead)) {
    return next();
  }
  return res.status(403).json({ error: 'Accès refusé pour ce rôle.' });
}

// À utiliser après requireRole(...) pour restreindre une action au chef de la
// commission plutôt qu'à tous ses membres — ex: la commission Cuisine peut
// tous voir le menu du jour, mais seul le chef le crée/modifie.
function requireCommissionLead(req, res, next) {
  if (req.user.role === 'it' || req.user.isCommissionLead || req.user.isPoleLead) {
    return next();
  }
  return res.status(403).json({ error: 'Réservé au chef de commission ou de pôle.' });
}

// Comme requireCommissionLead, mais SANS le bypass superutilisateur d'IT — à
// utiliser après requireRoleStrict(...) pour réserver une action au chef d'une
// commission qui n'admet pas l'admin d'urgence IT. Cas d'usage : configurer
// les chambres (créer/modifier/supprimer, matelas, import) est un travail de
// mise en place réservé au chef Orga — le sous-rôle "logistique" ne le fait
// plus, son travail quotidien est de livrer les bagages déjà photographiés
// dans la chambre assignée à chaque DUT1, pas de configurer les chambres.
// Le "chef de pôle" (is_pole_lead) reçoit la même délégation que le chef de
// commission ici, comme partout ailleurs sur Orga (requireAgentManagement,
// requireCommissionLead, requireOrgaScope) : parité complète voulue entre les
// deux postes, en plus de pouvoir jouer les sous-rôles (cf. requireOrgaScope).
function requireCommissionLeadStrict(req, res, next) {
  if (req.user && (req.user.isCommissionLead || req.user.isPoleLead)) {
    return next();
  }
  return res.status(403).json({ error: 'Réservé au chef de commission ou de pôle.' });
}

module.exports = {
  verifyToken,
  invalidateUserCheck,
  requireRole,
  requireRoleStrict,
  requireOrgaScope,
  requireSanteScope,
  requireSanteScopeAny,
  requireAgentManagement,
  requireCommissionLead,
  requireCommissionLeadStrict,
};
