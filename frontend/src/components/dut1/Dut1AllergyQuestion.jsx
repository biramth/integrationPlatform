import Button from '../common/Button';
import AllergySelect from './AllergySelect';

// Tout le monde n'a pas d'allergie : un Oui/Non d'abord, la sélection des
// allergènes ne s'affiche que si Oui — même schéma que Dut1TreatmentQuestion.
export default function Dut1AllergyQuestion({
  hasAllergies,
  onHasAllergiesChange,
  selectedIds,
  onChange,
  severities,
  onSeverityChange,
  disabled = false,
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={hasAllergies === true ? 'primary' : 'secondary'}
          className="px-3 py-1.5 text-xs"
          disabled={disabled}
          onClick={() => onHasAllergiesChange(true)}
        >
          Oui
        </Button>
        <Button
          type="button"
          variant={hasAllergies === false ? 'primary' : 'secondary'}
          className="px-3 py-1.5 text-xs"
          disabled={disabled}
          onClick={() => onHasAllergiesChange(false)}
        >
          Non
        </Button>
      </div>
      {hasAllergies === true && (
        <AllergySelect
          selectedIds={selectedIds}
          onChange={onChange}
          severities={severities}
          onSeverityChange={onSeverityChange}
          disabled={disabled}
        />
      )}
    </div>
  );
}
