export function formatBirthDate(birthDate) {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return birthDate;
  return d.toLocaleDateString('fr-FR');
}
