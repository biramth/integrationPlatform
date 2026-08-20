import {
  FilePlus2,
  ClipboardList,
  Luggage,
  LayoutDashboard,
  FolderOpen,
  DoorOpen,
  Users,
  AlertTriangle,
  Stethoscope,
  Leaf,
  UtensilsCrossed,
  CalendarDays,
  Contact,
  ShieldAlert,
} from 'lucide-react';
import { ROLES } from '../../utils/roles';

// Orga voit les trois onglets par défaut ; un agent restreint à un sous-rôle
// (sub_role) n'en voit qu'un — filtré dans AppLayout/Sidebar via getNavItems.
const ORGA_ITEMS = {
  enregistrement: [
    { to: '/orga/basic', label: 'Enregistrer', icon: FilePlus2 },
    { to: '/orga/complementary', label: 'Compléter', icon: ClipboardList },
  ],
  bagages: [{ to: '/orga/luggage', label: 'Bagages', icon: Luggage }],
  chambres: [{ to: '/orga/rooms', label: 'Chambres', icon: DoorOpen }],
};

export function getNavItems(user) {
  if (!user) return [];
  if (user.role === ROLES.ORGA) {
    if (!user.subRole) {
      return [...ORGA_ITEMS.enregistrement, ...ORGA_ITEMS.bagages, ...ORGA_ITEMS.chambres];
    }
    return ORGA_ITEMS[user.subRole] || [];
  }
  return NAV_ITEMS[user.role] || [];
}

export const NAV_ITEMS = {
  [ROLES.ADMIN]: [
    { to: '/admin', label: 'Tableau de bord', shortLabel: 'Accueil', icon: LayoutDashboard },
    { to: '/admin/records', label: 'Dossiers', icon: FolderOpen },
    { to: '/admin/rooms', label: 'Chambres', icon: DoorOpen },
    { to: '/admin/agents', label: 'Agents', icon: Users },
    { to: '/admin/activites', label: 'Activités', icon: CalendarDays },
  ],
  [ROLES.IT]: [
    { to: '/admin', label: 'Tableau de bord', shortLabel: 'Accueil', icon: LayoutDashboard },
    { to: '/admin/records', label: 'Dossiers', icon: FolderOpen },
    { to: '/admin/rooms', label: 'Chambres', icon: DoorOpen },
    { to: '/admin/agents', label: 'Agents', icon: Users },
    { to: '/admin/activites', label: 'Activités', icon: CalendarDays },
    { to: '/admin/plateforme', label: 'Plateforme', icon: ShieldAlert },
  ],
  [ROLES.SANTE]: [
    { to: '/sante/risques', label: 'Risques du jour', icon: AlertTriangle },
    { to: '/sante/suivi', label: 'Suivi santé', icon: Stethoscope },
    { to: '/sante/allergenes', label: 'Allergènes', icon: Leaf },
  ],
  [ROLES.CUISINE]: [{ to: '/cuisine/menu', label: 'Menu du jour', icon: UtensilsCrossed }],
  [ROLES.COMMUNICATION]: [
    { to: '/communication/annuaire', label: 'Annuaire', icon: Contact },
    { to: '/communication/planning', label: 'Planning', icon: CalendarDays },
  ],
  [ROLES.CULTURELLE]: [{ to: '/culturelle/planning', label: 'Planning', icon: CalendarDays }],
  [ROLES.ACTIVITES]: [{ to: '/admin/activites', label: 'Activités', icon: CalendarDays }],
};
