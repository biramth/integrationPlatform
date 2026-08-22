import YesNoToggle from '../common/YesNoToggle';
import AllergenCheckboxes from '../common/AllergenCheckboxes';

// Même schéma que Dut1AllergyQuestion : tout le monde n'a pas de limitation
// d'aptitude, un Oui/Non d'abord — la sélection des critères non remplis ne
// s'affiche que si Oui. Pas de sévérité ici (AllergenCheckboxes s'en passe
// dès qu'on ne lui fournit pas severities/onSeverityChange), juste coché/non
// coché : "ce critère n'est pas rempli par ce DUT1".
export default function Dut1AptitudeQuestion({
  hasLimitations,
  onHasLimitationsChange,
  criteria,
  selectedIds,
  onChange,
  disabled = false,
}) {
  return (
    <div className="flex flex-col gap-3">
      <YesNoToggle value={hasLimitations} onChange={onHasLimitationsChange} disabled={disabled} />
      {hasLimitations === true && (
        <AllergenCheckboxes allergens={criteria} selectedIds={selectedIds} onChange={onChange} disabled={disabled} />
      )}
    </div>
  );
}
