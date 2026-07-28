// Configuration provisoire des questions de la phase 2 (infos complémentaires).
// Les allergies sont gérées séparément (sélection structurée, voir AllergySelect.jsx).
// La vraie liste des autres questions (personnalité, etc.) sera fournie plus tard :
// il suffira d'ajouter/modifier des entrées ici, sans toucher au composant Dut1ComplementaryForm.
export const DUT1_COMPLEMENTARY_FIELDS = [
  { key: 'personnalite', label: 'Traits de personnalité', type: 'textarea' },
  { key: 'remarques', label: 'Remarques diverses', type: 'textarea' },
];
