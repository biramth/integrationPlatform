// Réponses libres du questionnaire de phase 2 (hors types intégrés
// traitement/allergies/aptitude, qui vivent dans des colonnes/tables
// dédiées) : le récap de complétion et la lecture depuis Suivi santé doivent
// afficher exactement la même chose.
export function formatQuestionAnswer(question, value) {
  if (question.type === 'oui_non') {
    if (value === true) return 'Oui';
    if (value === false) return 'Non';
    return null;
  }
  if (question.type === 'choix_multiple') {
    return Array.isArray(value) && value.length > 0 ? value.join(', ') : null;
  }
  if (typeof value === 'string') {
    return value.trim() ? value : null;
  }
  return value || null;
}

export function isQuestionAnswerEmpty(value) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && !value.trim()) ||
    (Array.isArray(value) && value.length === 0)
  );
}
