// Regroupe les lignes de /admitted-students/progress (une par département ×
// liste) en une entrée par département.
export function summarizeImportProgress(progress = []) {
  const byDept = {};
  for (const row of progress) {
    const entry = (byDept[row.department] ||= { principale: 0, attente: 0, total: 0, matched: 0, lastImportedAt: null });
    entry[row.list_type] = (entry[row.list_type] || 0) + row.total;
    entry.total += row.total;
    entry.matched += row.matched;
    if (row.last_imported_at && (!entry.lastImportedAt || row.last_imported_at > entry.lastImportedAt)) {
      entry.lastImportedAt = row.last_imported_at;
    }
  }
  return byDept;
}

export function formatImportDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
