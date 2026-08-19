import { Checkbox } from '@/components/ui/checkbox';

const SEVERITY_OPTIONS = [
  { value: 'legere', label: 'Légère', className: 'bg-muted text-muted-foreground' },
  { value: 'moderee', label: 'Modérée', className: 'bg-warning-soft text-warning-soft-foreground' },
  { value: 'severe', label: 'Sévère', className: 'bg-danger-soft text-danger-soft-foreground' },
];

export default function AllergenCheckboxes({ allergens, selectedIds, onChange, severities, onSeverityChange }) {
  const withSeverity = !!severities;

  function toggle(id) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {allergens.map((a) => {
        const checked = selectedIds.includes(a.id);
        return (
          <div
            key={a.id}
            className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
              checked ? 'border-role-accent bg-role-accent-soft' : 'border-border'
            }`}
          >
            <label className="flex min-h-[28px] cursor-pointer items-center gap-2">
              <Checkbox checked={checked} onCheckedChange={() => toggle(a.id)} />
              {a.label}
            </label>
            {withSeverity && checked && (
              <div className="mt-2 flex gap-1.5">
                {SEVERITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onSeverityChange(a.id, opt.value)}
                    className={`rounded-full px-2 py-1 text-xs font-medium transition-opacity ${opt.className} ${
                      (severities[a.id] || 'moderee') === opt.value ? '' : 'opacity-40 hover:opacity-70'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
