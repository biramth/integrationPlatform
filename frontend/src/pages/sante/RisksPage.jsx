import { useState } from 'react';
import { ShieldAlert, Clock } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { getRisks, declareRestriction } from '../../api/healthApi';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState, EmptyState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { DEPARTMENT_LABELS } from '../../utils/departments';
import { staggerStyle } from '../../utils/stagger';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { SEVERITY_LABELS as SEVERITY_LABEL, SEVERITY_BADGE_VARIANT as SEVERITY_BADGE } from '../../utils/severity';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function RisksPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const isSante = user.role === 'sante';
  const [date, setDate] = useState(todayIso());
  const { data, loading, error, reload } = useFetch(() => getRisks(date), [date]);

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

  const upcomingActivity = data?.upcomingActivity;

  return (
    <div>
      <PageHeader
        title="Risques du jour"
        description={
          isSante
            ? "DUT1 dont une allergie déclarée croise le menu du jour, ou qui sont déclarés inaptes à participer aux activités de cette date. Les traitements en cours se suivent depuis l'onglet Traitements."
            : 'DUT1 signalés à risque par la commission Santé pour cette date — le détail médical reste réservé à Santé.'
        }
      />

      <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mb-4 max-w-xs" />

      {upcomingActivity && date === todayIso() && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary-soft px-4 py-2.5 text-sm">
          <Clock className="h-4 w-4 text-primary" />
          <span className="font-medium text-foreground">Activité en cours / à venir :</span>
          <span className="text-muted-foreground">{upcomingActivity}</span>
        </div>
      )}

      {loading && <CardListSkeleton />}
      {error && <ErrorState label={error} onRetry={reload} />}
      {!loading && !error && data.atRiskDut1.length === 0 && (
        <EmptyState label="Aucun DUT1 à risque identifié pour cette date." icon={ShieldAlert} />
      )}

      {!loading && !error && data.atRiskDut1.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.atRiskDut1.map((dut1, i) => (
            <Card
              key={dut1.id}
              className={`animate-fade-in-up-pulse ${dut1.forUpcomingActivity ? 'border-warning/50 bg-warning-soft/40' : 'border-danger/30 bg-danger-soft'}`}
              style={staggerStyle(i)}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {dut1.forUpcomingActivity && (
                    <span className="rounded-full bg-warning px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                      Activité à venir
                    </span>
                  )}
                  <p className="font-medium text-foreground">
                    {dut1.firstName} {dut1.lastName}
                  </p>
                </div>
                <Badge variant="neutral">{dut1.roomLabel || 'Sans chambre'}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{DEPARTMENT_LABELS[dut1.department] || dut1.department}</p>

              {isSante ? (
                <>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {dut1.allergyMatches.map((m, mi) => (
                      <Badge key={`a-${mi}`} variant={SEVERITY_BADGE[m.severity] || 'warning'}>
                        Allergie {SEVERITY_LABEL[m.severity] || ''} — {m.allergen} ({m.dish})
                      </Badge>
                    ))}
                    {dut1.restrictions.map((r, ri) => (
                      <Badge key={`r-${ri}`} variant="danger">
                        Inapte — {r.reason} ({r.activityNames.length > 0 ? r.activityNames.join(', ') : 'Toutes activités'})
                      </Badge>
                    ))}
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
                </>
              ) : (
                <div className="mt-2">
                  <Badge variant="danger">à risque aujourd'hui</Badge>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && data.atRiskDut1.length === 0 && (
        <EmptyState label="Aucun DUT1 à risque identifié pour cette date." icon={ShieldAlert} />
      )}
    </div>
  );
}
