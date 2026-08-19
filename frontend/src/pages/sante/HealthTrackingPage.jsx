import { useState } from 'react';
import { ArrowLeft, Search, CheckCircle2, Trash2 } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { listDut1 } from '../../api/dut1Api';
import { listActivities } from '../../api/activityApi';
import * as healthApi from '../../api/healthApi';
import Dut1Card from '../../components/dut1/Dut1Card';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import PageHeader from '../../components/common/PageHeader';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/StateViews';
import { useToast } from '../../hooks/useToast';
import { staggerStyle } from '../../utils/stagger';
import { DEPARTMENT_LABELS } from '../../utils/departments';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function HealthTrackingPage() {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);

  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [activityId, setActivityId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const activeFetch = useFetch(healthApi.getActiveRestrictions, []);
  const activitiesFetch = useFetch(listActivities, []);
  const historyFetch = useFetch(
    () => (selected ? healthApi.getRestrictionsForDut1(selected.id) : Promise.resolve({ restrictions: [] })),
    [selected]
  );

  async function handleSearch(e) {
    e.preventDefault();
    if (!search.trim()) return;
    setSearching(true);
    try {
      const data = await listDut1({ search: search.trim() });
      setResults(data.records);
    } finally {
      setSearching(false);
    }
  }

  function resetForm() {
    setStartDate(todayIso());
    setEndDate('');
    setReason('');
    setActivityId('');
  }

  function selectRecord(record) {
    setSelected(record);
    resetForm();
  }

  async function handleDeclare(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await healthApi.declareRestriction(selected.id, {
        startDate,
        endDate: endDate || null,
        reason,
        activityId: activityId ? Number(activityId) : null,
      });
      showToast('Restriction déclarée.', 'success');
      resetForm();
      historyFetch.reload();
      activeFetch.reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur lors de la déclaration.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResolve(id) {
    try {
      await healthApi.resolveRestriction(id);
      showToast('Marqué apte.', 'success');
      activeFetch.reload();
      historyFetch.reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur.', 'error');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Supprimer cette restriction ?')) return;
    try {
      await healthApi.deleteRestriction(id);
      showToast('Restriction supprimée.', 'success');
      activeFetch.reload();
      historyFetch.reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur.', 'error');
    }
  }

  const activityOptions = (activitiesFetch.data?.activities || []).map((a) => ({
    value: a.id,
    label: `${a.name} (${a.activity_date})`,
  }));

  return (
    <div>
      <PageHeader title="Suivi santé" description="Déclare et gère les restrictions d'aptitude des DUT1 aux activités." />

      <Card className="mb-6">
        <p className="mb-2 text-sm font-semibold text-foreground">Restrictions actives</p>
        {activeFetch.loading && <LoadingState />}
        {activeFetch.error && <ErrorState label={activeFetch.error} onRetry={activeFetch.reload} />}
        {activeFetch.data && activeFetch.data.restrictions.length === 0 && (
          <EmptyState label="Aucune restriction active." />
        )}
        {activeFetch.data && activeFetch.data.restrictions.length > 0 && (
          <div className="flex flex-col gap-2">
            {activeFetch.data.restrictions.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {r.first_name} {r.last_name}{' '}
                    <span className="text-muted-foreground">({DEPARTMENT_LABELS[r.department] || r.department})</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.reason} — {r.activity_name || 'Toutes activités'} — du {r.start_date}
                    {r.end_date ? ` au ${r.end_date}` : ' (indéfini)'}
                  </p>
                </div>
                <Button variant="secondary" onClick={() => handleResolve(r.id)} className="px-3 py-1.5 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Marquer apte
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {!selected && (
        <>
          <form onSubmit={handleSearch} className="mb-4 flex gap-2">
            <Input
              icon={Search}
              placeholder="Nom ou prénom…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" loading={searching}>
              Rechercher
            </Button>
          </form>
          {!searching && results.length === 0 && search && <EmptyState label="Aucun dossier trouvé." />}
          <div className="flex flex-col gap-3">
            {results.map((record, i) => (
              <div key={record.id} className="animate-fade-in-up" style={staggerStyle(i)}>
                <Dut1Card record={record} onClick={() => selectRecord(record)} />
              </div>
            ))}
          </div>
        </>
      )}

      {selected && (
        <div>
          <button
            onClick={() => setSelected(null)}
            className="mb-4 flex items-center gap-1 text-sm text-role-accent transition-colors hover:opacity-80"
          >
            <ArrowLeft className="h-4 w-4" /> Retour à la recherche
          </button>
          <h2 className="text-h2 mb-3 text-foreground">
            {selected.first_name} {selected.last_name}
          </h2>

          <Card className="mb-4">
            <p className="mb-2 text-sm font-semibold text-foreground">Historique</p>
            {historyFetch.loading && <LoadingState />}
            {historyFetch.error && <ErrorState label={historyFetch.error} onRetry={historyFetch.reload} />}
            {historyFetch.data && historyFetch.data.restrictions.length === 0 && (
              <EmptyState label="Aucune restriction déclarée pour ce DUT1." />
            )}
            {historyFetch.data && historyFetch.data.restrictions.length > 0 && (
              <div className="flex flex-col gap-2">
                {historyFetch.data.restrictions.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-start justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0"
                  >
                    <div className="text-sm">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant={r.resolved_at ? 'success' : 'danger'}>
                          {r.resolved_at ? 'Résolue' : 'Active'}
                        </Badge>
                        <span className="text-muted-foreground">
                          {r.start_date}
                          {r.end_date ? ` → ${r.end_date}` : ''}
                        </span>
                      </div>
                      <p className="text-foreground">
                        {r.reason}
                        {r.activity_name ? ` — ${r.activity_name}` : ''}
                      </p>
                    </div>
                    <button onClick={() => handleDelete(r.id)} className="text-danger transition-opacity hover:opacity-70">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <form onSubmit={handleDeclare} className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <p className="mb-3 text-sm font-semibold text-foreground">Déclarer une restriction</p>
            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Date de début"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input label="Date de fin (optionnel)" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              <Select
                label="Activité concernée (optionnel)"
                placeholder="Toutes activités"
                value={activityId}
                onChange={(e) => setActivityId(e.target.value)}
                options={activityOptions}
              />
              <Input label="Motif" required value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <Button type="submit" loading={submitting} className="w-full sm:w-auto">
              Déclarer
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
