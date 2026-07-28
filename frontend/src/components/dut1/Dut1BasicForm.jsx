import Input from '../common/Input';
import Select from '../common/Select';
import { DUT1_BASIC_SECTIONS } from '../../utils/dut1BasicFields';

export default function Dut1BasicForm({ values, errors = {}, onChange }) {
  return (
    <div className="flex flex-col gap-6">
      {DUT1_BASIC_SECTIONS.map((section) => (
        <fieldset key={section.title} className="rounded-xl border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-900">{section.title}</legend>
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {section.fields.map((field) => {
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
      <p className="text-xs text-slate-500">
        * Au moins un numéro de téléphone parent (père ou mère) est requis.
      </p>
    </div>
  );
}
