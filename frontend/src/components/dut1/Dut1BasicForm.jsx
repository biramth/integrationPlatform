import Input from '../common/Input';
import Select from '../common/Select';
import EmergencyContactsEditor from './EmergencyContactsEditor';
import { DUT1_BASIC_SECTIONS } from '../../utils/dut1BasicFields';

export default function Dut1BasicForm({ values, errors = {}, onChange }) {
  return (
    <div className="flex flex-col gap-6">
      {DUT1_BASIC_SECTIONS.map((section) => (
        <fieldset key={section.title} className="rounded-xl border border-border p-4">
          <legend className="px-1 text-sm font-semibold text-foreground">{section.title}</legend>
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {section.fields.map((field) => {
              if (field.type === 'emergencyContacts') {
                return (
                  <div key={field.key} className="sm:col-span-2">
                    <EmergencyContactsEditor
                      contacts={values[field.key] ?? []}
                      errors={errors}
                      onChange={(list) => onChange(field.key, list)}
                    />
                  </div>
                );
              }

              const commonProps = {
                label: field.label,
                required: field.required,
                value: values[field.key] ?? '',
                error: errors[field.key],
                onChange: (e) => onChange(field.key, e.target.value),
              };

              if (field.type === 'select') {
                return <Select key={field.key} {...commonProps} options={field.options} placeholder="Sélectionner…" />;
              }

              return <Input key={field.key} {...commonProps} type={field.type} />;
            })}
          </div>
        </fieldset>
      ))}
      <p className="text-xs text-muted-foreground">
        * Au moins un numéro à contacter en cas d'urgence est requis (pas nécessairement un parent).
      </p>
    </div>
  );
}
