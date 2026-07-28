export const ROLES = {
  REGISTRAR: 'registrar',
  LOGISTICS: 'logistics',
  ADMIN: 'admin',
  SANTE: 'sante',
  CUISINE: 'cuisine',
};

export const ROLE_LABELS = {
  [ROLES.REGISTRAR]: 'Agent enregistreur',
  [ROLES.LOGISTICS]: 'Commission Orga',
  [ROLES.ADMIN]: 'Administrateur',
  [ROLES.SANTE]: 'Commission Santé',
  [ROLES.CUISINE]: 'Commission Cuisine',
};

export function homePathForRole(role) {
  switch (role) {
    case ROLES.REGISTRAR:
      return '/registrar/basic';
    case ROLES.LOGISTICS:
      return '/logistics';
    case ROLES.ADMIN:
      return '/admin';
    case ROLES.SANTE:
      return '/sante/risques';
    case ROLES.CUISINE:
      return '/cuisine/menu';
    default:
      return '/login';
  }
}
