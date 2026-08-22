import Button from './Button';

// Bascule Oui/Non réutilisée partout où une question phase 2 attend une
// réponse booléenne (traitement médical, allergies) avant d'afficher le
// détail conditionnel correspondant.
export default function YesNoToggle({ value, onChange, disabled = false }) {
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant={value === true ? 'primary' : 'secondary'}
        className="px-3 py-1.5 text-xs"
        disabled={disabled}
        onClick={() => onChange(true)}
      >
        Oui
      </Button>
      <Button
        type="button"
        variant={value === false ? 'primary' : 'secondary'}
        className="px-3 py-1.5 text-xs"
        disabled={disabled}
        onClick={() => onChange(false)}
      >
        Non
      </Button>
    </div>
  );
}
