// Les 10 départements officiels, chacun à part entière : dossiers DUT1,
// listes admis, dispatch des chambres (qui sépare donc aussi les options de
// Génie Informatique et de GCBA) et tous les filtres/exports.
const DEPARTMENTS = ['GC', 'GE', 'INFO', 'ITR', 'GM', 'IA', 'BA', 'GCH', 'GB', 'Gestion'];

const DEPARTMENT_LABELS = {
  GC: 'Génie Civil',
  GE: 'Génie Électrique',
  INFO: 'Génie Informatique option Informatique',
  ITR: 'Génie Informatique option Télécommunication Réseaux',
  GM: 'Génie Mécanique',
  IA: 'GCBA option Industrie Alimentaire',
  BA: 'GCBA option Biologie Appliquée',
  GCH: 'GCBA option Génie Chimique',
  GB: 'Licence Biomédical',
  Gestion: 'Gestion',
};

// Détection automatique à l'import (Excel) — l'admin confirme toujours le
// choix avant de valider, ceci ne fait que pré-remplir une suggestion. Deux
// tables parce que le fichier officiel annonce souvent la filière et l'option
// sur des lignes différentes : FAMILY_ALIASES reconnaît la filière (GI et
// GCBA sont des filières, pas des départements), OPTION_ALIASES l'option, qui
// l'emporte quand elle est trouvée.
const FAMILY_ALIASES = {
  GC: ['genie civil'],
  GE: ['genie electrique', 'electrotechnique'],
  GM: ['genie mecanique'],
  GCBA: ['genie chimique et biologie appliquee'],
  GI: ['genie informatique'],
  GB: ['genie biomedical', 'licence biomedical', 'biomedical'],
  Gestion: ['gestion'],
};

// Volontairement conservateur : seuls les intitulés non ambigus suggèrent une
// option ('option genie chimique' plutôt que 'genie chimique', qui matcherait
// déjà le nom de la filière GCBA).
const OPTION_ALIASES = {
  ITR: [
    'informatique, telecommunications et reseaux',
    'informatique telecommunications et reseaux',
    'telecommunication',
    'inf tr',
    'itr',
  ],
  INFO: ['option informatique'],
  IA: ['industrie alimentaire'],
  BA: ['option biologie appliquee', 'analyse biologique'],
  GCH: ['option genie chimique'],
};

function normalizeText(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function matchAliasTable(text, table) {
  const normalized = normalizeText(text);
  if (!normalized.trim()) return null;
  for (const [code, aliases] of Object.entries(table)) {
    for (const alias of aliases) {
      if (normalized.includes(alias)) return code;
    }
  }
  return null;
}

function matchFamilyAlias(text) {
  return matchAliasTable(text, FAMILY_ALIASES);
}

function matchOptionAlias(text) {
  return matchAliasTable(text, OPTION_ALIASES);
}

// Filière + option détectées → département. GI / GCBA sans option reconnue
// restent sans suggestion : l'admin choisit l'option à la main.
function resolveDetectedDepartment(family, option) {
  if (option) return option;
  if (family && DEPARTMENTS.includes(family)) return family;
  return null;
}

module.exports = {
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  matchFamilyAlias,
  matchOptionAlias,
  resolveDetectedDepartment,
};
