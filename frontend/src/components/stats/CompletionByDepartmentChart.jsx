import { Progress } from '@/components/ui/progress';
import { DEPARTMENT_LABELS } from '../../utils/departments';
import ChartCard from './ChartCard';

export default function CompletionByDepartmentChart({ rows }) {
  return (
    <ChartCard title="Complétion Phase 2 par département" empty={rows.length === 0 ? 'Aucun dossier enregistré.' : null}>
      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.department}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{DEPARTMENT_LABELS[r.department] || r.department}</span>
              <span className="tabular-nums text-muted-foreground">
                {r.completed}/{r.total} ({r.rate}%)
              </span>
            </div>
            <Progress value={r.rate} className="h-1.5" />
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
