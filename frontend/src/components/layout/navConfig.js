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
} from 'lucide-react';
import { ROLES } from '../../utils/roles';

export const NAV_ITEMS = {
  [ROLES.REGISTRAR]: [
    { to: '/registrar/basic', label: 'Enregistrer', icon: FilePlus2 },
    { to: '/registrar/complementary', label: 'Compléter', icon: ClipboardList },
  ],
  [ROLES.LOGISTICS]: [{ to: '/logistics', label: 'Bagages', icon: Luggage }],
  [ROLES.ADMIN]: [
    { to: '/admin', label: 'Tableau de bord', shortLabel: 'Accueil', icon: LayoutDashboard },
    { to: '/admin/records', label: 'Dossiers', icon: FolderOpen },
    { to: '/admin/rooms', label: 'Chambres', icon: DoorOpen },
    { to: '/admin/agents', label: 'Agents', icon: Users },
  ],
  [ROLES.SANTE]: [
    { to: '/sante/risques', label: 'Risques du jour', icon: AlertTriangle },
    { to: '/sante/maladies', label: 'Maladies', icon: Stethoscope },
    { to: '/sante/allergenes', label: 'Allergènes', icon: Leaf },
  ],
  [ROLES.CUISINE]: [{ to: '/cuisine/menu', label: 'Menu du jour', icon: UtensilsCrossed }],
};
