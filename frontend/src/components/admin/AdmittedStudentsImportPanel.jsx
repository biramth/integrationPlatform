import { useState } from 'react';
import { Plus, Trash2, ExternalLink, CheckCircle2 } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import Select from '../common/Select';
import { previewAdmittedStudentsFile, confirmAdmittedStudentsImport } from '../../api/importApi';
import { admittedStudentsProgress } from '../../api/admittedStudentsApi';
import { useToast } from '../../hooks/useToast';
import { DEPARTMENTS, DEPARTMENT_LABELS } from '../../utils/departments';

const LIST_LABELS = { principale: 'Liste principale', attente: "Liste d'attente" };

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

export default function AdmittedStudentsImportPanel({ onImported }) {
  const { showToast } = useToast();
  const [file, setFile] = useState(null);
  const [department, setDepartment] = useState('');
  const [candidates, setCandidates] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [lastImport, setLastImport] = useState(null);

  async function handleAnalyze() {
    if (!file) return;
    setAnalyzing(true);
    try {
      const res = await previewAdmittedStudentsFile(file);
      setDepartment(res.detectedDepartment || '');
      setCandidates(res.candidates);
      if (res.candidates.length === 0) {
        showToast("Aucune ligne détectée automatiquement — ajoute les candidats à la main en t'aidant du fichier.", 'info');
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
    setCandidates((rows) => [
      ...(rows || []),
      { firstName: '', lastName: '', birthDate: '', birthPlace: '', listType: 'principale', rank: null },
    ]);
  }

  async function handleConfirm() {
    if (!department) {
      showToast('Département requis avant confirmation.', 'error');
      return;
    }
    const rows = candidates.map((c) => ({ ...c, department }));
    setConfirming(true);
    try {
      const res = await confirmAdmittedStudentsImport(rows);
      const progress = await admittedStudentsProgress();
      showToast(`${res.createdCount} candidat(s) ajouté(s) au référentiel des admis.`, 'success');
      setLastImport({ createdCount: res.createdCount, department, progress: progress.progress });
      setCandidates(null);
      setFile(null);
      onImported?.();
    } catch (err) {
      showToast(err.response?.data?.error || "Erreur lors de l'import.", 'error');
    } finally {
      setConfirming(false);
    }
  }

  function startNewImport() {
    setLastImport(null);
  }

  return (
    <div className="mb-4 flex flex-col gap-4">
      <Card>
        <p className="mb-3 text-sm font-semibold text-foreground">1. Choisir le fichier Excel (.xlsx) de la liste des admis</p>
        <p className="mb-1 text-xs text-muted-foreground">
          Un fichier par département — conversion du PDF officiel en .xlsx au préalable.
        </p>
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

      {lastImport && candidates === null && (
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <p className="text-sm font-semibold text-foreground">
              {lastImport.createdCount} candidat(s) ajouté(s) au référentiel — {DEPARTMENT_LABELS[lastImport.department] || lastImport.department}
            </p>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Ces admis ne sont pas encore des dossiers DUT1 : ils apparaîtront en suggestion quand un agent enregistrera
            la personne dans <strong>Enregistrer → Nouvelle fiche</strong>, en cherchant son nom.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-2">Département</th>
                  <th className="py-2 pr-2">Liste</th>
                  <th className="py-2 pr-2">Total importés</th>
                  <th className="py-2">Déjà associés à un dossier</th>
                </tr>
              </thead>
              <tbody>
                {lastImport.progress.map((row) => (
                  <tr key={`${row.department}-${row.list_type}`} className="border-b border-border/50">
                    <td className="py-1.5 pr-2">{DEPARTMENT_LABELS[row.department] || row.department}</td>
                    <td className="py-1.5 pr-2">{LIST_LABELS[row.list_type] || row.list_type}</td>
                    <td className="py-1.5 pr-2">{row.total}</td>
                    <td className="py-1.5">{row.matched}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="secondary" onClick={startNewImport}>
              Importer un autre fichier
            </Button>
          </div>
        </Card>
      )}

      {candidates !== null && (
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">2. Vérifier et corriger la liste</p>
            <Select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              options={DEPARTMENTS.map((d) => ({ value: d, label: DEPARTMENT_LABELS[d] }))}
              placeholder="Département…"
              className="w-56"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-2">Prénom</th>
                  <th className="py-2 pr-2">Nom</th>
                  <th className="py-2 pr-2">Naissance</th>
                  <th className="py-2 pr-2">Lieu</th>
                  <th className="py-2 pr-2">Liste</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {candidates.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-1.5 pr-2">
                      <RowInput value={row.firstName} onChange={(v) => updateRow(i, { firstName: v })} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <RowInput value={row.lastName} onChange={(v) => updateRow(i, { lastName: v })} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <RowInput type="date" value={row.birthDate} onChange={(v) => updateRow(i, { birthDate: v })} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <RowInput value={row.birthPlace} onChange={(v) => updateRow(i, { birthPlace: v })} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <select
                        value={row.listType}
                        onChange={(e) => updateRow(i, { listType: e.target.value })}
                        className="h-9 rounded-lg border border-border bg-card px-2 text-sm text-foreground"
                      >
                        <option value="principale">Principale</option>
                        <option value="attente">Attente</option>
                      </select>
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
                    <td colSpan={6} className="py-4 text-center text-sm text-muted-foreground">
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
