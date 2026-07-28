import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { getRisks } from '../../api/healthApi';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState, EmptyState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { DEPARTMENT_LABELS } from '../../utils/departments';
import { staggerStyle } from '../../utils/stagger';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function RisksPage() {
  const [date, setDate] = useState(todayIso());
  const { data, loading, error, reload } = useFetch(() => getRisks(date), [date]);

  return (
    <div>
      <PageHeader
        title="Risques du jour"
        description="DUT1 dont une allergie déclarée correspond à un allergène du menu de cette date — à faire sortir des rangs avant le service concerné."
      />

      <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mb-4 max-w-xs" />

      {loading && <CardListSkeleton />}
      {error && <ErrorState label={error} onRetry={reload} />}
      {!loading && !error && data.atRiskDut1.length === 0 && (
        <EmptyState label="Aucun DUT1 à risque identifié pour cette date." />
      )}

      {!loading && !error && data.atRiskDut1.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.atRiskDut1.map((dut1, i) => (
            <div
              key={dut1.id}
              className="animate-fade-in-up-pulse rounded-xl border border-red-200 bg-red-50 p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
              style={staggerStyle(i)}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-900">
                  {dut1.firstName} {dut1.lastName}
                </p>
                <Badge variant="neutral">{dut1.roomLabel || 'Sans chambre'}</Badge>
              </div>
              <p className="text-sm text-slate-500">{DEPARTMENT_LABELS[dut1.department] || dut1.department}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {dut1.matches.map((m, i) => (
                  <Badge key={i} variant="danger">
                    {m.allergen} — {m.dish}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
