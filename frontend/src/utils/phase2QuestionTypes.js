export const PHASE2_QUESTION_TYPES = [
  { value: 'texte_court', label: 'Texte court' },
  { value: 'texte_long', label: 'Texte long' },
  { value: 'choix_unique', label: 'Choix unique' },
  { value: 'choix_multiple', label: 'Choix multiple' },
  { value: 'oui_non', label: 'Oui / Non' },
];

export const PHASE2_QUESTION_TYPE_LABELS = Object.fromEntries(PHASE2_QUESTION_TYPES.map((t) => [t.value, t.label]));

export const PHASE2_CHOICE_TYPES = ['choix_unique', 'choix_multiple'];
