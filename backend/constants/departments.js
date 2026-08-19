const DEPARTMENTS = ['GC', 'GE', 'GI', 'GM', 'GCBA', 'Gestion'];

const DEPARTMENT_LABELS = {
  GC: 'Génie Civil',
  GE: 'Génie Électrique',
  GI: 'Génie Informatique',
  GM: 'Génie Mécanique',
  GCBA: 'Génie Chimique et Biologie Appliquée',
  Gestion: 'Gestion',
};

// Un même département officiel apparaît sous plusieurs intitulés selon les documents
// (concours, filières...) — ex. Génie Informatique est aussi désigné "Informatique" tout
// court ou "Informatique, Télécommunications et Réseaux". Utilisé pour la détection
// automatique du département à l'import (Excel) ; l'admin confirme toujours le choix
// avant de valider l'import, ceci ne fait que pré-remplir une suggestion.
const DEPARTMENT_ALIASES = {
  GC: ['genie civil'],
  GE: ['genie electrique', 'electrotechnique'],
  GI: [
    'genie informatique',
    'informatique, telecommunications et reseaux',
    'informatique telecommunications et reseaux',
    'informatique',
  ],
  GM: ['genie mecanique'],
  GCBA: ['genie chimique et biologie appliquee', 'genie chimique', 'biologie appliquee'],
  Gestion: ['gestion'],
};

function normalizeText(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function matchDepartmentAlias(text) {
  const normalized = normalizeText(text);
  if (!normalized.trim()) return null;
  for (const [code, aliases] of Object.entries(DEPARTMENT_ALIASES)) {
    for (const alias of aliases) {
      if (normalized.includes(alias)) return code;
    }
  }
  return null;
}

module.exports = { DEPARTMENTS, DEPARTMENT_LABELS, DEPARTMENT_ALIASES, matchDepartmentAlias };
