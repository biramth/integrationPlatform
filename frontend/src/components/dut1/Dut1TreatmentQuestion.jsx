import Button from '../common/Button';

export default function Dut1TreatmentQuestion({ value, details, onChangeValue, onChangeDetails, disabled = false }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="mb-1.5 text-sm font-medium text-foreground">Suis-tu un traitement médical actuellement ?</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={value === true ? 'primary' : 'secondary'}
            className="px-3 py-1.5 text-xs"
            disabled={disabled}
            onClick={() => onChangeValue(true)}
          >
            Oui
          </Button>
          <Button
            type="button"
            variant={value === false ? 'primary' : 'secondary'}
            className="px-3 py-1.5 text-xs"
            disabled={disabled}
            onClick={() => onChangeValue(false)}
          >
            Non
          </Button>
        </div>
      </div>
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
