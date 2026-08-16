import { Checkbox } from '@/components/ui/checkbox';

export default function AllergenCheckboxes({ allergens, selectedIds, onChange }) {
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
          <label
            key={a.id}
            className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
              checked ? 'border-blue-600 bg-blue-50' : 'border-slate-200'
            }`}
          >
            <Checkbox checked={checked} onCheckedChange={() => toggle(a.id)} />
            {a.label}
          </label>
        );
      })}
    </div>
  );
}
