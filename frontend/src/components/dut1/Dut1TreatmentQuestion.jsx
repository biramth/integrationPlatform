import { Plus, Trash2, Check, X } from 'lucide-react';
import YesNoToggle from '../common/YesNoToggle';
import Select from '../common/Select';
import Input from '../common/Input';
import Button from '../common/Button';
import { useFetch } from '../../hooks/useFetch';
import { listMedications } from '../../api/medicationApi';
import { emptyTreatment } from '../../utils/treatmentForm';

const SLOT_OPTIONS = [
  { key: 'matin', label: 'Matin' },
  { key: 'midi', label: 'Midi' },
  { key: 'soir', label: 'Soir' },
];

const NO_STOCK_MEDICATION = '__none__';

// Question phase 2 "traitement médical en cours ?" : le Oui affiche la même
// saisie structurée que la page Traitements, répétée pour CHAQUE traitement —
// un DUT1 peut en suivre plusieurs. À la confirmation, chaque traitement est
// créé/mis à jour dans dut1_treatments et apparaît directement dans les prises
// du jour, sans ressaisie côté "suivi".
export default function Dut1TreatmentQuestion({ value, treatments, onChangeValue, onChangeTreatments, disabled = false }) {
  const medicationsFetch = useFetch(() => (value ? listMedications() : Promise.resolve(null)), [value]);
  const medications = medicationsFetch.data?.medications || [];

  function patchItem(index, patchObj) {
    onChangeTreatments(treatments.map((t, i) => (i === index ? { ...t, ...patchObj } : t)));
  }

  function toggleSlot(index, key) {
    const current = treatments[index];
    patchItem(index, { slots: { ...current.slots, [key]: !current.slots[key] } });
  }

  function addItem() {
    onChangeTreatments([...treatments, emptyTreatment()]);
  }

  function removeItem(index) {
    onChangeTreatments(treatments.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      <YesNoToggle value={value} onChange={onChangeValue} disabled={disabled} />
      {value === true && (
        <div className="flex flex-col gap-3">
          {treatments.map((treatment, index) => (
            <div key={index} className="flex flex-col gap-4 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Traitement {index + 1}
                </p>
                {treatments.length > 1 && !disabled && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="flex items-center gap-1 text-xs text-danger transition-opacity hover:opacity-70"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Retirer
                  </button>
                )}
              </div>

              <Select
                label="Médicament du stock (optionnel)"
                placeholder="Médicament personnel / hors stock"
                value={treatment.medicationId || NO_STOCK_MEDICATION}
                onChange={(e) => patchItem(index, { medicationId: e.target.value === NO_STOCK_MEDICATION ? '' : e.target.value })}
                options={[
                  { value: NO_STOCK_MEDICATION, label: '— Médicament personnel / hors stock —' },
                  ...medications.map((m) => ({ value: String(m.id), label: m.name })),
                ]}
                disabled={disabled}
              />
              <Input
                label={`Nom du médicament ${treatment.medicationId ? '(optionnel)' : ''}`}
                placeholder="Ex : Paracétamol apporté par la famille"
                value={treatment.medicationLabel}
                onChange={(e) => patchItem(index, { medicationLabel: e.target.value })}
                disabled={disabled}
              />
              <Input
                label="Posologie (optionnel)"
                placeholder="Ex : 1 comprimé, 5 ml…"
                value={treatment.dosage}
                onChange={(e) => patchItem(index, { dosage: e.target.value })}
                disabled={disabled}
              />

              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Créneaux de prise</p>
                <div className="grid grid-cols-3 gap-2">
                  {SLOT_OPTIONS.map(({ key, label }) => {
                    const active = !!treatment.slots[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleSlot(index, key)}
                        disabled={disabled}
                        className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          active
                            ? 'border-role-accent bg-role-accent-soft text-role-accent'
                            : 'border-border text-muted-foreground hover:bg-muted/50'
                        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
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
                  value={treatment.startDate}
                  onChange={(e) => patchItem(index, { startDate: e.target.value })}
                  disabled={disabled}
                />
                <Input
                  label="Date de fin (optionnel)"
                  type="date"
                  value={treatment.endDate}
                  onChange={(e) => patchItem(index, { endDate: e.target.value })}
                  disabled={disabled}
                />
              </div>

              <Input
                label="Notes (optionnel)"
                placeholder="Ex : à prendre au repas du soir"
                value={treatment.notes}
                onChange={(e) => patchItem(index, { notes: e.target.value })}
                disabled={disabled}
              />
            </div>
          ))}

          {!disabled && (
            <Button type="button" variant="secondary" onClick={addItem} className="w-full sm:w-auto">
              <Plus className="h-4 w-4" /> Ajouter un autre traitement
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
