import { Progress } from '@/components/ui/progress';
import { DEPARTMENT_LABELS } from '../../utils/departments';

export default function CompletionByDepartmentChart({ rows }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-slate-900">Complétion Phase 2 par département</p>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">Aucun dossier enregistré.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <div key={r.department}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{DEPARTMENT_LABELS[r.department] || r.department}</span>
                <span className="tabular-nums text-slate-500">
                  {r.completed}/{r.total} ({r.rate}%)
                </span>
              </div>
              <Progress value={r.rate} className="h-1.5" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
