import { useMemo, useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { listWithoutLuggage } from '../../api/dut1Api';
import { uploadLuggagePhoto } from '../../api/luggageApi';
import Dut1Card from '../../components/dut1/Dut1Card';
import Input from '../../components/common/Input';
import PhotoCapture from '../../components/upload/PhotoCapture';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/StateViews';
import { useToast } from '../../hooks/useToast';

export default function LogisticsListPage() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useFetch(listWithoutLuggage, []);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);

  const filtered = useMemo(() => {
    const records = data?.records || [];
    if (!search.trim()) return records;
    const q = search.trim().toLowerCase();
    return records.filter(
      (r) => r.last_name.toLowerCase().includes(q) || r.first_name.toLowerCase().includes(q)
    );
  }, [data, search]);

  async function handleCapture(dut1Id, file) {
    setSubmittingId(dut1Id);
    try {
      await uploadLuggagePhoto(dut1Id, file);
      showToast('Photo enregistrée.', 'success');
      setExpandedId(null);
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || "Échec de l'envoi de la photo.", 'error');
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Bagages à photographier</h1>
      <p className="mb-4 text-sm text-slate-500">Dossiers DUT1 enregistrés sans photo de bagage.</p>

      <Input placeholder="Rechercher un nom…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4" />

      {loading && <LoadingState />}
      {error && <ErrorState label={error} onRetry={reload} />}
      {!loading && !error && filtered.length === 0 && <EmptyState label="Aucun dossier en attente de photo." />}

      <div className="flex flex-col gap-3">
        {filtered.map((record) => (
          <Dut1Card
            key={record.id}
            record={record}
            onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
            actions={
              expandedId === record.id && (
                <div onClick={(e) => e.stopPropagation()}>
                  <PhotoCapture
                    submitting={submittingId === record.id}
                    onCapture={(file) => handleCapture(record.id, file)}
                  />
                </div>
              )
            }
          />
        ))}
      </div>
    </div>
  );
}
