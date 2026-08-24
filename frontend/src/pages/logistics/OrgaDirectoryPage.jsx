import { useCallback, useState } from 'react';
import { Luggage as LuggageIcon, Search, ShieldAlert } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useToast } from '../../hooks/useToast';
import { listDut1, reassignRoom, listAvailableRooms } from '../../api/dut1Api';
import * as luggageApi from '../../api/luggageApi';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import PageHeader from '../../components/common/PageHeader';
import LuggageItemThumb from '../../components/upload/LuggageItemThumb';
import { ErrorState, EmptyState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { getLuggageStatus } from '../../utils/luggageStatus';
import { DEPARTMENTS, DEPARTMENT_LABELS } from '../../utils/departments';
import { staggerStyle } from '../../utils/stagger';
import Dut1Card from '../../components/dut1/Dut1Card';

const PAGE_SIZE = 25;

function DetailField({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value || '—'}</p>
    </div>
  );
}

// Fiche détaillée d'un DUT1 pour le chef Orga : identité, contact, contacts
// d'urgence, bagages — jamais de champ médical, ce n'est pas la commission
// Santé. Le bloc Chambre permet de déplacer le DUT1 vers une autre chambre du
// même genre sans repasser par la page de configuration (même endpoint que
// AdminRoomsPage : PUT /dut1/:id/room).
function RecordDetailModal({ record, items, onClose, moveTargets = [], moveChoice, onMoveChoice, onMove, moving }) {
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

          <div className="border-t border-border pt-3">
            <p className="mb-2 text-sm font-semibold text-foreground">Chambre</p>
            {moveTargets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune autre chambre disponible pour ce genre (complète ou inexistante).
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={moveChoice}
                  onChange={(e) => onMoveChoice(e.target.value)}
                  placeholder="Déplacer vers…"
                  disabled={moving}
                  className="w-56"
                  options={moveTargets.map((r) => ({
                    value: String(r.id),
                    label: `${r.label} (${r.occupied}/${r.capacity})`,
                  }))}
                />
                <Button onClick={onMove} loading={moving} disabled={!moveChoice}>
                  Déplacer
                </Button>
              </div>
            )}
          </div>

          {(record.emergencyContacts?.length > 0 || record.father_name || record.mother_name) && (
            <div className="grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2">
              {(record.emergencyContacts || []).map((contact, i) => (
                <DetailField
                  key={i}
                  label={`Contact urgence ${i + 1}`}
                  value={[contact.name, contact.phone].filter(Boolean).join(' — ')}
                />
              ))}
              {record.father_name && <DetailField label="Père" value={record.father_name} />}
              {record.mother_name && <DetailField label="Mère" value={record.mother_name} />}
            </div>
          )}

          <div className="border-t border-border pt-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Bagages</p>
              {record.luggage_sensitive_count > 0 && (
                <Badge variant="warning">
                  <ShieldAlert className="mr-1 inline h-3 w-3" />
                  {record.luggage_sensitive_count} sensible{record.luggage_sensitive_count > 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {items === null && <p className="text-sm text-muted-foreground">Chargement des bagages…</p>}
            {items && items.length === 0 && <p className="text-sm text-muted-foreground">Aucun bagage photographié.</p>}
            {items && items.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {items.map((item, idx) => (
                  <LuggageItemThumb key={item.id} item={item} index={idx} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

// Annuaire du chef Orga : mêmes bases que celui de Communication/Présidentielle
// (recherche, filtre département, tableau compact), mais pas 100% identique —
// une colonne Bagages en plus (sa propre commission), et la fiche détaillée
// ajoute les photos des bagages déjà enregistrés, en plus de l'identité et des
// contacts. Toujours en lecture seule : pas de bouton "modifier", ce n'est pas
// le dossier d'IT.
export default function OrgaDirectoryPage() {
  const { showToast } = useToast();
  const [filters, setFilters] = useState({ search: '', department: '' });
  const debouncedSearch = useDebouncedValue(filters.search, 350);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [selectedItems, setSelectedItems] = useState(null);
  // Déplacement de chambre depuis la fiche : chambres compatibles chargées à
  // l'ouverture (même genre, places libres), choix + appel au même endpoint
  // que la page Chambres.
  const [moveRooms, setMoveRooms] = useState([]);
  const [moveChoice, setMoveChoice] = useState('');
  const [moving, setMoving] = useState(false);

  const fetcher = useCallback(
    () => listDut1({ search: debouncedSearch, department: filters.department, page, pageSize: PAGE_SIZE }),
    [debouncedSearch, filters.department, page]
  );
  const { data, loading, error, reload } = useFetch(fetcher, [debouncedSearch, filters.department, page]);

  function updateFilters(patch) {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }

  function openRecord(record) {
    setSelected(record);
    setSelectedItems(null);
    setMoveChoice('');
    setMoveRooms([]);
    luggageApi.listLuggageItems(record.id).then((res) => setSelectedItems(res.items));
    listAvailableRooms(record.gender)
      .then((res) => setMoveRooms(res.rooms))
      .catch(() => setMoveRooms([]));
  }

  function closeRecord() {
    setSelected(null);
    setSelectedItems(null);
    setMoveChoice('');
  }

  async function handleMoveRoom() {
    if (!selected || !moveChoice) return;
    setMoving(true);
    try {
      await reassignRoom(selected.id, Number(moveChoice));
      showToast(`${selected.first_name} ${selected.last_name} a été déplacé(e).`, 'success');
      closeRecord();
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Déplacement impossible.', 'error');
    } finally {
      setMoving(false);
    }
  }

  // Chambres cibles : même endpoint que la page Chambres, on exclut juste la
  // chambre actuelle du DUT1 sélectionné.
  const moveTargets = selected
    ? moveRooms.filter((r) => r.id !== selected.room_id)
    : [];

  return (
    <div>
      <PageHeader
        title="Annuaire DUT1"
        description="Nom, département, téléphone et bagages — clique sur une ligne pour la fiche détaillée et les photos des bagages."
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
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 text-xs uppercase text-muted-foreground hover:bg-muted/50">
                  <TableHead className="py-3 pl-4">Nom</TableHead>
                  <TableHead>Département</TableHead>
                  <TableHead>Genre</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Chambre</TableHead>
                  <TableHead>Bagages</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.records.map((record, i) => {
                  const luggage = getLuggageStatus(record);
                  return (
                    <TableRow
                      key={record.id}
                      onClick={() => openRecord(record)}
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
                      <TableCell>
                        <Badge variant={luggage.variant}>
                          <LuggageIcon className="mr-1 inline h-3 w-3" />
                          {luggage.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {data.records.map((record, i) => {
              const luggage = getLuggageStatus(record);
              return (
                <div key={record.id} className="animate-fade-in-up" style={staggerStyle(i)}>
                  <Dut1Card
                    record={record}
                    onClick={() => openRecord(record)}
                    actions={
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm text-muted-foreground">Tél. {record.phone_number || '—'}</p>
                        <Badge variant={luggage.variant} className="shrink-0">
                          <LuggageIcon className="mr-1 inline h-3 w-3" />
                          {luggage.label}
                        </Badge>
                      </div>
                    }
                  />
                </div>
              );
            })}
          </div>

          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
        </>
      )}

      <RecordDetailModal
        record={selected}
        items={selectedItems}
        onClose={closeRecord}
        moveTargets={moveTargets}
        moveChoice={moveChoice}
        onMoveChoice={setMoveChoice}
        onMove={handleMoveRoom}
        moving={moving}
      />
    </div>
  );
}
