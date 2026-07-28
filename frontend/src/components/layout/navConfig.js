import { ROLES } from '../../utils/roles';

export const NAV_ITEMS = {
  [ROLES.REGISTRAR]: [
    { to: '/registrar/basic', label: 'Nouvelle fiche', icon: '📝' },
    { to: '/registrar/complementary', label: 'Compléter', icon: '📋' },
  ],
  [ROLES.LOGISTICS]: [{ to: '/logistics', label: 'Bagages', icon: '🧳' }],
  [ROLES.ADMIN]: [
    { to: '/admin', label: 'Tableau de bord', icon: '📊' },
    { to: '/admin/records', label: 'Dossiers', icon: '🗂️' },
    { to: '/admin/rooms', label: 'Chambres', icon: '🚪' },
    { to: '/admin/agents', label: 'Agents', icon: '👥' },
  ],
  [ROLES.SANTE]: [
    { to: '/sante/risques', label: 'Risques du jour', icon: '⚠️' },
    { to: '/sante/maladies', label: 'Maladies', icon: '🩺' },
    { to: '/sante/allergenes', label: 'Allergènes', icon: '🌿' },
  ],
  [ROLES.CUISINE]: [{ to: '/cuisine/menu', label: 'Menu du jour', icon: '🍽️' }],
};
