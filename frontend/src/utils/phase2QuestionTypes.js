// Types "libres" : proposés au chef Santé dans le sélecteur de type quand il
// ajoute ou modifie une question.
export const PHASE2_QUESTION_TYPES = [
  { value: 'texte_court', label: 'Texte court' },
  { value: 'texte_long', label: 'Texte long' },
  { value: 'choix_unique', label: 'Choix unique' },
  { value: 'choix_multiple', label: 'Choix multiple' },
  { value: 'oui_non', label: 'Oui / Non' },
];

// Types "intégrés" : traitement/allergies, câblés sur des colonnes/tables
// dédiées de dut1_records (pas extra_fields_json) — jamais proposés à la
// création, leur type ne se modifie pas depuis l'éditeur.
export const PHASE2_BUILTIN_TYPE_LABELS = {
  traitement_medical: 'Traitement médical (intégré)',
  allergies: 'Allergies (intégré)',
};

export const PHASE2_QUESTION_TYPE_LABELS = {
  ...Object.fromEntries(PHASE2_QUESTION_TYPES.map((t) => [t.value, t.label])),
  ...PHASE2_BUILTIN_TYPE_LABELS,
};

export const PHASE2_CHOICE_TYPES = ['choix_unique', 'choix_multiple'];

// traitement_medical et allergies alimentent Risques du jour et le
// croisement menu/allergènes ailleurs sur le site : suppression bloquée
// côté backend, ce sont les deux seuls types intégrés.
export const PHASE2_LOCKED_DELETE_TYPES = ['traitement_medical', 'allergies'];

export const PHASE2_BUILTIN_TYPES = ['traitement_medical', 'allergies'];

export function isPhase2QuestionLocked(type) {
  return PHASE2_BUILTIN_TYPES.includes(type);
}
