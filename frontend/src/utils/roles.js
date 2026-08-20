export const ROLES = {
  ORGA: 'orga',
  ADMIN: 'admin',
  SANTE: 'sante',
  CUISINE: 'cuisine',
  IT: 'it',
  COMMUNICATION: 'communication',
  CULTURELLE: 'culturelle',
  ACTIVITES: 'activites',
};

export const ROLE_LABELS = {
  [ROLES.ORGA]: 'Commission Orga',
  [ROLES.ADMIN]: 'Administrateur',
  [ROLES.SANTE]: 'Commission Santé',
  [ROLES.CUISINE]: 'Commission Cuisine',
  [ROLES.IT]: 'Commission IT',
  [ROLES.COMMUNICATION]: 'Commission Communication',
  [ROLES.CULTURELLE]: 'Commission Culturelle',
  [ROLES.ACTIVITES]: 'Commission Activités',
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
    case ROLES.ADMIN:
    case ROLES.IT:
      return '/admin';
    case ROLES.SANTE:
      return '/sante/risques';
    case ROLES.CUISINE:
      return '/cuisine/menu';
    case ROLES.COMMUNICATION:
      return '/communication/annuaire';
    case ROLES.CULTURELLE:
      return '/culturelle/planning';
    case ROLES.ACTIVITES:
      return '/admin/activites';
    default:
      return '/login';
  }
}
