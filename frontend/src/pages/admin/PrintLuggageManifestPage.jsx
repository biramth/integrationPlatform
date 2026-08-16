import { Printer } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { listDut1 } from '../../api/dut1Api';
import Button from '../../components/common/Button';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState, LoadingState } from '../../components/common/StateViews';
import { DEPARTMENT_LABELS } from '../../utils/departments';

async function fetchAllRecords() {
  const first = await listDut1({ pageSize: 100, page: 1 });
  const records = [...first.records];
  const totalPages = Math.ceil(first.total / first.pageSize);
  for (let page = 2; page <= totalPages; page += 1) {
    const next = await listDut1({ pageSize: 100, page });
    records.push(...next.records);
  }
  return { records, total: first.total };
}

export default function PrintLuggageManifestPage() {
  const { data, loading, error, reload } = useFetch(fetchAllRecords, []);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <PageHeader title="Manifeste des bagages" />
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Imprimer
        </Button>
      </div>

      {loading && <LoadingState />}
      {error && <ErrorState label={error} onRetry={reload} />}

      {!loading && !error && (
        <table className="w-full border-collapse text-sm print:text-black">
          <thead>
            <tr className="border-b border-slate-300 text-left text-xs uppercase text-slate-500">
              <th className="py-1 pr-4">Nom</th>
              <th className="py-1 pr-4">Département</th>
              <th className="py-1 pr-4">Bagages déclarés</th>
              <th className="py-1 pr-4">Bagages photographiés</th>
              <th className="py-1">Objets sensibles</th>
            </tr>
          </thead>
          <tbody>
            {data.records.map((r) => (
              <tr key={r.id} className="break-inside-avoid border-b border-slate-100">
                <td className="py-1 pr-4">{r.first_name} {r.last_name}</td>
                <td className="py-1 pr-4">{DEPARTMENT_LABELS[r.department] || r.department}</td>
                <td className="py-1 pr-4">{r.luggage_count ?? '—'}</td>
                <td className="py-1 pr-4">{r.luggage_items_count}</td>
                <td className="py-1">{r.luggage_sensitive_count > 0 ? `Oui (${r.luggage_sensitive_count})` : 'Non'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
