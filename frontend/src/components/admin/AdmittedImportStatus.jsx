import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Card from '../common/Card';
import { DEPARTMENTS, DEPARTMENT_LABELS } from '../../utils/departments';
import { summarizeImportProgress, formatImportDate } from '../../utils/admittedImport';

/**
 * Indicateur « quels départements sont déjà importés ? » affiché en tête du
 * panneau d'import des admis. Mis à jour en temps réel (useFetch côté parent).
 */
export default function AdmittedImportStatus({ progress, loading }) {
  const summary = summarizeImportProgress(progress);
  const doneCount = DEPARTMENTS.filter((d) => summary[d]?.total > 0).length;

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Départements importés</p>
        <p className="text-xs text-muted-foreground">
          {loading && !progress ? 'Chargement…' : (
            <>
              <span className="font-semibold text-foreground">{doneCount}</span> / {DEPARTMENTS.length} importés
            </>
          )}
        </p>
      </div>

      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div
          className="h-full rounded-full bg-success transition-[width] duration-500"
          style={{ width: `${(doneCount / DEPARTMENTS.length) * 100}%` }}
        />
      </div>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {DEPARTMENTS.map((code) => {
          const s = summary[code];
          const done = s?.total > 0;
          return (
            <li
              key={code}
              className={cn(
                'flex items-start gap-2 rounded-lg border px-3 py-2',
                done ? 'border-success/30 bg-success-soft' : 'border-dashed border-border bg-card'
              )}
              title={DEPARTMENT_LABELS[code]}
            >
              {done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label="Importé" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-label="Pas encore importé" />
              )}
              <div className="min-w-0">
                <p className={cn('truncate text-sm font-semibold', done ? 'text-success-soft-foreground' : 'text-foreground')}>
                  {code}
                </p>
                <p className="truncate text-[0.7rem] text-muted-foreground">{DEPARTMENT_LABELS[code]}</p>
                {done ? (
                  <p className="mt-0.5 text-xs text-success-soft-foreground">
                    {s.principale} princ. · {s.attente} att.
                    {s.lastImportedAt && (
                      <span className="block text-[0.7rem] opacity-80">le {formatImportDate(s.lastImportedAt)}</span>
                    )}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-muted-foreground">À importer</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
