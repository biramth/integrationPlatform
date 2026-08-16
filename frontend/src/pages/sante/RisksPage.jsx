import { useState } from 'react';
import { Stethoscope } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { getRisks, declareIllness } from '../../api/healthApi';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState, EmptyState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { DEPARTMENT_LABELS } from '../../utils/departments';
import { staggerStyle } from '../../utils/stagger';
import { useToast } from '../../hooks/useToast';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function RisksPage() {
  const { showToast } = useToast();
  const [date, setDate] = useState(todayIso());
  const { data, loading, error, reload } = useFetch(() => getRisks(date), [date]);

  const [openId, setOpenId] = useState(null);
  const [illnessDate, setIllnessDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function toggleForm(dut1) {
    if (openId === dut1.id) {
      setOpenId(null);
      return;
    }
    setOpenId(dut1.id);
    setIllnessDate(todayIso());
    setNote('');
  }

  async function handleDeclare(e, dut1) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await declareIllness(dut1.id, illnessDate, note);
      showToast(`${dut1.firstName} ${dut1.lastName} déclaré(e) malade.`, 'success');
      setOpenId(null);
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur lors de la déclaration.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

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

              <button
                onClick={() => toggleForm(dut1)}
                className="mt-3 flex items-center gap-1 text-xs font-medium text-red-700 transition-colors hover:text-red-800 hover:underline"
              >
                <Stethoscope className="h-3.5 w-3.5" /> Déclarer malade
              </button>

              {openId === dut1.id && (
                <form
                  onSubmit={(e) => handleDeclare(e, dut1)}
                  className="mt-3 flex flex-col gap-3 border-t border-red-200 pt-3 sm:flex-row sm:items-end"
                >
                  <Input label="Date" type="date" required value={illnessDate} onChange={(e) => setIllnessDate(e.target.value)} />
                  <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} className="flex-1" />
                  <Button type="submit" loading={submitting}>
                    Confirmer
                  </Button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
