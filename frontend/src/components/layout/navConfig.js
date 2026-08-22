import {
  FilePlus2,
  ClipboardList,
  Luggage,
  LayoutDashboard,
  FolderOpen,
  DoorOpen,
  PackageCheck,
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
// "chambres" ne configure pas les chambres (ressort du chef Orga, cf.
// ORGA_ROOMS_ADMIN_ITEM plus bas) : son travail est de livrer, dans la
// chambre déjà assignée à chaque DUT1, les bagages que l'agent "bagages" a
// photographiés.
const ORGA_ITEMS = {
  enregistrement: [{ to: '/orga/basic', label: 'Enregistrer', icon: FilePlus2 }],
  bagages: [{ to: '/orga/luggage', label: 'Bagages', icon: Luggage }],
  chambres: [{ to: '/orga/deliveries', label: 'Livraison bagages', icon: PackageCheck }],
};

// Configurer les chambres (créer/modifier/supprimer, matelas, import, fiches
// imprimables) est un travail de mise en place réservé au chef Orga — pas au
// sous-rôle "chambres", qui ne s'en occupe plus (cf. ORGA_ITEMS ci-dessus).
const ORGA_ROOMS_ADMIN_ITEM = { to: '/orga/rooms', label: 'Config. chambres', icon: DoorOpen };

// Même principe pour Santé : "suivi" (travail santé classique) et "phase2"
// (complément de dossier, transféré depuis Orga car médical — traitement,
// allergies).
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

// settings vient de GET /platform-settings (cf. platformSettingsApi.js) :
// { registration, phase2 }, chacun true/false. Absent (page pas encore
// chargée) = traité comme activé, pour ne pas faire disparaître un lien le
// temps du premier chargement.
export function getNavItems(user, settings) {
  if (!user) return [];
  const registrationEnabled = settings?.registration !== false;
  const phase2Enabled = settings?.phase2 !== false;
  const leadItems = [
    ...(user.isCommissionLead && !NO_AGENTS_ROLES.includes(user.role) ? [AGENTS_ITEM] : []),
    ...(user.isCommissionLead && OVERVIEW_ITEM_BY_ROLE[user.role] ? [OVERVIEW_ITEM_BY_ROLE[user.role]] : []),
    ...(user.isCommissionLead && user.role === ROLES.SANTE ? [SANTE_QUESTIONS_ITEM] : []),
    ...(user.isCommissionLead && user.role === ROLES.ORGA ? [ORGA_ROOMS_ADMIN_ITEM] : []),
    ...(user.isCommissionLead ? [AUDIT_ITEM] : []),
  ];
  // Le chef de commission supervise, il n'exécute pas les tâches de
  // sous-rôle : il ne voit aucun des onglets opérationnels ci-dessus, quel
  // que soit son sub_role — seulement leadItems (Vue d'ensemble, config,
  // agents, audit) et Planning. Exception pour Santé, cf. plus bas.
  if (user.role === ROLES.ORGA) {
    const scoped = user.isCommissionLead
      ? []
      : user.subRole
      ? (user.subRole === 'enregistrement' && !registrationEnabled ? [] : ORGA_ITEMS[user.subRole] || [])
      : [...(registrationEnabled ? ORGA_ITEMS.enregistrement : []), ...ORGA_ITEMS.bagages, ...ORGA_ITEMS.chambres];
    return [...scoped, PLANNING_ITEM, ...leadItems];
  }
  if (user.role === ROLES.SANTE) {
    // Contrairement aux autres commissions, le chef Santé garde ses onglets
    // opérationnels : Risques du jour/Suivi santé/Allergènes ("suivi") restent
    // son travail au quotidien, et "phase2" lui sert à corriger un dossier
    // déjà complété (cf. leadBypassesScope dans App.jsx) — jamais masqué par
    // l'interrupteur phase2Enabled, qui ne concerne que la saisie initiale.
    const scoped = user.isCommissionLead
      ? [...SANTE_ITEMS.suivi, ...SANTE_ITEMS.phase2]
      : user.subRole
      ? (user.subRole === 'phase2' && !phase2Enabled ? [] : SANTE_ITEMS[user.subRole] || [])
      : [...SANTE_ITEMS.suivi, ...(phase2Enabled ? SANTE_ITEMS.phase2 : [])];
    return [...scoped, PLANNING_ITEM, ...leadItems];
  }
  return [...(NAV_ITEMS[user.role] || []), ...leadItems];
}

export const NAV_ITEMS = {
  // Chambres (Orga) et Activités (Présidentielle) ne sont pas du ressort d'IT
  // — retirées du menu, et refusées côté API même via le bypass superuser
  // habituel (cf. requireRoleStrict). IT garde le calendrier en lecture seule
  // via Planning, comme toutes les commissions.
  [ROLES.IT]: [
    { to: '/admin', label: 'Tableau de bord', shortLabel: 'Accueil', icon: LayoutDashboard },
    { to: '/admin/records', label: 'Dossiers', icon: FolderOpen },
    { to: '/admin/agents', label: 'Agents', icon: Users },
    PLANNING_ITEM,
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
