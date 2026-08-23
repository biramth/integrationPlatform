import { useState } from 'react';
import { Search, Check, X } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { listDut1 } from '../../api/dut1Api';
import { listMedications } from '../../api/medicationApi';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { LoadingState } from '../common/StateViews';
import { DEPARTMENT_LABELS } from '../../utils/departments';

const SLOT_OPTIONS = [
  { key: 'matin', label: 'Matin' },
  { key: 'midi', label: 'Midi' },
  { key: 'soir', label: 'Soir' },
];

const EMPTY_FORM = {
  medicationId: '',
  medicationLabel: '',
  dosage: '',
  slots: { matin: false, midi: false, soir: false },
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  notes: '',
};

const NO_STOCK_MEDICATION = '__none__';

// Création / édition d'un traitement. À la création, le DUT1 est choisi par
// recherche (même principe que Suivi santé) ; en édition, le patient est fixe.
export default function TreatmentFormModal({ open, onClose, editingTreatment, onSaved }) {
  const [selectedDut1, setSelectedDut1] = useState(
    editingTreatment
      ? { id: editingTreatment.dut1Id, first_name: editingTreatment.firstName, last_name: editingTreatment.lastName }
      : null
  );
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [form, setForm] = useState(() => {
    if (!editingTreatment) return EMPTY_FORM;
    return {
      medicationId: editingTreatment.medicationId ? String(editingTreatment.medicationId) : '',
      // Le nom affiché peut venir du stock (source de vérité) : on ne le
      // recopie dans le label libre que si c'était un médicament personnel.
      medicationLabel:
        !editingTreatment.medicationId && editingTreatment.medicationName !== 'Médicament non précisé'
          ? editingTreatment.medicationName
          : '',
      dosage: editingTreatment.dosage || '',
      slots: { ...editingTreatment.slots },
      startDate: editingTreatment.startDate,
      endDate: editingTreatment.endDate || '',
      notes: editingTreatment.notes || '',
    };
  });
  const [submitting, setSubmitting] = useState(false);

  const dut1Search = useFetch(
    () =>
      open && !editingTreatment && !selectedDut1 && debouncedSearch.trim().length >= 2
        ? listDut1({ search: debouncedSearch.trim(), pageSize: 8 })
        : Promise.resolve(null),
    [open, editingTreatment, selectedDut1, debouncedSearch]
  );
  const medicationsFetch = useFetch(() => (open ? listMedications() : Promise.resolve(null)), [open]);
  const medications = medicationsFetch.data?.medications || [];

  function toggleSlot(key) {
    setForm((f) => ({ ...f, slots: { ...f.slots, [key]: !f.slots[key] } }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedDut1) return;
    setSubmitting(true);
    try {
      await onSaved({
        dut1Id: selectedDut1.id,
        medicationId: form.medicationId ? Number(form.medicationId) : null,
        medicationLabel: form.medicationLabel.trim(),
        dosage: form.dosage.trim(),
        slots: form.slots,
        startDate: form.startDate,
        endDate: form.endDate || null,
        notes: form.notes.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingTreatment ? 'Modifier le traitement' : 'Nouveau traitement'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {editingTreatment || selectedDut1 ? (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
            <p className="text-sm font-medium text-foreground">
              {selectedDut1?.first_name} {selectedDut1?.last_name}
            </p>
            {!editingTreatment && (
              <button
                type="button"
                onClick={() => setSelectedDut1(null)}
                className="text-xs text-role-accent transition-opacity hover:opacity-70"
              >
                Changer
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Input
              icon={Search}
              placeholder="Rechercher un DUT1 (nom, prénom…) — au moins 2 caractères"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {dut1Search.loading && <LoadingState />}
            {dut1Search.error && <p className="text-sm text-danger">{dut1Search.error}</p>}
            {debouncedSearch.trim().length < 2 && !selectedDut1 && (
              <p className="text-sm text-muted-foreground">Saisissez au moins 2 caractères pour rechercher.</p>
            )}
            {(dut1Search.data?.records || []).length > 0 && (
              <div className="flex flex-col gap-1">
                {dut1Search.data.records.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => setSelectedDut1(record)}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="font-medium text-foreground">
                      {record.first_name} {record.last_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {DEPARTMENT_LABELS[record.department] || record.department}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {!dut1Search.loading && debouncedSearch.trim().length >= 2 && (dut1Search.data?.records || []).length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun dossier trouvé.</p>
            )}
          </div>
        )}

        {selectedDut1 && (
          <>
            <Select
              label="Médicament du stock (optionnel)"
              placeholder="Médicament personnel / hors stock"
              value={form.medicationId || NO_STOCK_MEDICATION}
              onChange={(e) =>
                setForm((f) => ({ ...f, medicationId: e.target.value === NO_STOCK_MEDICATION ? '' : e.target.value }))
              }
              options={[
                { value: NO_STOCK_MEDICATION, label: '— Médicament personnel / hors stock —' },
                ...medications.map((m) => ({ value: String(m.id), label: m.name })),
              ]}
            />
            <Input
              label={`Libellé libre ${form.medicationId ? '(optionnel)' : '(médicament personnel)'}`}
              placeholder="Ex : Paracétamol apporté par la famille"
              value={form.medicationLabel}
              onChange={(e) => setForm((f) => ({ ...f, medicationLabel: e.target.value }))}
            />
            <Input
              label="Posologie (optionnel)"
              placeholder="Ex : 1 comprimé, 5 ml…"
              value={form.dosage}
              onChange={(e) => setForm((f) => ({ ...f, dosage: e.target.value }))}
            />

            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Créneaux de prise</p>
              <div className="grid grid-cols-3 gap-2">
                {SLOT_OPTIONS.map(({ key, label }) => {
                  const active = form.slots[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleSlot(key)}
                      className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? 'border-role-accent bg-role-accent-soft text-role-accent'
                          : 'border-border text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      {active ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />} {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Date de début"
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
              <Input
                label="Date de fin (optionnel)"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>

            <Input
              label="Notes (optionnel)"
              placeholder="Ex : à prendre au repas du soir"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />

            <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
              <Button type="button" variant="secondary" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" loading={submitting}>
                {editingTreatment ? 'Enregistrer' : 'Créer le traitement'}
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
