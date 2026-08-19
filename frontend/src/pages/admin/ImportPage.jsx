import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Select from '../../components/common/Select';
import PageHeader from '../../components/common/PageHeader';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  previewAdmittedStudentsPdf,
  confirmAdmittedStudentsImport,
  previewRoomsPdf,
  confirmRoomsImport,
} from '../../api/importApi';
import { useToast } from '../../hooks/useToast';
import { DEPARTMENTS, DEPARTMENT_LABELS } from '../../utils/departments';

function RowInput({ value, onChange, type = 'text', className = '' }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={`h-9 w-full min-w-[8rem] rounded-lg border border-slate-300 px-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 ${className}`}
    />
  );
}

function AdmittedStudentsImport() {
  const { showToast } = useToast();
  const [file, setFile] = useState(null);
  const [department, setDepartment] = useState('');
  const [candidates, setCandidates] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleAnalyze() {
    if (!file) return;
    setAnalyzing(true);
    try {
      const res = await previewAdmittedStudentsPdf(file);
      setDepartment(res.detectedDepartment || '');
      setCandidates(res.candidates);
      if (res.candidates.length === 0) {
        showToast(
          "Aucune ligne détectée automatiquement (fréquent sur un PDF scanné) — ajoute les candidats à la main en t'aidant du PDF ouvert à côté.",
          'info'
        );
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Erreur lors de l'analyse du PDF.", 'error');
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
      showToast('Choisis le département avant de confirmer.', 'error');
      return;
    }
    const rows = candidates.map((c) => ({ ...c, department }));
    setConfirming(true);
    try {
      const res = await confirmAdmittedStudentsImport(rows);
      showToast(`${res.createdCount} candidat(s) ajouté(s) au référentiel des admis.`, 'success');
      setCandidates(null);
      setFile(null);
    } catch (err) {
      showToast(err.response?.data?.error || "Erreur lors de l'import.", 'error');
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="mb-3 text-sm font-semibold text-foreground">1. Choisir le PDF de la liste des admis</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Un fichier par département. Si le PDF est un scan (sans texte numérique), l'analyse passe par OCR et peut
          prendre 1 à 2 minutes — les résultats bruts sont rarement parfaits, prévois de corriger le tableau ci-dessous.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="file"
            accept="application/pdf"
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
                        className="h-9 rounded-lg border border-slate-300 px-2 text-sm"
                      >
                        <option value="principale">Principale</option>
                        <option value="attente">Attente</option>
                      </select>
                    </td>
                    <td className="py-1.5">
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="text-red-600 transition-colors hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {candidates.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-sm text-muted-foreground">
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
              className="flex items-center gap-1 text-xs text-blue-800 transition-colors hover:underline"
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

function RoomsImport() {
  const { showToast } = useToast();
  const [file, setFile] = useState(null);
  const [candidates, setCandidates] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleAnalyze() {
    if (!file) return;
    setAnalyzing(true);
    try {
      const res = await previewRoomsPdf(file);
      setCandidates(res.candidates);
      if (res.candidates.length === 0) {
        showToast("Aucune ligne détectée automatiquement — ajoute les chambres à la main en t'aidant du PDF.", 'info');
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Erreur lors de l'analyse du PDF.", 'error');
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
    } catch (err) {
      showToast(err.response?.data?.error || "Erreur lors de l'import.", 'error');
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="mb-3 text-sm font-semibold text-foreground">1. Choisir le PDF de la liste des chambres</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="file"
            accept="application/pdf"
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
                        className="h-9 rounded-lg border border-slate-300 px-2 text-sm"
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
                        className="text-red-600 transition-colors hover:text-red-700"
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
              className="flex items-center gap-1 text-xs text-blue-800 transition-colors hover:underline"
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

export default function ImportPage() {
  const [tab, setTab] = useState('students');

  return (
    <div>
      <PageHeader
        title="Import PDF"
        description="Importe la liste des admis au concours (par département) ou la liste des chambres. Relis et corrige toujours le tableau avant de confirmer."
      />

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList className="h-11 p-1">
          <TabsTrigger value="students" className="px-3 text-sm">
            Étudiants admis
          </TabsTrigger>
          <TabsTrigger value="rooms" className="px-3 text-sm">
            Chambres
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'students' ? <AdmittedStudentsImport /> : <RoomsImport />}
    </div>
  );
}
