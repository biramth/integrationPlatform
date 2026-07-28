import { DUT1_COMPLEMENTARY_FIELDS } from '../../utils/dut1ComplementaryFields';

export default function Dut1ComplementaryForm({ values, onChange }) {
  return (
    <div className="flex flex-col gap-4">
      {DUT1_COMPLEMENTARY_FIELDS.map((field) => (
        <label key={field.key} className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">{field.label}</span>
          {field.type === 'textarea' ? (
            <textarea
              className="min-h-[88px] rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              value={values[field.key] ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          ) : (
            <input
              className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              value={values[field.key] ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          )}
        </label>
      ))}
    </div>
  );
}
