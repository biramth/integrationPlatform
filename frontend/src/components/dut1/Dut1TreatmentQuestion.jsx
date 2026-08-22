import YesNoToggle from '../common/YesNoToggle';

export default function Dut1TreatmentQuestion({ value, details, onChangeValue, onChangeDetails, disabled = false }) {
  return (
    <div className="flex flex-col gap-3">
      <YesNoToggle value={value} onChange={onChangeValue} disabled={disabled} />
      {value === true && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-foreground">Quels traitements ?</span>
          <textarea
            disabled={disabled}
            value={details}
            onChange={(e) => onChangeDetails(e.target.value)}
            placeholder="Ex : traitement pour l'asthme, insuline, anticonvulsivant…"
            className="min-h-[80px] rounded-lg border border-border bg-card px-3 py-2 text-base text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          />
        </label>
      )}
    </div>
  );
}
