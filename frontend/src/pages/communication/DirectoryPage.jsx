import { useCallback, useState } from 'react';
import { Search } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { listDut1 } from '../../api/dut1Api';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState, EmptyState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { DEPARTMENTS, DEPARTMENT_LABELS } from '../../utils/departments';
import { staggerStyle } from '../../utils/stagger';

const PAGE_SIZE = 25;

function DetailField({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value || '—'}</p>
    </div>
  );
}

// Fiche détaillée d'un DUT1, en lecture seule, pour Communication et
// Présidentielle : mêmes champs non-médicaux que le tableau (déjà nettoyés
// côté backend par dut1Controller.listRecords pour ces rôles), juste plus
// complets — pas de bouton "modifier", ce n'est pas le dossier d'IT/Orga.
function RecordDetailModal({ record, onClose }) {
  return (
    <Modal open={!!record} onClose={onClose} title={record ? `${record.first_name} ${record.last_name}` : ''}>
      {record && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="neutral">{DEPARTMENT_LABELS[record.department] || record.department}</Badge>
            <Badge variant="neutral">{record.gender === 'M' ? 'Masculin' : 'Féminin'}</Badge>
            {record.room_label ? (
              <Badge variant="success">Chambre {record.room_label}</Badge>
            ) : (
              <Badge variant="warning">Aucune chambre</Badge>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailField label="N° étudiant" value={record.student_number} />
            <DetailField label="Téléphone" value={record.phone_number} />
            <DetailField label="Date de naissance" value={record.birth_date} />
            <DetailField label="Lieu de naissance" value={record.birth_place} />
          </div>

          <DetailField label="Adresse" value={record.address} />

          <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2">
            <DetailField label="Père" value={record.father_name} />
            <DetailField label="Tél. père" value={record.father_phone} />
            <DetailField label="Mère" value={record.mother_name} />
            <DetailField label="Tél. mère" value={record.mother_phone} />
          </div>
        </div>
      )}
    </Modal>
  );
}

// Annuaire non-médical, partagé par Communication et Présidentielle : le
// tableau reste volontairement compact (nom, département, genre, téléphone,
// chambre), le clic sur une ligne ouvre une fiche détaillée en lecture seule
// avec le reste des champs non-médicaux (adresse, parents, naissance…). Le
// backend (dut1Controller.listRecords) retire déjà tout ce qui est médical
// pour ces rôles, donc rien de plus à filtrer ici — et pas de bouton
// "modifier", ce n'est pas le dossier d'IT/Orga.
export default function DirectoryPage() {
  const [filters, setFilters] = useState({ search: '', department: '' });
  const debouncedSearch = useDebouncedValue(filters.search, 350);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

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
      <PageHeader
        title="Annuaire DUT1"
        description="Nom, département et téléphone — clique sur une ligne pour plus de détails. Aucune information médicale n'est accessible ici."
      />

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
                  <TableRow
                    key={record.id}
                    onClick={() => setSelected(record)}
                    className="animate-fade-in cursor-pointer"
                    style={staggerStyle(i, 25, 300)}
                  >
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

      <RecordDetailModal record={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
