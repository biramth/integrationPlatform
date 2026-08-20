import {
  Select as ShadSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function Select({ label, error, options, placeholder, className = '', value, onChange, required, id, ...props }) {
  const selectId = id || (label ? `field-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const stringValue = value === undefined || value === null || value === '' ? '' : String(value);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <Label htmlFor={selectId} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-danger"> *</span>}
        </Label>
      )}
      <ShadSelect
        value={stringValue}
        onValueChange={(val) => onChange?.({ target: { value: val } })}
        {...props}
      >
        <SelectTrigger
          id={selectId}
          aria-invalid={!!error}
          className={cn('min-h-[44px] w-full rounded-lg px-3 py-2 text-base', className)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={String(opt.value)}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </ShadSelect>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
