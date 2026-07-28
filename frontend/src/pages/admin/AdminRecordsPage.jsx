import { useCallback, useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { listDut1, updateDut1, reassignRoom } from '../../api/dut1Api';
import { listRooms } from '../../api/roomApi';
import RecordsTable from '../../components/table/RecordsTable';
import Modal from '../../components/common/Modal';
import Dut1BasicForm from '../../components/dut1/Dut1BasicForm';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState, EmptyState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { DEPARTMENTS, DEPARTMENT_LABELS } from '../../utils/departments';
import { recordToFormValues } from '../../utils/recordMapping';
import { useToast } from '../../hooks/useToast';

export default function AdminRecordsPage() {
  const { showToast } = useToast();
  const [filters, setFilters] = useState({ search: '', department: '', gender: '' });
  const [selected, setSelected] = useState(null);
  const [formValues, setFormValues] = useState(null);
  const [roomChoice, setRoomChoice] = useState('');
  const [saving, setSaving] = useState(false);

  const fetcher = useCallback(
    () => listDut1({ search: filters.search, department: filters.department, gender: filters.gender }),
    [filters.search, filters.department, filters.gender]
  );
  const { data, loading, error, reload } = useFetch(fetcher, [filters.search, filters.department, filters.gender]);
  const roomsFetch = useFetch(listRooms, []);

  function openRecord(record) {
    setSelected(record);
    setFormValues(recordToFormValues(record));
    setRoomChoice(record.room_id || '');
  }

  function closeModal() {
    setSelected(null);
    setFormValues(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateDut1(selected.id, formValues);
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

  const compatibleRooms = (roomsFetch.data?.rooms || []).filter((r) => !selected || r.gender === selected.gender);

  return (
    <div>
      <PageHeader title="Dossiers DUT1" />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input
          placeholder="Rechercher un nom…"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
        <Select
          placeholder="Tous les départements"
          value={filters.department}
          onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}
          options={DEPARTMENTS.map((d) => ({ value: d, label: DEPARTMENT_LABELS[d] }))}
        />
        <Select
          placeholder="Tous les genres"
          value={filters.gender}
          onChange={(e) => setFilters((f) => ({ ...f, gender: e.target.value }))}
          options={[
            { value: 'M', label: 'Masculin' },
            { value: 'F', label: 'Féminin' },
          ]}
        />
      </div>

      {loading && <CardListSkeleton rows={6} />}
      {error && <ErrorState label={error} onRetry={reload} />}
      {!loading && !error && data.records.length === 0 && <EmptyState label="Aucun dossier trouvé." />}
      {!loading && !error && data.records.length > 0 && <RecordsTable records={data.records} onSelect={openRecord} />}

      <Modal open={!!selected} onClose={closeModal} title={selected ? `${selected.first_name} ${selected.last_name}` : ''}>
        {formValues && (
          <div className="flex flex-col gap-4">
            <Dut1BasicForm values={formValues} onChange={(key, value) => setFormValues((v) => ({ ...v, [key]: value }))} />

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

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeModal}>
                Annuler
              </Button>
              <Button onClick={handleSave} loading={saving}>
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
