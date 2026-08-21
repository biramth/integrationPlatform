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
  LineChart,
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

// Le planning est un calendrier d'activités sans donnée sensible : visible par
// toutes les commissions, en plus de leurs pages dédiées.
const PLANNING_ITEM = { to: '/planning', label: 'Planning', icon: CalendarDays };
// Un chef de commission gère les comptes de sa propre commission (backend déjà
// en place, cf. requireAgentManagement) — sans ce lien, /admin/agents n'était
// atteignable que par IT, la page restait invisible pour les chefs.
const AGENTS_ITEM = { to: '/admin/agents', label: 'Agents', icon: Users };

// La commission Présidentielle ne compte que deux personnes : la gestion de
// comptes membres n'a pas d'utilité pour elle, même si son chef a le drapeau
// is_commission_lead.
export function getNavItems(user) {
  if (!user) return [];
  const leadItems = user.isCommissionLead && ![ROLES.IT, ROLES.PRESIDENTIELLE].includes(user.role) ? [AGENTS_ITEM] : [];
  if (user.role === ROLES.ORGA) {
    const scoped = user.subRole
      ? ORGA_ITEMS[user.subRole] || []
      : [...ORGA_ITEMS.enregistrement, ...ORGA_ITEMS.bagages, ...ORGA_ITEMS.chambres];
    return [...scoped, PLANNING_ITEM, ...leadItems];
  }
  return [...(NAV_ITEMS[user.role] || []), ...leadItems];
}

export const NAV_ITEMS = {
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
    PLANNING_ITEM,
  ],
  [ROLES.CUISINE]: [{ to: '/cuisine/menu', label: 'Menu du jour', icon: UtensilsCrossed }, PLANNING_ITEM],
  [ROLES.COMMUNICATION]: [{ to: '/communication/annuaire', label: 'Annuaire', icon: Contact }, PLANNING_ITEM],
  [ROLES.CULTURELLE]: [PLANNING_ITEM],
  [ROLES.PRESIDENTIELLE]: [
    { to: '/presidentielle', label: "Vue d'ensemble", shortLabel: 'Accueil', icon: LineChart },
    { to: '/presidentielle/annuaire', label: 'Annuaire', icon: Contact },
    { to: '/admin/activites', label: 'Activités', icon: CalendarDays },
  ],
};
