// Départements « coiffe » : la seule granularité utilisée par les dossiers
// DUT1, le dispatch des chambres et tous les filtres/exports. Les options
// officielles (Génie Informatique et GCBA sont publiés par option au concours)
// ne vivent QUE dans les listes admis importées par la commission IT
// (admitted_students.option_code) — le dispatch mélange volontairement toutes
// les options d'un même département dans les mêmes chambres.
const DEPARTMENTS = ['GC', 'GE', 'GI', 'GM', 'GCBA', 'GB', 'Gestion'];

const DEPARTMENT_LABELS = {
  GC: 'Génie Civil',
  GE: 'Génie Électrique',
  GI: 'Génie Informatique',
  GM: 'Génie Mécanique',
  GCBA: 'Génie Chimique et Biologie Appliquée',
  GB: 'Génie Biomédical',
  Gestion: 'Gestion',
};

// Options par département (listes admis uniquement). Vide = département sans option.
const DEPARTMENT_OPTIONS = {
  GI: [
    { value: 'INFO', label: 'Informatique' },
    { value: 'ITR', label: 'Informatique, Télécommunications et Réseaux' },
  ],
  GCBA: [
    { value: 'IA', label: 'Industrie Alimentaire' },
    { value: 'AB', label: 'Analyse Biologique' },
    { value: 'GC', label: 'Génie Chimique' },
  ],
};

function optionsForDepartment(department) {
  return DEPARTMENT_OPTIONS[department] || [];
}

// Une ligne importée est valide sans option (départements non optionnalisés,
// ou liste mixte saisie à la main) ; si une option est fournie, elle doit
// exister ET appartenir au département déclaré.
function validOptionFor(department, optionCode) {
  if (!optionCode) return true;
  return optionsForDepartment(department).some((o) => o.value === optionCode);
}

const DEPARTMENT_OPTION_LABELS = Object.fromEntries(
  Object.values(DEPARTMENT_OPTIONS).flat().map((o) => [o.value, o.label])
);

// Un même département officiel apparaît sous plusieurs intitulés selon les documents
// (concours, filières...) — utilisé pour la détection automatique du département à
// l'import (Excel) ; l'admin confirme toujours le choix avant de valider l'import,
// ceci ne fait que pré-remplir une suggestion. L'ex-ITR est détecté ici comme GI :
// ce n'est plus qu'une option de Génie Informatique.
const DEPARTMENT_ALIASES = {
  GC: ['genie civil'],
  GE: ['genie electrique', 'electrotechnique'],
  GM: ['genie mecanique'],
  GCBA: ['genie chimique et biologie appliquee', 'biologie appliquee'],
  GI: [
    'informatique, telecommunications et reseaux',
    'informatique telecommunications et reseaux',
    'genie informatique',
    'informatique',
  ],
  GB: ['genie biomedical', 'biomedical'],
  Gestion: ['gestion'],
};

// Détection de l'option dans le texte du fichier. Volontairement conservateur :
// seuls les intitulés non ambigus suggèrent une option ('option genie chimique'
// plutôt que 'genie chimique', qui matcherait déjà le NOM du département GCBA).
const DEPARTMENT_OPTION_ALIASES = {
  ITR: [
    'informatique, telecommunications et reseaux',
    'informatique telecommunications et reseaux',
    'inf tr',
    'itr',
  ],
  INFO: ['option informatique'],
  IA: ['industrie alimentaire'],
  AB: ['analyse biologique'],
  GC: ['option genie chimique'],
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

function matchDepartmentAlias(text) {
  return matchAliasTable(text, DEPARTMENT_ALIASES);
}

function matchDepartmentOptionAlias(text) {
  return matchAliasTable(text, DEPARTMENT_OPTION_ALIASES);
}

module.exports = {
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  DEPARTMENT_OPTIONS,
  DEPARTMENT_OPTION_LABELS,
  DEPARTMENT_ALIASES,
  DEPARTMENT_OPTION_ALIASES,
  optionsForDepartment,
  validOptionFor,
  matchDepartmentAlias,
  matchDepartmentOptionAlias,
};
