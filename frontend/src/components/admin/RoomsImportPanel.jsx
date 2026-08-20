import { useState } from 'react';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { previewRoomsFile, confirmRoomsImport } from '../../api/importApi';
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

export default function RoomsImportPanel({ onImported }) {
  const { showToast } = useToast();
  const [file, setFile] = useState(null);
  const [candidates, setCandidates] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleAnalyze() {
    if (!file) return;
    setAnalyzing(true);
    try {
      const res = await previewRoomsFile(file);
      setCandidates(res.candidates);
      if (res.candidates.length === 0) {
        showToast("Aucune ligne détectée automatiquement — ajoute les chambres à la main en t'aidant du fichier.", 'info');
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Erreur lors de l'analyse du fichier.", 'error');
    } finally {
      setAnalyzing(false);
    }
  }

  function updateRow(index, patch) {
    setCandidates((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRow(index) {
    setCandidates((rows) => rows.filter((_, i) => i !== index));
  }

  function addRow() {
    setCandidates((rows) => [...(rows || []), { label: '', gender: 'M', capacity: '', building: '' }]);
  }

  async function handleConfirm() {
    setConfirming(true);
    try {
      const res = await confirmRoomsImport(candidates);
      showToast(`${res.createdCount} chambre(s) créée(s)${res.skippedCount ? `, ${res.skippedCount} ignorée(s)` : ''}.`, 'success');
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
        <p className="mb-1 text-sm font-semibold text-foreground">1. Choisir le fichier Excel (.xlsx) de la liste des chambres</p>
        <a
          href="https://www.ilovepdf.com/fr/pdf_en_excel"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-role-accent hover:underline"
        >
          <ExternalLink className="h-3 w-3" /> Convertir un PDF en Excel (iLovePDF)
        </a>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="file"
            accept=".xlsx"
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
                  <th className="py-2 pr-2">Label</th>
                  <th className="py-2 pr-2">Genre</th>
                  <th className="py-2 pr-2">Capacité</th>
                  <th className="py-2 pr-2">Bâtiment</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {candidates.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-1.5 pr-2">
                      <RowInput value={row.label} onChange={(v) => updateRow(i, { label: v })} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <select
                        value={row.gender}
                        onChange={(e) => updateRow(i, { gender: e.target.value })}
                        className="h-9 rounded-lg border border-border bg-card px-2 text-sm text-foreground"
                      >
                        <option value="M">Masculin</option>
                        <option value="F">Féminin</option>
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <RowInput type="number" value={row.capacity} onChange={(v) => updateRow(i, { capacity: v })} className="w-20" />
                    </td>
                    <td className="py-1.5 pr-2">
                      <RowInput value={row.building} onChange={(v) => updateRow(i, { building: v })} />
                    </td>
                    <td className="py-1.5">
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="text-danger transition-colors hover:opacity-80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {candidates.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-sm text-muted-foreground">
                      Aucune ligne pour l'instant — utilise « Ajouter une ligne ».
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
