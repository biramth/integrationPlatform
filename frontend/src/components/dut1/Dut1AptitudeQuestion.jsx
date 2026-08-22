import Button from '../common/Button';

// Contrairement à Allergies, pas de Oui/Non préalable : chaque critère
// configuré par le chef Santé attend une réponse (un niveau) pour tous les
// DUT1, la question phase 2 "aptitude" est obligatoire dans son ensemble.
export default function Dut1AptitudeQuestion({ criteria, levels, onLevelChange, disabled = false }) {
  if (criteria.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun critère configuré par la commission Santé pour l'instant.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {criteria.map((c) => (
        <div key={c.id} className="flex flex-col gap-1.5">
          <span className="text-sm text-foreground">{c.label}</span>
          {(c.levels || []).length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucun niveau configuré pour ce critère.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {c.levels.map((level) => (
                <Button
                  key={level.id}
                  type="button"
                  variant={levels[c.id] === level.id ? 'primary' : 'secondary'}
                  className="px-3 py-1.5 text-xs"
                  disabled={disabled}
                  onClick={() => onLevelChange(c.id, level.id)}
                >
                  {level.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
