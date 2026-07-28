import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { listDut1 } from '../../api/dut1Api';
import * as healthApi from '../../api/healthApi';
import Dut1Card from '../../components/dut1/Dut1Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import PageHeader from '../../components/common/PageHeader';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/StateViews';
import { useToast } from '../../hooks/useToast';
import { staggerStyle } from '../../utils/stagger';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function IllnessPage() {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [illnessDate, setIllnessDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const todayFetch = useFetch(() => healthApi.getIllnessByDate(todayIso()), []);
  const historyFetch = useFetch(
    () => (selected ? healthApi.getIllnessForDut1(selected.id) : Promise.resolve({ illnessRecords: [] })),
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

  async function handleDeclare(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await healthApi.declareIllness(selected.id, illnessDate, note);
      showToast('Maladie déclarée.', 'success');
      setNote('');
      historyFetch.reload();
      todayFetch.reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur lors de la déclaration.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Suivi des maladies" description="Déclare et consulte l'historique de maladie des DUT1." />

      <Card className="mb-6">
        <p className="mb-2 text-sm font-semibold text-slate-900">Malades aujourd'hui</p>
        {todayFetch.loading && <LoadingState />}
        {todayFetch.data && todayFetch.data.illnessRecords.length === 0 && (
          <EmptyState label="Aucun DUT1 malade déclaré aujourd'hui." />
        )}
        {todayFetch.data && todayFetch.data.illnessRecords.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm text-slate-700">
            {todayFetch.data.illnessRecords.map((r) => (
              <li key={r.id}>
                {r.first_name} {r.last_name} ({r.department}) {r.note ? `— ${r.note}` : ''}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {!selected && (
        <>
          <form onSubmit={handleSearch} className="mb-4 flex gap-2">
            <Input
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
                <Dut1Card record={record} onClick={() => setSelected(record)} />
              </div>
            ))}
          </div>
        </>
      )}

      {selected && (
        <div>
          <button onClick={() => setSelected(null)} className="mb-4 text-sm text-blue-900 transition-colors hover:text-blue-700">
            ← Retour à la recherche
          </button>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            {selected.first_name} {selected.last_name}
          </h2>

          <Card className="mb-4">
            <p className="mb-2 text-sm font-semibold text-slate-900">Historique</p>
            {historyFetch.loading && <LoadingState />}
            {historyFetch.error && <ErrorState label={historyFetch.error} onRetry={historyFetch.reload} />}
            {historyFetch.data && historyFetch.data.illnessRecords.length === 0 && (
              <EmptyState label="Aucune maladie déclarée pour ce DUT1." />
            )}
            {historyFetch.data && historyFetch.data.illnessRecords.length > 0 && (
              <ul className="flex flex-col gap-1 text-sm text-slate-700">
                {historyFetch.data.illnessRecords.map((r) => (
                  <li key={r.id}>
                    {r.illness_date} {r.note ? `— ${r.note}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <form onSubmit={handleDeclare} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-slate-900">Déclarer une maladie</p>
            <div className="mb-3 flex flex-col gap-3 sm:flex-row">
              <Input label="Date" type="date" required value={illnessDate} onChange={(e) => setIllnessDate(e.target.value)} />
              <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} className="flex-1" />
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
