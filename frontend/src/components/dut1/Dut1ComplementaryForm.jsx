import Button from '../common/Button';
import Dut1TreatmentQuestion from './Dut1TreatmentQuestion';
import AllergySelect from './AllergySelect';

const FIELD_CLASS =
  'rounded-lg border border-border bg-card px-3 py-2 text-base text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground';

// Rend le questionnaire de phase 2 dans son ENTIER, dans l'ordre configuré
// par le chef Santé : les questions "intégrées" (traitement_medical/allergies,
// câblées sur des colonnes/tables dédiées de dut1_records) et les questions
// libres (texte, choix, oui/non, stockées dans extra_fields_json) vivent dans
// la même liste réordonnable, au lieu d'être des sections à part.
export default function Dut1ComplementaryForm({
  questions,
  values,
  onChange,
  onTreatment,
  treatmentDetails,
  onTreatmentChange,
  onTreatmentDetailsChange,
  allergenIds,
  severities,
  onAllergyChange,
  onSeverityChange,
  disabled = false,
}) {
  return (
    <div className="flex flex-col gap-6">
      {questions.map((q) => (
        <div key={q.field_key} className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-foreground">
            {q.label}
            {q.required && <span className="text-danger"> *</span>}
          </span>

          {q.type === 'traitement_medical' && (
            <Dut1TreatmentQuestion
              value={onTreatment}
              details={treatmentDetails}
              onChangeValue={onTreatmentChange}
              onChangeDetails={onTreatmentDetailsChange}
              disabled={disabled}
            />
          )}

          {q.type === 'allergies' && (
            <AllergySelect
              selectedIds={allergenIds}
              onChange={onAllergyChange}
              severities={severities}
              onSeverityChange={onSeverityChange}
              disabled={disabled}
            />
          )}

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
        </div>
      ))}
    </div>
  );
}
