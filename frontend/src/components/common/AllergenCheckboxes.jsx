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
      {allergens.map((a) => (
        <label
          key={a.id}
          className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50"
        >
          <input
            type="checkbox"
            checked={selectedIds.includes(a.id)}
            onChange={() => toggle(a.id)}
            className="h-4 w-4 accent-blue-800"
          />
          {a.label}
        </label>
      ))}
    </div>
  );
}
