import { DUT1_COMPLEMENTARY_FIELDS } from '../../utils/dut1ComplementaryFields';

export default function Dut1ComplementaryForm({ values, onChange, disabled = false }) {
  return (
    <div className="flex flex-col gap-4">
      {DUT1_COMPLEMENTARY_FIELDS.map((field) => (
        <label key={field.key} className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-foreground">{field.label}</span>
          {field.type === 'textarea' ? (
            <textarea
              disabled={disabled}
              className="min-h-[88px] rounded-lg border border-border bg-card px-3 py-2 text-base text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
              value={values[field.key] ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          ) : (
            <input
              disabled={disabled}
              className="min-h-[44px] rounded-lg border border-border bg-card px-3 py-2 text-base text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
              value={values[field.key] ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          )}
        </label>
      ))}
    </div>
  );
}
