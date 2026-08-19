import Button from '../common/Button';

export default function AdmissionListToggle({ value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant={value === 'principale' ? 'primary' : 'secondary'}
        className="px-3 py-1.5 text-xs"
        onClick={() => onChange('principale')}
      >
        Liste principale
      </Button>
      <Button
        type="button"
        variant={value === 'attente' ? 'primary' : 'secondary'}
        className="px-3 py-1.5 text-xs"
        onClick={() => onChange('attente')}
      >
        Liste d'attente
      </Button>
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-muted-foreground underline transition-colors hover:text-foreground"
        >
          Effacer
        </button>
      )}
    </div>
  );
}
