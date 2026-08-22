// Pas de rôle "admin" séparé : la commission IT EST l'administration de la
// plateforme (super-utilisateur, cf. RoleRoute et middleware/auth.js côté back).
export const ROLES = {
  ORGA: 'orga',
  SANTE: 'sante',
  CUISINE: 'cuisine',
  IT: 'it',
  COMMUNICATION: 'communication',
  CULTURELLE: 'culturelle',
  PRESIDENTIELLE: 'presidentielle',
};

export const ROLE_LABELS = {
  [ROLES.ORGA]: 'Commission Orga',
  [ROLES.SANTE]: 'Commission Santé',
  [ROLES.CUISINE]: 'Commission Cuisine',
  [ROLES.IT]: 'Commission IT',
  [ROLES.COMMUNICATION]: 'Commission Communication',
  [ROLES.CULTURELLE]: 'Commission Culturelle',
  [ROLES.PRESIDENTIELLE]: 'Commission Présidentielle',
};

// Reprend les couleurs de --role-accent (index.css) pour donner à chaque
// commission un repère visuel dans les listes de rôles (ex: sélecteur de
// rôle à la création d'un compte) — sans ça, une liste de 7 libellés très
// proches ("Commission X") est difficile à scanner d'un coup d'œil.
export const ROLE_COLORS = {
  [ROLES.ORGA]: '#2563eb',
  [ROLES.SANTE]: '#dc2626',
  [ROLES.CUISINE]: '#16a34a',
  [ROLES.IT]: '#7c3aed',
  [ROLES.COMMUNICATION]: '#0891b2',
  [ROLES.CULTURELLE]: '#c026d3',
  [ROLES.PRESIDENTIELLE]: '#ea580c',
};

export const ORGA_SUB_ROLES = {
  CHAMBRES: 'chambres',
  ENREGISTREMENT: 'enregistrement',
  BAGAGES: 'bagages',
};

export const ORGA_SUB_ROLE_LABELS = {
  [ORGA_SUB_ROLES.CHAMBRES]: 'Chambres',
  [ORGA_SUB_ROLES.ENREGISTREMENT]: 'Enregistrement',
  [ORGA_SUB_ROLES.BAGAGES]: 'Bagages',
};

// Phase 2 (complément de dossier — traitement médical, allergies)
// relève de la commission Santé, pas d'Orga : ce sont des questions médicales.
// "suivi" regroupe le travail santé classique (risques, suivi, allergènes).
export const SANTE_SUB_ROLES = {
  SUIVI: 'suivi',
  PHASE2: 'phase2',
};

export const SANTE_SUB_ROLE_LABELS = {
  [SANTE_SUB_ROLES.SUIVI]: 'Suivi santé',
  [SANTE_SUB_ROLES.PHASE2]: 'Phase 2 (complément de dossier)',
};

// Sous-rôles valides par commission, pour les écrans génériques (sélecteur de
// rôle à la création d'un compte, etc.) qui doivent s'adapter au rôle choisi.
export const SUB_ROLE_LABELS_BY_ROLE = {
  [ROLES.ORGA]: ORGA_SUB_ROLE_LABELS,
  [ROLES.SANTE]: SANTE_SUB_ROLE_LABELS,
};

// Un agent Orga sans sub_role a accès aux trois sous-domaines.
export function orgaHasScope(user, scope) {
  return user.role === ROLES.ORGA && (!user.subRole || user.subRole === scope);
}

// Un agent Santé sans sub_role a accès aux deux sous-domaines.
export function santeHasScope(user, scope) {
  return user.role === ROLES.SANTE && (!user.subRole || user.subRole === scope);
}

// isCommissionLead : le chef de commission n'a plus accès aux pages
// opérationnelles de sous-rôle (cf. RoleRoute/navConfig) — sa page d'accueil
// est sa Vue d'ensemble, pas la page par défaut d'un agent généraliste.
export function homePathForRole(role, subRole, isCommissionLead) {
  switch (role) {
    case ROLES.ORGA:
      if (isCommissionLead) return '/orga/apercu';
      if (subRole === ORGA_SUB_ROLES.CHAMBRES) return '/orga/deliveries';
      if (subRole === ORGA_SUB_ROLES.BAGAGES) return '/orga/luggage';
      return '/orga/basic';
    case ROLES.IT:
      return '/admin';
    case ROLES.SANTE:
      if (isCommissionLead) return '/sante/apercu';
      if (subRole === SANTE_SUB_ROLES.PHASE2) return '/sante/complementary';
      return '/sante/risques';
    case ROLES.CUISINE:
      return '/cuisine/menu';
    case ROLES.COMMUNICATION:
      return '/communication/annuaire';
    case ROLES.CULTURELLE:
      return '/planning';
    case ROLES.PRESIDENTIELLE:
      return '/presidentielle';
    default:
      return '/login';
  }
}
