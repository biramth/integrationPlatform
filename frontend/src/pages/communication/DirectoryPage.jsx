import { useCallback, useState } from 'react';
import { Search } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { listDut1 } from '../../api/dut1Api';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState, EmptyState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { DEPARTMENTS, DEPARTMENT_LABELS } from '../../utils/departments';
import { staggerStyle } from '../../utils/stagger';

const PAGE_SIZE = 25;

// Annuaire non-médical, partagé par Communication et Présidentielle : nom,
// département, genre, téléphone, chambre. Le backend (dut1Controller.listRecords)
// retire déjà tout ce qui est médical pour ces rôles — cette page ne fait
// qu'afficher ce qu'elle reçoit, sans jamais demander plus (pas de bouton
// "voir le dossier").
export default function DirectoryPage() {
  const [filters, setFilters] = useState({ search: '', department: '' });
  const debouncedSearch = useDebouncedValue(filters.search, 350);
  const [page, setPage] = useState(1);

  const fetcher = useCallback(
    () => listDut1({ search: debouncedSearch, department: filters.department, page, pageSize: PAGE_SIZE }),
    [debouncedSearch, filters.department, page]
  );
  const { data, loading, error, reload } = useFetch(fetcher, [debouncedSearch, filters.department, page]);

  function updateFilters(patch) {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }

  return (
    <div>
      <PageHeader title="Annuaire DUT1" description="Nom, département et téléphone — aucune information médicale n'est accessible ici." />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          icon={Search}
          placeholder="Rechercher un nom…"
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
        />
        <Select
          placeholder="Tous les départements"
          value={filters.department}
          onChange={(e) => updateFilters({ department: e.target.value })}
          options={DEPARTMENTS.map((d) => ({ value: d, label: DEPARTMENT_LABELS[d] }))}
        />
      </div>

      {loading && <CardListSkeleton rows={6} />}
      {error && <ErrorState label={error} onRetry={reload} />}
      {!loading && !error && data.records.length === 0 && <EmptyState label="Aucun DUT1 trouvé." />}

      {!loading && !error && data.records.length > 0 && (
        <>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 text-xs uppercase text-muted-foreground hover:bg-muted/50">
                  <TableHead className="py-3 pl-4">Nom</TableHead>
                  <TableHead>Département</TableHead>
                  <TableHead>Genre</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Chambre</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.records.map((record, i) => (
                  <TableRow key={record.id} className="animate-fade-in" style={staggerStyle(i, 25, 300)}>
                    <TableCell className="whitespace-normal py-3 pl-4 font-medium text-foreground">
                      {record.first_name} {record.last_name}
                    </TableCell>
                    <TableCell className="whitespace-normal text-muted-foreground">
                      {DEPARTMENT_LABELS[record.department] || record.department}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{record.gender}</TableCell>
                    <TableCell className="text-muted-foreground">{record.phone_number || '—'}</TableCell>
                    <TableCell>
                      {record.room_label ? <Badge variant="success">{record.room_label}</Badge> : <Badge variant="warning">Aucune</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
