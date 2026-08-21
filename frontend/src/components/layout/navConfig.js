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
  ListChecks,
  ScrollText,
} from 'lucide-react';
import { ROLES } from '../../utils/roles';

// Orga voit les trois onglets par défaut ; un agent restreint à un sous-rôle
// (sub_role) n'en voit qu'un — filtré dans AppLayout/Sidebar via getNavItems.
const ORGA_ITEMS = {
  enregistrement: [{ to: '/orga/basic', label: 'Enregistrer', icon: FilePlus2 }],
  bagages: [{ to: '/orga/luggage', label: 'Bagages', icon: Luggage }],
  chambres: [{ to: '/orga/rooms', label: 'Chambres', icon: DoorOpen }],
};

// Même principe pour Santé : "suivi" (travail santé classique) et "phase2"
// (complément de dossier, transféré depuis Orga car médical — traitement,
// allergies, admission).
const SANTE_ITEMS = {
  suivi: [
    { to: '/sante/risques', label: 'Risques du jour', icon: AlertTriangle },
    { to: '/sante/suivi', label: 'Suivi santé', icon: Stethoscope },
    { to: '/sante/allergenes', label: 'Allergènes', icon: Leaf },
  ],
  phase2: [{ to: '/sante/complementary', label: 'Compléter', icon: ClipboardList }],
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
const NO_AGENTS_ROLES = [ROLES.IT, ROLES.PRESIDENTIELLE];

// Chaque chef de commission a une vue d'ensemble sur sa sphère — sauf Cuisine
// et Culturelle, dont le périmètre (menu du jour, planning en lecture) n'a
// rien à agréger. IT et Présidentielle ont déjà la leur en page d'accueil,
// pas besoin d'un lien de nav supplémentaire pour ceux-là.
const OVERVIEW_ITEM_BY_ROLE = {
  [ROLES.ORGA]: { to: '/orga/apercu', label: "Vue d'ensemble", icon: LineChart },
  [ROLES.SANTE]: { to: '/sante/apercu', label: "Vue d'ensemble", icon: LineChart },
  [ROLES.COMMUNICATION]: { to: '/communication/apercu', label: "Vue d'ensemble", icon: LineChart },
};

// Le chef de la commission Santé configure lui-même les questions posées en
// phase 2 (complément de dossier) — pas d'utilité pour les autres commissions.
const SANTE_QUESTIONS_ITEM = { to: '/sante/questions-phase2', label: 'Questions phase 2', icon: ListChecks };

// Journal d'audit de sa propre commission (scopé côté backend) : proposé à
// tout chef, y compris Cuisine/Culturelle/Présidentielle — contrairement à
// AGENTS_ITEM, il n'y a aucune raison de l'exclure pour ces commissions, un
// chef peut vouloir voir qui a touché à son menu/planning/activités.
const AUDIT_ITEM = { to: '/audit', label: "Journal d'audit", icon: ScrollText };

export function getNavItems(user) {
  if (!user) return [];
  const leadItems = [
    ...(user.isCommissionLead && !NO_AGENTS_ROLES.includes(user.role) ? [AGENTS_ITEM] : []),
    ...(user.isCommissionLead && OVERVIEW_ITEM_BY_ROLE[user.role] ? [OVERVIEW_ITEM_BY_ROLE[user.role]] : []),
    ...(user.isCommissionLead && user.role === ROLES.SANTE ? [SANTE_QUESTIONS_ITEM] : []),
    ...(user.isCommissionLead ? [AUDIT_ITEM] : []),
  ];
  if (user.role === ROLES.ORGA) {
    const scoped = user.subRole
      ? ORGA_ITEMS[user.subRole] || []
      : [...ORGA_ITEMS.enregistrement, ...ORGA_ITEMS.bagages, ...ORGA_ITEMS.chambres];
    return [...scoped, PLANNING_ITEM, ...leadItems];
  }
  if (user.role === ROLES.SANTE) {
    const scoped = user.subRole ? SANTE_ITEMS[user.subRole] || [] : [...SANTE_ITEMS.suivi, ...SANTE_ITEMS.phase2];
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
    { to: '/admin/audit', label: "Journal d'audit", icon: ScrollText },
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
