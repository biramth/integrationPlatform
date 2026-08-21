import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { getRisks, declareRestriction } from '../../api/healthApi';
import { getIllnessTrend, getAllergyPrevalence } from '../../api/statsApi';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import PageHeader from '../../components/common/PageHeader';
import IllnessTrendChart from '../../components/stats/IllnessTrendChart';
import AllergyPrevalenceChart from '../../components/stats/AllergyPrevalenceChart';
import { ErrorState, EmptyState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { DEPARTMENT_LABELS } from '../../utils/departments';
import { staggerStyle } from '../../utils/stagger';
import { useToast } from '../../hooks/useToast';

const SEVERITY_BADGE = { severe: 'danger', moderee: 'warning', legere: 'neutral' };
const SEVERITY_LABEL = { severe: 'Sévère', moderee: 'Modérée', legere: 'Légère' };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function RisksPage() {
  const { showToast } = useToast();
  const [date, setDate] = useState(todayIso());
  const { data, loading, error, reload } = useFetch(() => getRisks(date), [date]);
  const trendFetch = useFetch(() => getIllnessTrend(14), []);
  const prevalenceFetch = useFetch(getAllergyPrevalence, []);

  const [openId, setOpenId] = useState(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function toggleForm(dut1) {
    if (openId === dut1.id) {
      setOpenId(null);
      return;
    }
    setOpenId(dut1.id);
    setReason('');
  }

  async function handleDeclare(e, dut1) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await declareRestriction(dut1.id, { startDate: todayIso(), reason });
      showToast(`${dut1.firstName} ${dut1.lastName} déclaré(e) inapte pour aujourd'hui.`, 'success');
      setOpenId(null);
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur lors de la déclaration.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Vue d'ensemble"
        title="Risques du jour"
        description="DUT1 dont une allergie déclarée croise le menu du jour, qui sont déclarés inaptes à participer aux activités de cette date, ou qui suivent un traitement médical."
      />

      {!trendFetch.loading && !trendFetch.error && !prevalenceFetch.loading && !prevalenceFetch.error && (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <IllnessTrendChart rows={trendFetch.data.rows} />
          <AllergyPrevalenceChart rows={prevalenceFetch.data.rows} />
        </div>
      )}

      <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mb-4 max-w-xs" />

      {loading && <CardListSkeleton />}
      {error && <ErrorState label={error} onRetry={reload} />}
      {!loading && !error && data.atRiskDut1.length === 0 && (
        <EmptyState label="Aucun DUT1 à risque identifié pour cette date." icon={ShieldAlert} />
      )}

      {!loading && !error && data.atRiskDut1.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.atRiskDut1.map((dut1, i) => (
            <Card key={dut1.id} className="animate-fade-in-up-pulse border-danger/30 bg-danger-soft" style={staggerStyle(i)}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-foreground">
                  {dut1.firstName} {dut1.lastName}
                </p>
                <Badge variant="neutral">{dut1.roomLabel || 'Sans chambre'}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{DEPARTMENT_LABELS[dut1.department] || dut1.department}</p>

              <div className="mt-2 flex flex-wrap gap-1">
                {dut1.allergyMatches.map((m, mi) => (
                  <Badge key={`a-${mi}`} variant={SEVERITY_BADGE[m.severity] || 'warning'}>
                    Allergie {SEVERITY_LABEL[m.severity] || ''} — {m.allergen} ({m.dish})
                  </Badge>
                ))}
                {dut1.restrictions.map((r, ri) => (
                  <Badge key={`r-${ri}`} variant="danger">
                    Inapte — {r.reason} ({r.activityName || 'Toutes activités'})
                  </Badge>
                ))}
                {dut1.treatmentDetails && (
                  <Badge variant="warning">Traitement — {dut1.treatmentDetails}</Badge>
                )}
              </div>

              <button
                onClick={() => toggleForm(dut1)}
                className="mt-3 flex items-center gap-1 text-xs font-medium text-role-accent transition-colors hover:opacity-80 hover:underline"
              >
                <ShieldAlert className="h-3.5 w-3.5" /> Déclarer une restriction
              </button>

              {openId === dut1.id && (
                <form
                  onSubmit={(e) => handleDeclare(e, dut1)}
                  className="mt-3 flex flex-col gap-3 border-t border-danger/20 pt-3 sm:flex-row sm:items-end"
                >
                  <Input label="Motif" required value={reason} onChange={(e) => setReason(e.target.value)} className="flex-1" />
                  <Button type="submit" loading={submitting}>
                    Confirmer
                  </Button>
                </form>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
