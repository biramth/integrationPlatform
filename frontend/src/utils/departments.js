export const DEPARTMENTS = ['GC', 'GE', 'GI', 'GM', 'GCBA', 'GB', 'Gestion'];

export const DEPARTMENT_LABELS = {
  GC: 'Génie Civil',
  GE: 'Génie Électrique',
  GI: 'Génie Informatique',
  GM: 'Génie Mécanique',
  GCBA: 'Génie Chimique et Biologie Appliquée',
  GB: 'Génie Biomédical',
  Gestion: 'Gestion',
};

// Options officielles — uniquement pour les listes admis importées par la
// commission IT. Le dispatch des chambres ignore cette granularité : toutes
// les options d'un département partagent la même « coiffe » department.
export const DEPARTMENT_OPTIONS = {
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

export const DEPARTMENT_OPTION_LABELS = Object.fromEntries(
  Object.values(DEPARTMENT_OPTIONS).flat().map((o) => [o.value, o.label])
);

export function optionsForDepartment(department) {
  return DEPARTMENT_OPTIONS[department] || [];
}
