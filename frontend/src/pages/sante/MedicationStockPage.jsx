import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, PackagePlus, PackageMinus, ClipboardEdit, History } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import * as medicationApi from '../../api/medicationApi';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import PageHeader from '../../components/common/PageHeader';
import MedicationStockBar from '../../components/health/MedicationStockBar';
import { confirm } from '../../components/common/confirmService';
import { ErrorState, EmptyState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { useToast } from '../../hooks/useToast';
import { staggerStyle } from '../../utils/stagger';

const EMPTY_FORM = { name: '', unit: 'unité(s)', referenceStock: '', alertThresholdPercent: '20' };

const MOVEMENT_META = {
  entree: { title: 'Entrée de stock', quantityLabel: 'Quantité ajoutée', icon: PackagePlus },
  sortie: { title: 'Sortie de stock', quantityLabel: 'Quantité retirée', icon: PackageMinus },
  ajustement: { title: 'Ajustement (recomptage)', quantityLabel: 'Nouveau stock compté', icon: ClipboardEdit },
};

function formatMovement(m) {
  const sign = m.quantity > 0 ? '+' : '';
  return `${sign}${m.quantity}`;
}

export default function MedicationStockPage() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useFetch(medicationApi.listMedications, []);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const [movementTarget, setMovementTarget] = useState(null); // { medication, type }
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [recording, setRecording] = useState(false);

  const [historyId, setHistoryId] = useState(null);
  const [historyByMedication, setHistoryByMedication] = useState({});
  const [historyLoading, setHistoryLoading] = useState(false);

  const medications = data?.medications || [];

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await medicationApi.createMedication({
        name: form.name,
        unit: form.unit,
        referenceStock: Number(form.referenceStock),
        alertThresholdPercent: Number(form.alertThresholdPercent),
      });
      setForm(EMPTY_FORM);
      showToast('Médicament ajouté.', 'success');
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur lors de la création.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(medication) {
    setEditingId(medication.id);
    setEditForm({
      name: medication.name,
      unit: medication.unit,
      referenceStock: String(medication.reference_stock),
      alertThresholdPercent: String(medication.alert_threshold_percent),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
  }

  async function saveEdit(id) {
    setSaving(true);
    try {
      await medicationApi.updateMedication(id, {
        name: editForm.name,
        unit: editForm.unit,
        referenceStock: Number(editForm.referenceStock),
        alertThresholdPercent: Number(editForm.alertThresholdPercent),
      });
      showToast('Médicament mis à jour.', 'success');
      cancelEdit();
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Mise à jour impossible.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(medication) {
    if (!(await confirm({ message: `Supprimer "${medication.name}" du stock ?`, danger: true }))) return;
    try {
      await medicationApi.deleteMedication(medication.id);
      showToast('Médicament supprimé.', 'success');
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Suppression impossible.', 'error');
    }
  }

  function openMovement(medication, type) {
    setMovementTarget({ medication, type });
    setQuantity(type === 'ajustement' ? String(medication.current_stock) : '');
    setNote('');
  }

  async function confirmMovement(e) {
    e.preventDefault();
    setRecording(true);
    try {
      await medicationApi.recordMovement(movementTarget.medication.id, {
        type: movementTarget.type,
        quantity: Number(quantity),
        note: note.trim() || undefined,
      });
      showToast('Stock mis à jour.', 'success');
      setMovementTarget(null);
      reload();
      setHistoryByMedication((prev) => {
        const next = { ...prev };
        delete next[movementTarget.medication.id];
        return next;
      });
    } catch (err) {
      showToast(err.response?.data?.error || 'Enregistrement impossible.', 'error');
    } finally {
      setRecording(false);
    }
  }

  async function toggleHistory(medication) {
    if (historyId === medication.id) {
      setHistoryId(null);
      return;
    }
    setHistoryId(medication.id);
    if (!historyByMedication[medication.id]) {
      setHistoryLoading(true);
      try {
        const res = await medicationApi.listMovements(medication.id);
        setHistoryByMedication((prev) => ({ ...prev, [medication.id]: res.movements }));
      } catch (err) {
        showToast(err.response?.data?.error || "Erreur lors du chargement de l'historique.", 'error');
      } finally {
        setHistoryLoading(false);
      }
    }
  }

  const movementMeta = movementTarget ? MOVEMENT_META[movementTarget.type] : null;

  return (
    <div>
      <PageHeader
        title="Stock de médicaments"
        description="Chaque entrée, sortie ou ajustement de stock est enregistrée — le chef de la commission Santé suit l'évolution en pourcentage depuis sa Vue d'ensemble."
      />

      <Card className="mb-6">
        <p className="mb-3 text-sm font-semibold text-foreground">Ajouter un médicament</p>
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Input
            label="Nom"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input label="Unité" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
          <Input
            label="Stock de référence"
            type="number"
            min={1}
            required
            value={form.referenceStock}
            onChange={(e) => setForm((f) => ({ ...f, referenceStock: e.target.value }))}
          />
          <Input
            label="Seuil d'alerte (%)"
            type="number"
            min={0}
            max={100}
            value={form.alertThresholdPercent}
            onChange={(e) => setForm((f) => ({ ...f, alertThresholdPercent: e.target.value }))}
          />
          <div className="sm:col-span-4 flex justify-end">
            <Button type="submit" loading={submitting}>
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </div>
        </form>
      </Card>

      {loading && <CardListSkeleton />}
      {error && <ErrorState label={error} onRetry={reload} />}
      {!loading && !error && medications.length === 0 && <EmptyState label="Aucun médicament configuré." />}

      {!loading && !error && medications.length > 0 && (
        <div className="flex flex-col gap-3">
          {medications.map((medication, i) => {
            const isEditing = editingId === medication.id;
            const isHistoryOpen = historyId === medication.id;
            return (
              <div key={medication.id} className="animate-fade-in-up" style={staggerStyle(i)}>
                <Card className="flex flex-col gap-3">
                  {isEditing ? (
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                        <Input
                          label="Nom"
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        />
                        <Input
                          label="Unité"
                          value={editForm.unit}
                          onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))}
                        />
                        <Input
                          label="Stock de référence"
                          type="number"
                          min={1}
                          value={editForm.referenceStock}
                          onChange={(e) => setEditForm((f) => ({ ...f, referenceStock: e.target.value }))}
                        />
                        <Input
                          label="Seuil d'alerte (%)"
                          type="number"
                          min={0}
                          max={100}
                          value={editForm.alertThresholdPercent}
                          onChange={(e) => setEditForm((f) => ({ ...f, alertThresholdPercent: e.target.value }))}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={cancelEdit} className="px-3 py-1.5 text-xs">
                          <X className="h-3.5 w-3.5" /> Annuler
                        </Button>
                        <Button onClick={() => saveEdit(medication.id)} loading={saving} className="px-3 py-1.5 text-xs">
                          <Check className="h-3.5 w-3.5" /> Enregistrer
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <MedicationStockBar medication={medication} />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => openMovement(medication, 'entree')}>
                          <PackagePlus className="h-3.5 w-3.5" /> Entrée
                        </Button>
                        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => openMovement(medication, 'sortie')}>
                          <PackageMinus className="h-3.5 w-3.5" /> Sortie
                        </Button>
                        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => openMovement(medication, 'ajustement')}>
                          <ClipboardEdit className="h-3.5 w-3.5" /> Ajuster
                        </Button>
                        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => toggleHistory(medication)}>
                          <History className="h-3.5 w-3.5" /> Historique
                        </Button>
                        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => startEdit(medication)}>
                          <Pencil className="h-3.5 w-3.5" /> Modifier
                        </Button>
                        <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => handleDelete(medication)}>
                          <Trash2 className="h-3.5 w-3.5" /> Supprimer
                        </Button>
                      </div>
                      {isHistoryOpen && (
                        <div className="rounded-lg border border-border bg-muted/30 p-3">
                          {historyLoading && !historyByMedication[medication.id] ? (
                            <p className="text-sm text-muted-foreground">Chargement…</p>
                          ) : historyByMedication[medication.id]?.length ? (
                            <ul className="flex flex-col gap-1.5 text-sm">
                              {historyByMedication[medication.id].map((m) => (
                                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                  <span className="text-muted-foreground">
                                    {new Date(m.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    {' — '}
                                    {m.recorded_by_name}
                                    {m.note ? ` — ${m.note}` : ''}
                                  </span>
                                  <span className="shrink-0 font-medium tabular-nums text-foreground">
                                    {formatMovement(m)} → {m.stock_after}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground">Aucun mouvement enregistré.</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!movementTarget} onClose={() => setMovementTarget(null)} title={movementMeta?.title || ''}>
        {movementTarget && (
          <form onSubmit={confirmMovement} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {movementTarget.medication.name} — stock actuel : {movementTarget.medication.current_stock} {movementTarget.medication.unit}
            </p>
            <Input
              label={movementMeta.quantityLabel}
              type="number"
              min={0}
              required
              autoFocus
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <Input label="Note (optionnel)" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
              <Button type="button" variant="secondary" onClick={() => setMovementTarget(null)}>
                Annuler
              </Button>
              <Button type="submit" loading={recording}>
                Confirmer
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
