export const TREATMENT_SLOT_LABELS = { matin: 'Matin', midi: 'Midi', soir: 'Soir' };

// Bloc de saisie d'un traitement déclaré, identique à la page Traitements :
// médicament du stock ou personnel, posologie, créneaux, dates. Par défaut
// tous les créneaux sont activés (même philosophie que la migration — mieux
// vaut proposer une prise que la rater), l'agent ajuste ensuite.
export function emptyTreatment() {
  return {
    medicationId: '',
    medicationLabel: '',
    dosage: '',
    slots: { matin: true, midi: true, soir: true },
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    notes: '',
  };
}

// Préremplissage d'un traitement déclaré depuis sa version en base (créée
// lors d'une complétion précédente ou par la migration) : une correction
// repart des valeurs réelles, pas d'un formulaire vierge. L'id est conservé
// pour que le backend mette CE traitement à jour au lieu d'en créer un doublon.
export function treatmentFromApi(t) {
  return {
    id: t.id,
    medicationId: t.medicationId ? String(t.medicationId) : '',
    medicationLabel: !t.medicationId && t.medicationName !== 'Médicament non précisé' ? t.medicationName : '',
    dosage: t.dosage || '',
    slots: { ...t.slots },
    startDate: t.startDate,
    endDate: t.endDate || '',
    notes: t.notes || '',
  };
}

// Résumé lisible pour le récap de confirmation : "Médicament — posologie —
// Matin, Soir — depuis le … au …".
export function treatmentSummary(treatment, medicationNameById = {}) {
  const parts = [];
  if (treatment.medicationId) {
    parts.push(medicationNameById[treatment.medicationId] || 'Médicament non précisé');
  } else if (treatment.medicationLabel.trim()) {
    parts.push(treatment.medicationLabel.trim());
  }
  if (treatment.dosage.trim()) parts.push(treatment.dosage.trim());
  const slots = Object.keys(TREATMENT_SLOT_LABELS).filter((k) => treatment.slots[k]);
  if (slots.length > 0) parts.push(slots.map((k) => TREATMENT_SLOT_LABELS[k]).join(', '));
  let period = `depuis le ${treatment.startDate}`;
  if (treatment.endDate) period += ` au ${treatment.endDate}`;
  parts.push(period);
  return parts.join(' — ');
}
