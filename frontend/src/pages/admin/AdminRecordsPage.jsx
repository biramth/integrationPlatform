import { useCallback, useState } from 'react';
import { Search, Trash2, Download, Phone, ChevronDown, Upload } from 'lucide-react';
import AdmittedStudentsImportPanel from '../../components/admin/AdmittedStudentsImportPanel';
import { useFetch } from '../../hooks/useFetch';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import {
  listDut1,
  updateDut1,
  deleteDut1,
  reassignRoom,
  exportDut1Csv,
  exportDut1ContactsCsv,
  getDut1RoomHistory,
} from '../../api/dut1Api';
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
  const [exportingContacts, setExportingContacts] = useState(false);
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

  function describeImpact(impact) {
    const parts = [];
    if (impact.complementaryCompleted) parts.push('la phase 2 (Santé) est complétée');
    if (impact.luggageCount > 0) parts.push(`${impact.luggageCount} bagage(s) photographié(s)`);
    if (impact.allergensCount > 0) parts.push(`${impact.allergensCount} allergie(s) déclarée(s)`);
    if (impact.restrictionsCount > 0) parts.push(`${impact.restrictionsCount} restriction(s) de santé`);
    return parts.join(', ');
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
      if (err.response?.status === 409 && err.response.data?.requiresConfirmation) {
        const proceed = window.confirm(
          `Attention : ${describeImpact(err.response.data.impact)} — ces données seront perdues définitivement. Confirmer la suppression ?`
        );
        if (proceed) {
          try {
            await deleteDut1(selected.id, { confirm: true });
            showToast('Dossier supprimé.', 'success');
            reload();
            roomsFetch.reload();
            closeModal();
          } catch (err2) {
            showToast(err2.response?.data?.error || 'Suppression impossible.', 'error');
          }
        }
      } else {
        showToast(err.response?.data?.error || 'Suppression impossible.', 'error');
      }
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
    const ids = [...selectedIds];
    try {
      const results = await Promise.allSettled(ids.map((id) => deleteDut1(id)));
      const needsConfirm = [];
      let otherFailures = 0;
      results.forEach((r, i) => {
        if (r.status !== 'rejected') return;
        if (r.reason?.response?.status === 409 && r.reason.response.data?.requiresConfirmation) {
          needsConfirm.push(ids[i]);
        } else {
          otherFailures += 1;
        }
      });

      let confirmedFailures = 0;
      if (needsConfirm.length > 0) {
        const proceed = window.confirm(
          `${needsConfirm.length} dossier(s) contiennent des données d'autres commissions (phase 2, bagages, allergies, restrictions) qui seront perdues définitivement. Confirmer leur suppression aussi ?`
        );
        if (proceed) {
          const retry = await Promise.allSettled(needsConfirm.map((id) => deleteDut1(id, { confirm: true })));
          confirmedFailures = retry.filter((r) => r.status === 'rejected').length;
        } else {
          confirmedFailures = needsConfirm.length;
        }
      }

      const totalFailures = otherFailures + confirmedFailures;
      if (totalFailures > 0) {
        showToast(`${ids.length - totalFailures} dossier(s) supprimé(s), ${totalFailures} non supprimé(s).`, 'error');
      } else {
        showToast(`${ids.length} dossier(s) supprimé(s).`, 'success');
      }
      setSelectedIds(new Set());
      reload();
      roomsFetch.reload();
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

  async function handleExportContacts() {
    setExportingContacts(true);
    try {
      const blob = await exportDut1ContactsCsv({ search: debouncedSearch, department: filters.department, gender: filters.gender });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dut1_contacts.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Erreur lors de l'export.", 'error');
    } finally {
      setExportingContacts(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Dossiers DUT1"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleExportContacts} loading={exportingContacts}>
              <Phone className="h-4 w-4" /> Exporter contacts
            </Button>
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
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-info bg-info-soft px-4 py-2.5">
          <p className="text-sm font-medium text-info-soft-foreground">{selectedIds.size} sélectionné(s)</p>
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
              <p className="mb-1.5 text-sm font-medium text-foreground">Admission au concours</p>
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
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Historique des chambres
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${historyOpen ? 'rotate-180' : ''}`} />
              </button>
              {historyOpen && (
                <div className="mt-2 border-t border-border pt-2">
                  {!roomHistory && <p className="text-xs text-muted-foreground">Chargement…</p>}
                  {roomHistory && roomHistory.length === 0 && <p className="text-xs text-muted-foreground">Aucun changement de chambre.</p>}
                  {roomHistory && roomHistory.length > 0 && (
                    <ul className="flex flex-col gap-1.5">
                      {roomHistory.map((h) => (
                        <li key={h.id} className="text-xs text-muted-foreground">
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
