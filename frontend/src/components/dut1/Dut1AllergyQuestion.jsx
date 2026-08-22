import YesNoToggle from '../common/YesNoToggle';
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
      <YesNoToggle value={hasAllergies} onChange={onHasAllergiesChange} disabled={disabled} />
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
