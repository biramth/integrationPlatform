import Button from '../common/Button';

const FIELD_CLASS =
  'rounded-lg border border-border bg-card px-3 py-2 text-base text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground';

export default function Dut1ComplementaryForm({ questions, values, onChange, disabled = false }) {
  return (
    <div className="flex flex-col gap-4">
      {questions.map((q) => (
        <label key={q.field_key} className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">
            {q.label}
            {q.required && <span className="text-danger"> *</span>}
          </span>

          {q.type === 'texte_court' && (
            <input
              disabled={disabled}
              className={`min-h-[44px] ${FIELD_CLASS}`}
              value={values[q.field_key] ?? ''}
              onChange={(e) => onChange(q.field_key, e.target.value)}
            />
          )}

          {q.type === 'texte_long' && (
            <textarea
              disabled={disabled}
              className={`min-h-[88px] ${FIELD_CLASS}`}
              value={values[q.field_key] ?? ''}
              onChange={(e) => onChange(q.field_key, e.target.value)}
            />
          )}

          {q.type === 'oui_non' && (
            <div className="flex gap-2">
              {[
                { value: true, label: 'Oui' },
                { value: false, label: 'Non' },
              ].map((opt) => (
                <Button
                  key={String(opt.value)}
                  type="button"
                  variant={values[q.field_key] === opt.value ? 'primary' : 'secondary'}
                  className="px-3 py-1.5 text-xs"
                  disabled={disabled}
                  onClick={() => onChange(q.field_key, opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          )}

          {q.type === 'choix_unique' && (
            <div className="flex flex-wrap gap-2">
              {(q.options || []).map((opt) => (
                <Button
                  key={opt}
                  type="button"
                  variant={values[q.field_key] === opt ? 'primary' : 'secondary'}
                  className="px-3 py-1.5 text-xs"
                  disabled={disabled}
                  onClick={() => onChange(q.field_key, opt)}
                >
                  {opt}
                </Button>
              ))}
            </div>
          )}

          {q.type === 'choix_multiple' &&
            (() => {
              const selectedValues = Array.isArray(values[q.field_key]) ? values[q.field_key] : [];
              return (
                <div className="flex flex-wrap gap-2">
                  {(q.options || []).map((opt) => {
                    const selected = selectedValues.includes(opt);
                    return (
                      <Button
                        key={opt}
                        type="button"
                        variant={selected ? 'primary' : 'secondary'}
                        className="px-3 py-1.5 text-xs"
                        disabled={disabled}
                        onClick={() =>
                          onChange(q.field_key, selected ? selectedValues.filter((v) => v !== opt) : [...selectedValues, opt])
                        }
                      >
                        {opt}
                      </Button>
                    );
                  })}
                </div>
              );
            })()}
        </label>
      ))}
    </div>
  );
}
