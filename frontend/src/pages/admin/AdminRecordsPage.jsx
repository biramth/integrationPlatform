import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Trash2, Download, Printer, ChevronDown, Upload } from 'lucide-react';
import AdmittedStudentsImportPanel from '../../components/admin/AdmittedStudentsImportPanel';
import { useFetch } from '../../hooks/useFetch';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { listDut1, updateDut1, deleteDut1, reassignRoom, exportDut1Csv, getDut1RoomHistory } from '../../api/dut1Api';
import { listRooms } from '../../api/roomApi';
import RecordsTable from '../../components/table/RecordsTable';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import Dut1BasicForm from '../../components/dut1/Dut1BasicForm';
import AdmissionListToggle from '../../components/dut1/AdmissionListToggle';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState, EmptyState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { DEPARTMENTS, DEPARTMENT_LABELS } from '../../utils/departments';
import { recordToFormValues } from '../../utils/recordMapping';
import { useToast } from '../../hooks/useToast';

const PAGE_SIZE = 25;

export default function AdminRecordsPage() {
  const { showToast } = useToast();
  const [filters, setFilters] = useState({ search: '', department: '', gender: '' });
  const debouncedSearch = useDebouncedValue(filters.search, 350);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [formValues, setFormValues] = useState(null);
  const [roomChoice, setRoomChoice] = useState('');
  const [admissionListType, setAdmissionListType] = useState(null);
  const [roomHistory, setRoomHistory] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const fetcher = useCallback(
    () => listDut1({ search: debouncedSearch, department: filters.department, gender: filters.gender, page, pageSize: PAGE_SIZE }),
    [debouncedSearch, filters.department, filters.gender, page]
  );
  const { data, loading, error, reload } = useFetch(fetcher, [debouncedSearch, filters.department, filters.gender, page]);
  const roomsFetch = useFetch(listRooms, []);

  function updateFilters(patch) {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
    setSelectedIds(new Set());
  }

  function changePage(nextPage) {
    setPage(nextPage);
    setSelectedIds(new Set());
  }

  function openRecord(record) {
    setSelected(record);
    setFormValues(recordToFormValues(record));
    setRoomChoice(record.room_id || '');
    setAdmissionListType(record.admission_list_type || null);
    setRoomHistory(null);
    setHistoryOpen(false);
  }

  function closeModal() {
    setSelected(null);
    setFormValues(null);
  }

  function toggleHistory() {
    setHistoryOpen((open) => !open);
    if (!roomHistory) {
      getDut1RoomHistory(selected.id).then((res) => setRoomHistory(res.history));
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateDut1(selected.id, { ...formValues, admissionListType });
      if (roomChoice && Number(roomChoice) !== selected.room_id) {
        await reassignRoom(selected.id, Number(roomChoice));
      }
      showToast('Dossier mis à jour.', 'success');
      reload();
      roomsFetch.reload();
      closeModal();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur lors de la mise à jour.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer définitivement le dossier de ${selected.first_name} ${selected.last_name} ?`)) return;
    setDeleting(true);
    try {
      await deleteDut1(selected.id);
      showToast('Dossier supprimé.', 'success');
      reload();
      roomsFetch.reload();
      closeModal();
    } catch (err) {
      showToast(err.response?.data?.error || 'Suppression impossible.', 'error');
    } finally {
      setDeleting(false);
    }
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const pageIds = data?.records.map((r) => r.id) || [];
    setSelectedIds((prev) => (pageIds.every((id) => prev.has(id)) && pageIds.length > 0 ? new Set() : new Set(pageIds)));
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Supprimer définitivement ${selectedIds.size} dossier(s) ?`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedIds].map((id) => deleteDut1(id)));
      showToast(`${selectedIds.size} dossier(s) supprimé(s).`, 'success');
      setSelectedIds(new Set());
      reload();
      roomsFetch.reload();
    } catch {
      showToast('Certaines suppressions ont échoué.', 'error');
      reload();
    } finally {
      setBulkDeleting(false);
    }
  }

  const compatibleRooms = (roomsFetch.data?.rooms || []).filter((r) => !selected || r.gender === selected.gender);
  const pageIds = data?.records.map((r) => r.id) || [];
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportDut1Csv({ search: debouncedSearch, department: filters.department, gender: filters.gender });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dut1_export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Erreur lors de l'export.", 'error');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Dossiers DUT1"
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/print/luggage">
              <Button variant="secondary">
                <Printer className="h-4 w-4" /> Imprimer manifeste bagages
              </Button>
            </Link>
            <Button variant="secondary" onClick={handleExport} loading={exporting}>
              <Download className="h-4 w-4" /> Exporter CSV
            </Button>
            <Button variant="secondary" onClick={() => setImportOpen((v) => !v)}>
              <Upload className="h-4 w-4" /> {importOpen ? 'Fermer l\'import' : 'Importer (Excel)'}
            </Button>
          </div>
        }
      />

      {importOpen && (
        <AdmittedStudentsImportPanel
          onImported={() => {
            setImportOpen(false);
            reload();
          }}
        />
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
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
        <Select
          placeholder="Tous les genres"
          value={filters.gender}
          onChange={(e) => updateFilters({ gender: e.target.value })}
          options={[
            { value: 'M', label: 'Masculin' },
            { value: 'F', label: 'Féminin' },
          ]}
        />
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
          <p className="text-sm font-medium text-blue-900">{selectedIds.size} sélectionné(s)</p>
          <Button variant="danger" onClick={handleBulkDelete} loading={bulkDeleting} className="px-3 py-1.5 text-xs">
            <Trash2 className="h-3.5 w-3.5" /> Supprimer la sélection
          </Button>
        </div>
      )}

      {loading && <CardListSkeleton rows={6} />}
      {error && <ErrorState label={error} onRetry={reload} />}
      {!loading && !error && data.records.length === 0 && <EmptyState label="Aucun dossier trouvé." />}
      {!loading && !error && data.records.length > 0 && (
        <>
          <RecordsTable
            records={data.records}
            onSelect={openRecord}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            allSelected={allSelected}
          />
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={changePage} />
        </>
      )}

      <Modal open={!!selected} onClose={closeModal} title={selected ? `${selected.first_name} ${selected.last_name}` : ''}>
        {formValues && (
          <div className="flex flex-col gap-4">
            <Dut1BasicForm values={formValues} onChange={(key, value) => setFormValues((v) => ({ ...v, [key]: value }))} />

            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-700">Admission au concours</p>
              <AdmissionListToggle value={admissionListType} onChange={setAdmissionListType} />
            </div>

            <div>
              <Select
                label="Chambre assignée"
                value={roomChoice}
                onChange={(e) => setRoomChoice(e.target.value)}
                placeholder="Aucune"
                options={compatibleRooms.map((r) => ({
                  value: r.id,
                  label: `${r.label} (${r.occupied}/${r.capacity})`,
                }))}
              />
            </div>

            <div>
              <button
                type="button"
                onClick={toggleHistory}
                className="flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-slate-700"
              >
                Historique des chambres
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${historyOpen ? 'rotate-180' : ''}`} />
              </button>
              {historyOpen && (
                <div className="mt-2 border-t border-slate-100 pt-2">
                  {!roomHistory && <p className="text-xs text-slate-400">Chargement…</p>}
                  {roomHistory && roomHistory.length === 0 && <p className="text-xs text-slate-400">Aucun changement de chambre.</p>}
                  {roomHistory && roomHistory.length > 0 && (
                    <ul className="flex flex-col gap-1.5">
                      {roomHistory.map((h) => (
                        <li key={h.id} className="text-xs text-slate-600">
                          {h.old_room_label ? `${h.old_room_label} → ${h.new_room_label || 'aucune'}` : `Assigné à ${h.new_room_label}`}
                          {' · '}
                          {new Date(h.changed_at).toLocaleString('fr-FR')} par {h.changed_by_name || '—'}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <Button variant="danger" onClick={handleDelete} loading={deleting}>
                <Trash2 className="h-4 w-4" /> Supprimer
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={closeModal}>
                  Annuler
                </Button>
                <Button onClick={handleSave} loading={saving}>
                  Enregistrer
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
