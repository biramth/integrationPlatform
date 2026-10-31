import { useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { previewContactsCsvFile, confirmContactsCsvImport } from '../../api/importApi';
import { useToast } from '../../hooks/useToast';

function RowInput({ value, onChange, type = 'text', className = '' }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={`h-9 w-full min-w-[8rem] rounded-lg border border-border bg-card px-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary ${className}`}
    />
  );
}

export default function ContactsCsvImportPanel({ onImported }) {
  const { showToast } = useToast();
  const [file, setFile] = useState(null);
  const [candidates, setCandidates] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const nextKeyRef = useRef(0);
  const withKey = (row) => ({ ...row, _key: nextKeyRef.current++ });

  async function handleAnalyze() {
    if (!file) return;
    setAnalyzing(true);
    try {
      const res = await previewContactsCsvFile(file);
      setCandidates(res.rows.map(withKey));
      if (res.rows.length === 0) {
        showToast("Aucune ligne détectée automatiquement. Vérifiez le format du fichier.", 'info');
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Erreur lors de l'analyse du fichier.", 'error');
    } finally {
      setAnalyzing(false);
    }
  }

  function updateRow(key, patch) {
    setCandidates((rows) => rows.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key) {
    setCandidates((rows) => rows.filter((r) => r._key !== key));
  }

  function addRow() {
    setCandidates((rows) => [...(rows || []), withKey({ lastName: '', firstName: '', gender: 'M', department: 'Gestion', phoneNumber: '', emergencyContact: { name: '', phone: '' } })]);
  }

  async function handleConfirm() {
    setConfirming(true);
    try {
      const res = await confirmContactsCsvImport(
        candidates.map((c) => {
          const clean = { ...c };
          delete clean._key;
          return clean;
        })
      );
      showToast(`${res.createdCount} dossier(s) importé(s)${res.skippedCount ? `, ${res.skippedCount} ignoré(s)` : ''}.`, 'success');
      setCandidates(null);
      setFile(null);
      onImported?.();
    } catch (err) {
      showToast(err.response?.data?.error || "Erreur lors de l'import.", 'error');
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="mb-4 flex flex-col gap-4">
      <Card>
        <p className="mb-1 text-sm font-semibold text-foreground">1. Choisir le fichier CSV "Vos coordonnées" (formulaires Google Forms)</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Le fichier doit contenir les colonnes : Horodateur, Nom, Prénom, Genre, Département, Téléphone DUT1, Personne de contact d'urgence, Téléphone contact.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
          <Button type="button" onClick={handleAnalyze} loading={analyzing} disabled={!file}>
            Analyser
          </Button>
        </div>
      </Card>

      {candidates !== null && (
        <Card>
          <p className="mb-3 text-sm font-semibold text-foreground">2. Vérifier et corriger la liste</p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-2">Nom</th>
                  <th className="py-2 pr-2">Prénom</th>
                  <th className="py-2 pr-2">Genre</th>
                  <th className="py-2 pr-2">Département</th>
                  <th className="py-2 pr-2">Téléphone</th>
                  <th className="py-2 pr-2">Contact d'urgence</th>
                  <th className="py-2 pr-2">Téléphone contact</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {candidates.map((row) => (
                  <tr key={row._key} className="border-b border-border/50">
                    <td className="py-1.5 pr-2">
                      <RowInput value={row.lastName} onChange={(v) => updateRow(row._key, { lastName: v })} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <RowInput value={row.firstName} onChange={(v) => updateRow(row._key, { firstName: v })} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <select
                        value={row.gender}
                        onChange={(e) => updateRow(row._key, { gender: e.target.value })}
                        className="h-9 rounded-lg border border-border bg-card px-2 text-sm text-foreground"
                      >
                        <option value="M">M</option>
                        <option value="F">F</option>
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <RowInput value={row.department} onChange={(v) => updateRow(row._key, { department: v })} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <RowInput value={row.phoneNumber} onChange={(v) => updateRow(row._key, { phoneNumber: v })} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <RowInput value={row.emergencyContact?.name || ''} onChange={(v) => updateRow(row._key, { emergencyContact: { ...row.emergencyContact, name: v } })} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <RowInput value={row.emergencyContact?.phone || ''} onChange={(v) => updateRow(row._key, { emergencyContact: { ...row.emergencyContact, phone: v } })} />
                    </td>
                    <td className="py-1.5">
                      <button
                        type="button"
                        onClick={() => removeRow(row._key)}
                        className="text-danger transition-colors hover:opacity-80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {candidates.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-4 text-center text-sm text-muted-foreground">
                      Aucune ligne pour l'instant.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1 text-xs text-role-accent transition-colors hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
            </button>
            <Button onClick={handleConfirm} loading={confirming} disabled={candidates.length === 0}>
              Confirmer l'import ({candidates.length} ligne{candidates.length > 1 ? 's' : ''})
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
