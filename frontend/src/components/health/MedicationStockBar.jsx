import Badge from '../common/Badge';

const BAR_COLOR = { danger: 'bg-danger', warning: 'bg-warning', success: 'bg-success' };
const BADGE_VARIANT = { danger: 'danger', warning: 'warning', success: 'success' };

function statusFor(medication) {
  if (medication.low) return 'danger';
  if (medication.percent < 50) return 'warning';
  return 'success';
}

// Barre de stock d'un médicament (pourcentage courant / stock de référence) :
// partagée entre la page de gestion (chef de commission Santé et responsable
// stock) et la Vue d'ensemble en lecture seule du chef, pour un même code
// couleur partout (rouge sous le seuil d'alerte, orange sous 50 %, vert sinon).
export default function MedicationStockBar({ medication }) {
  const status = statusFor(medication);
  const percent = Math.max(0, Math.min(100, medication.percent));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="min-w-0 truncate font-medium text-foreground">{medication.name}</span>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {medication.current_stock} / {medication.reference_stock} {medication.unit}
          </span>
          <Badge variant={BADGE_VARIANT[status]}>{medication.percent}%</Badge>
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${BAR_COLOR[status]}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
