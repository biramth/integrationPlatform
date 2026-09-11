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
  UtensilsCrossed,
  CalendarDays,
  Contact,
  ShieldAlert,
  LineChart,
  ListChecks,
  ScrollText,
  Pill,
  HeartPulse,
  Clock,
  User,
} from 'lucide-react';
import { ROLES } from '../../utils/roles';

// kind classe chaque page pour deux usages transverses (cf. getPrimaryNavItems
// et getGroupedNavItems plus bas) : quelles pages mettre en avant dans la
// barre basse mobile (jusqu'à 4, dans cet ordre de priorité) et sous quelle
// section les ranger dans le tiroir "Plus"/la barre latérale quand la liste
// est longue. 'overview' = tableau de bord d'un chef ; 'operational' = le
// travail quotidien (saisie, photo, livraison...) ; 'utility' = pages
// transverses à toute commission (planning, risques) ; 'admin' = gestion/
// supervision (agents, audit, configuration) ; 'account' = mon compte.

// Orga voit les trois onglets par défaut ; un agent restreint à un sous-rôle
// (sub_role) n'en voit qu'un — filtré dans AppLayout/Sidebar via getNavItems.
// "chambres" ne configure pas les chambres (ressort du chef Orga, cf.
// ORGA_ROOMS_ADMIN_ITEM plus bas) : son travail est de livrer, dans la
// chambre déjà assignée à chaque DUT1, les bagages que l'agent "bagages" a
// photographiés.
const ORGA_ITEMS = {
  enregistrement: [{ to: '/orga/basic', label: 'Enregistrer', icon: FilePlus2, kind: 'operational' }],
  bagages: [{ to: '/orga/luggage', label: 'Bagages', icon: Luggage, kind: 'operational' }],
  chambres: [
    { to: '/orga/deliveries', label: 'Livraison bagages', shortLabel: 'Livraison', icon: PackageCheck, kind: 'operational' },
  ],
};

// Configurer les chambres (créer/modifier/supprimer, matelas, import, fiches
// imprimables) est un travail de mise en place réservé au chef Orga — pas au
// sous-rôle "chambres", qui ne s'en occupe plus (cf. ORGA_ITEMS ci-dessus).
const ORGA_ROOMS_ADMIN_ITEM = { to: '/orga/rooms', label: 'Config. chambres', shortLabel: 'Chambres', icon: DoorOpen, kind: 'admin' };

// Annuaire du chef Orga : comme celui de Communication/Présidentielle
// (identité, contact, parents), mais avec en plus les photos des bagages déjà
// enregistrés — sa propre commission, cf. OrgaDirectoryPage.jsx.
const ORGA_DIRECTORY_ITEM = { to: '/orga/annuaire', label: 'Annuaire', icon: Contact, kind: 'admin' };

// Même principe pour Santé : "suivi" (travail santé classique), "phase2"
// (complément de dossier, transféré depuis Orga car médical — traitement,
// allergies) et "medoc" (gestion du stock de médicaments, cf. MedicationStockPage.jsx).
const SANTE_ITEMS = {
  suivi: [
    { to: '/sante/risques', label: 'Risques du jour', shortLabel: 'Risques', icon: AlertTriangle, kind: 'operational' },
    { to: '/sante/suivi', label: 'Suivi santé', shortLabel: 'Suivi', icon: Stethoscope, kind: 'operational' },
    // Suivi des prises de médicaments par créneau (matin/midi/soir) — distinct
    // de "medoc" (le stock) : ici on coche qui a pris quoi, pas ce qui entre/sort.
    { to: '/sante/traitements', label: 'Traitements', icon: Clock, kind: 'operational' },
  ],
  phase2: [{ to: '/sante/complementary', label: 'Compléter', icon: ClipboardList, kind: 'operational' }],
  medoc: [{ to: '/sante/medicaments', label: 'Stock médicaments', shortLabel: 'Stock', icon: Pill, kind: 'operational' }],
};

// Le planning est un calendrier d'activités sans donnée sensible : visible par
// toutes les commissions, en plus de leurs pages dédiées.
const PLANNING_ITEM = { to: '/planning', label: 'Planning', icon: CalendarDays, kind: 'utility' };
// Version allégée de Risques du jour (QUI est à risque, jamais POURQUOI — le
// détail médical est retiré côté backend, cf. NON_MEDICAL_RISK_ROLES dans
// healthController.js) : Orga, Présidentielle et Dreudj, en plus de Santé qui
// garde sa propre page complète sur /sante/risques.
const RISKS_ITEM = { to: '/risques', label: 'Risques du jour', shortLabel: 'Risques', icon: AlertTriangle, kind: 'utility' };
// Un chef de commission gère les comptes de sa propre commission (backend déjà
// en place, cf. requireAgentManagement) — sans ce lien, /admin/agents n'était
// atteignable que par IT, la page restait invisible pour les chefs.
const AGENTS_ITEM = { to: '/admin/agents', label: 'Agents', icon: Users, kind: 'admin' };

// La commission Présidentielle ne compte que deux personnes : la gestion de
// comptes membres n'a pas d'utilité pour elle, même si son chef a le drapeau
// is_commission_lead.
const NO_AGENTS_ROLES = [ROLES.IT, ROLES.PRESIDENTIELLE];

// Chaque chef de commission a une vue d'ensemble sur sa sphère — sauf
// Cuisine, Culturelle et Communication, dont le périmètre (menu du jour,
// planning en lecture, annuaire) n'a rien à agréger. IT et Présidentielle ont
// déjà la leur en page d'accueil, pas besoin d'un lien de nav supplémentaire
// pour ceux-là.
const OVERVIEW_ITEM_BY_ROLE = {
  [ROLES.ORGA]: { to: '/orga/apercu', label: "Vue d'ensemble", shortLabel: 'Accueil', icon: LineChart, kind: 'overview' },
  [ROLES.SANTE]: { to: '/sante/apercu', label: "Vue d'ensemble", shortLabel: 'Accueil', icon: LineChart, kind: 'overview' },
};

// Le chef de la commission Santé configure lui-même les questions posées en
// phase 2 (complément de dossier) — pas d'utilité pour les autres commissions.
const SANTE_QUESTIONS_ITEM = {
  to: '/sante/questions-phase2',
  label: 'Questions dossier médical',
  shortLabel: 'Questions',
  icon: ListChecks,
  kind: 'admin',
};

// Idem pour les critères d'aptitude physique exigés par activité (cf.
// AptitudeCriteriaPage.jsx) — Risques du jour croise ensuite automatiquement
// les restrictions déclarées avec les activités du jour qui les exigent.
const SANTE_CRITERIA_ITEM = { to: '/sante/criteres', label: "Critères d'aptitude", shortLabel: 'Aptitude', icon: HeartPulse, kind: 'admin' };

// Journal d'audit de sa propre commission (scopé côté backend) : proposé à
// tout chef, y compris Cuisine/Culturelle/Présidentielle — contrairement à
// AGENTS_ITEM, il n'y a aucune raison de l'exclure pour ces commissions, un
// chef peut vouloir voir qui a touché à son menu/planning/activités.
const AUDIT_ITEM = { to: '/audit', label: "Journal d'audit", shortLabel: 'Audit', icon: ScrollText, kind: 'admin' };

const ACCOUNT_ITEM = { to: '/mon-compte', label: 'Mon compte', shortLabel: 'Compte', icon: User, kind: 'account' };

// settings vient de GET /platform-settings (cf. platformSettingsApi.js) :
// { registration, phase2, luggage, logistics }, chacun true/false. Absent
// (page pas encore chargée) = traité comme activé, pour ne pas faire
// disparaître un lien le temps du premier chargement.
export function getNavItems(user, settings) {
  if (!user) return [];
  const registrationEnabled = settings?.registration !== false;
  const phase2Enabled = settings?.phase2 !== false;
  // La "journée d'accueil" Orga ne se limite pas à l'enregistrement : bagages
  // (photo/comptage) et logistique (livraison en chambre) en font tout autant
  // partie, cf. requireFeatureEnabled('luggage'|'logistics') côté backend.
  const luggageEnabled = settings?.luggage !== false;
  const logisticsEnabled = settings?.logistics !== false;
  // Chef de pôle (isPoleLead, propre à Orga) : parité complète avec le chef de
  // commission — y compris la gestion des agents et le journal d'audit,
  // AGENTS_ITEM/AUDIT_ITEM sont donc sur isLead comme le reste — et peut en
  // plus jouer tous les sous-rôles (cf. `scoped` plus bas), contrairement au
  // chef de commission qui supervise seulement.
  const isLead = user.isCommissionLead || user.isPoleLead;
  const leadItems = [
    ...(isLead && !NO_AGENTS_ROLES.includes(user.role) ? [AGENTS_ITEM] : []),
    ...(isLead && OVERVIEW_ITEM_BY_ROLE[user.role] ? [OVERVIEW_ITEM_BY_ROLE[user.role]] : []),
    ...(user.isCommissionLead && user.role === ROLES.SANTE ? [SANTE_QUESTIONS_ITEM, SANTE_CRITERIA_ITEM] : []),
    ...(isLead && user.role === ROLES.ORGA ? [ORGA_ROOMS_ADMIN_ITEM, ORGA_DIRECTORY_ITEM] : []),
    ...(isLead && user.role === ROLES.ORGA
      ? [{ to: '/orga/menu', label: 'Menu du jour', shortLabel: 'Menu', icon: UtensilsCrossed, kind: 'admin' }]
      : []),
    ...(isLead ? [AUDIT_ITEM] : []),
  ];
  // Le chef de commission supervise, il n'exécute pas les tâches de sous-rôle :
  // il ne voit aucun des onglets opérationnels ci-dessous, quel que soit son
  // sub_role — seulement leadItems (Vue d'ensemble, config, agents, audit) et
  // Planning. Le chef de pôle (Orga uniquement), lui, peut jouer tous les
  // sous-rôles : il voit les trois onglets opérationnels en plus de leadItems.
  // Exception Santé, cf. plus bas (pas de chef de pôle pour cette commission).
  if (user.role === ROLES.ORGA) {
    // Chaque sous-domaine Orga a son propre interrupteur "journée d'accueil" :
    // enregistrement, bagages (photo/comptage) et logistique (livraison en
    // chambre) disparaissent chacun indépendamment une fois désactivés.
    const subRoleDisabled =
      (user.subRole === 'enregistrement' && !registrationEnabled) ||
      (user.subRole === 'bagages' && !luggageEnabled) ||
      (user.subRole === 'chambres' && !logisticsEnabled);
    const allSubRoleItems = [
      ...(registrationEnabled ? ORGA_ITEMS.enregistrement : []),
      ...(luggageEnabled ? ORGA_ITEMS.bagages : []),
      ...(logisticsEnabled ? ORGA_ITEMS.chambres : []),
    ];
    const scoped = user.isPoleLead
      ? allSubRoleItems
      : user.isCommissionLead
      ? []
      : user.subRole
      ? (subRoleDisabled ? [] : ORGA_ITEMS[user.subRole] || [])
      : allSubRoleItems;
    return [...scoped, RISKS_ITEM, PLANNING_ITEM, ...leadItems, ACCOUNT_ITEM];
  }
  if (user.role === ROLES.SANTE) {
    // Contrairement aux autres commissions, le chef Santé garde ses onglets
    // opérationnels : Risques du jour/Suivi santé ("suivi") restent
    // son travail au quotidien, et "phase2" lui sert à corriger un dossier
    // déjà complété (cf. leadBypassesScope dans App.jsx) — jamais masqué par
    // l'interrupteur phase2Enabled, qui ne concerne que la saisie initiale.
    // "medoc" (stock de médicaments) fait exception à cette exception : le
    // chef n'y a PAS accès (pas de leadBypassesScope côté backend non plus) —
    // le responsable désigné gère seul le stock, le chef se contente de
    // suivre l'évolution en pourcentage depuis sa Vue d'ensemble.
    const scoped = user.isCommissionLead
      ? [...SANTE_ITEMS.suivi, ...SANTE_ITEMS.phase2]
      : user.subRole
      ? (user.subRole === 'phase2' && !phase2Enabled ? [] : SANTE_ITEMS[user.subRole] || [])
      : [...SANTE_ITEMS.suivi, ...(phase2Enabled ? SANTE_ITEMS.phase2 : []), ...SANTE_ITEMS.medoc];
    return [...scoped, PLANNING_ITEM, ...leadItems, ACCOUNT_ITEM];
  }
  return [...(NAV_ITEMS[user.role] || []), ...leadItems, ACCOUNT_ITEM];
}

// Ordre de priorité pour choisir les pages mises en avant dans la barre de
// navigation basse (mobile) : d'abord le tableau de bord d'un chef, puis le
// travail quotidien, puis les pages transverses, puis gestion/compte —
// l'ordre relatif à l'intérieur d'un même type est préservé.
const PRIMARY_KIND_PRIORITY = ['overview', 'operational', 'utility', 'admin', 'account'];

// Jusqu'à 4 pages pour la barre basse mobile — le reste vit dans le tiroir
// "Plus" (cf. getGroupedNavItems). En dessous de 5 pages, pas besoin de
// choisir : la barre affiche tout, il n'y a pas de "Plus".
export function getPrimaryNavItems(items) {
  if (items.length <= 4) return items;
  return PRIMARY_KIND_PRIORITY.flatMap((kind) => items.filter((item) => item.kind === kind)).slice(0, 4);
}

const SECTION_LABEL_BY_KIND = {
  overview: 'Principal',
  operational: 'Principal',
  utility: 'Général',
  admin: 'Gestion',
  account: 'Compte',
};
const SECTION_ORDER = ['Principal', 'Général', 'Gestion', 'Compte'];

// Regroupe la liste complète par section pour le tiroir "Plus" (mobile) et la
// barre latérale (desktop) quand la liste est assez longue pour en avoir
// besoin — cf. le seuil appliqué dans AppLayout.jsx, pas ici : cette fonction
// se contente de grouper, elle ne décide pas si le groupement est utile.
export function getGroupedNavItems(items) {
  const groups = new Map();
  for (const item of items) {
    const label = SECTION_LABEL_BY_KIND[item.kind] || 'Général';
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(item);
  }
  return SECTION_ORDER.filter((label) => groups.has(label)).map((label) => ({ label, items: groups.get(label) }));
}

export const NAV_ITEMS = {
  // Chambres (Orga) et Activités (Présidentielle) ne sont pas du ressort d'IT
  // — retirées du menu, et refusées côté API même via le bypass superuser
  // habituel (cf. requireRoleStrict). IT garde le calendrier en lecture seule
  // via Planning, comme toutes les commissions.
  [ROLES.IT]: [
    { to: '/admin', label: 'Tableau de bord', shortLabel: 'Accueil', icon: LayoutDashboard, kind: 'overview' },
    { to: '/admin/records', label: 'Dossiers', icon: FolderOpen, kind: 'operational' },
    { to: '/admin/agents', label: 'Agents', icon: Users, kind: 'admin' },
    PLANNING_ITEM,
    { to: '/admin/plateforme', label: 'Plateforme', icon: ShieldAlert, kind: 'admin' },
    { to: '/admin/audit', label: "Journal d'audit", shortLabel: 'Audit', icon: ScrollText, kind: 'admin' },
  ],
  [ROLES.CUISINE]: [
    { to: '/cuisine/menu', label: 'Menu du jour', shortLabel: 'Menu', icon: UtensilsCrossed, kind: 'operational' },
    PLANNING_ITEM,
  ],
  [ROLES.COMMUNICATION]: [
    { to: '/communication/annuaire', label: 'Annuaire', icon: Contact, kind: 'operational' },
    PLANNING_ITEM,
  ],
  [ROLES.CULTURELLE]: [PLANNING_ITEM],
  [ROLES.PRESIDENTIELLE]: [
    { to: '/presidentielle', label: "Vue d'ensemble", shortLabel: 'Accueil', icon: LineChart, kind: 'overview' },
    { to: '/presidentielle/annuaire', label: 'Annuaire', icon: Contact, kind: 'operational' },
    { to: '/admin/activites', label: 'Activités', icon: CalendarDays, kind: 'operational' },
    RISKS_ITEM,
  ],
  // Nouvelle commission : pour l'instant, seule capacité prévue — voir qui est
  // à risque aujourd'hui (sans détail médical). À étoffer plus tard si son
  // périmètre s'élargit.
  [ROLES.DREUDJ]: [RISKS_ITEM, PLANNING_ITEM],
};
