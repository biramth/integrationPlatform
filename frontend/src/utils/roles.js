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

// Un agent Orga sans sub_role a accès aux trois sous-domaines.
export function orgaHasScope(user, scope) {
  return user.role === ROLES.ORGA && (!user.subRole || user.subRole === scope);
}

export function homePathForRole(role, subRole) {
  switch (role) {
    case ROLES.ORGA:
      if (subRole === ORGA_SUB_ROLES.CHAMBRES) return '/orga/rooms';
      if (subRole === ORGA_SUB_ROLES.BAGAGES) return '/orga/luggage';
      return '/orga/basic';
    case ROLES.IT:
      return '/admin';
    case ROLES.SANTE:
      return '/sante/risques';
    case ROLES.CUISINE:
      return '/cuisine/menu';
    case ROLES.COMMUNICATION:
      return '/communication/annuaire';
    case ROLES.CULTURELLE:
      return '/planning';
    case ROLES.PRESIDENTIELLE:
      return '/admin/activites';
    default:
      return '/login';
  }
}
