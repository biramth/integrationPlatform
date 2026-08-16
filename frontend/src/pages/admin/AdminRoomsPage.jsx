import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Plus, Pencil, ChevronDown, BedDouble, Printer } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import * as roomApi from '../../api/roomApi';
import { listDut1 } from '../../api/dut1Api';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState, EmptyState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { useToast } from '../../hooks/useToast';
import { staggerStyle } from '../../utils/stagger';
import { getMattressStatus } from '../../utils/mattressStatus';

const EMPTY_FORM = { label: '', gender: '', capacity: '', building: '' };

export default function AdminRoomsPage() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useFetch(roomApi.listRooms, []);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [editingRoom, setEditingRoom] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [expandedId, setExpandedId] = useState(null);
  const [occupantsByRoom, setOccupantsByRoom] = useState({});

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await roomApi.createRoom({ ...form, capacity: Number(form.capacity) });
      setForm(EMPTY_FORM);
      showToast('Chambre ajoutée.', 'success');
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur lors de la création.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(room) {
    if (!window.confirm(`Supprimer la chambre ${room.label} ?`)) return;
    try {
      await roomApi.deleteRoom(room.id);
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Suppression impossible.', 'error');
    }
  }

  function openEdit(room) {
    setEditingRoom(room);
    setEditForm({
      label: room.label,
      gender: room.gender,
      capacity: String(room.capacity),
      building: room.building || '',
      mattressCount: room.mattress_count ?? '',
    });
  }

  function closeEdit() {
    setEditingRoom(null);
  }

  async function handleSaveEdit() {
    setSaving(true);
    try {
      await roomApi.updateRoom(editingRoom.id, {
        label: editForm.label,
        gender: editForm.gender,
        capacity: Number(editForm.capacity),
        building: editForm.building,
      });
      const mattressValue = editForm.mattressCount === '' ? null : Number(editForm.mattressCount);
      if (mattressValue !== (editingRoom.mattress_count ?? null)) {
        await roomApi.updateMattressCount(editingRoom.id, mattressValue);
      }
      showToast('Chambre mise à jour.', 'success');
      closeEdit();
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur lors de la mise à jour.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleExpand(room) {
    if (expandedId === room.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(room.id);
    if (!occupantsByRoom[room.id]) {
      const res = await listDut1({ roomId: room.id, pageSize: 100 });
      setOccupantsByRoom((m) => ({ ...m, [room.id]: res.records }));
    }
  }

  return (
    <div>
      <PageHeader
        title="Chambres"
        action={
          <Link to="/admin/print/rooms">
            <Button variant="secondary">
              <Printer className="h-4 w-4" /> Imprimer fiches chambres
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-semibold text-slate-900">Ajouter une chambre</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Input
            label="Label / Numéro"
            required
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          />
          <Select
            label="Genre"
            required
            placeholder="Choisir…"
            value={form.gender}
            onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
            options={[
              { value: 'M', label: 'Masculin' },
              { value: 'F', label: 'Féminin' },
            ]}
          />
          <Input
            label="Capacité"
            type="number"
            min="1"
            required
            value={form.capacity}
            onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
          />
          <Input
            label="Bâtiment"
            value={form.building}
            onChange={(e) => setForm((f) => ({ ...f, building: e.target.value }))}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <Button type="submit" loading={submitting}>
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </div>
      </form>

      {loading && <CardListSkeleton />}
      {error && <ErrorState label={error} onRetry={reload} />}
      {!loading && !error && data.rooms.length === 0 && <EmptyState label="Aucune chambre configurée." />}

      {!loading && !error && data.rooms.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.rooms.map((room, i) => {
            const expanded = expandedId === room.id;
            const occupants = occupantsByRoom[room.id];
            const mattress = getMattressStatus(room);
            return (
              <div key={room.id} className="animate-fade-in-up" style={staggerStyle(i)}>
                <Card accent={room.gender === 'M' ? 'bg-sky-600' : 'bg-pink-500'} className="pl-5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium text-slate-900">{room.label}</p>
                    <Badge variant={room.occupied >= room.capacity ? 'danger' : 'success'}>
                      {room.occupied}/{room.capacity}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500">{room.gender === 'M' ? 'Masculin' : 'Féminin'} · {room.building || '—'}</p>
                  <div className="mt-2">
                    <Badge variant={mattress.variant}>
                      <BedDouble className="mr-1 inline h-3 w-3" /> Matelas {mattress.label}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEdit(room)}
                        className="flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-slate-700 hover:underline"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(room)}
                        className="flex items-center gap-1 text-xs text-red-600 transition-colors hover:text-red-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
                        disabled={room.occupied > 0}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Supprimer
                      </button>
                    </div>
                    <button
                      onClick={() => toggleExpand(room)}
                      className="flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-slate-700"
                    >
                      Occupants
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {expanded && (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      {occupants === undefined && <p className="text-xs text-slate-400">Chargement…</p>}
                      {occupants && occupants.length === 0 && <p className="text-xs text-slate-400">Aucun DUT1 assigné.</p>}
                      {occupants && occupants.length > 0 && (
                        <ul className="flex flex-col gap-1.5">
                          {occupants.map((o) => (
                            <li key={o.id} className="text-sm text-slate-700">
                              {o.first_name} {o.last_name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!editingRoom} onClose={closeEdit} title={editingRoom ? `Modifier ${editingRoom.label}` : ''}>
        {editingRoom && (
          <div className="flex flex-col gap-3">
            <Input
              label="Label / Numéro"
              value={editForm.label}
              onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
            />
            <Select
              label="Genre"
              value={editForm.gender}
              onChange={(e) => setEditForm((f) => ({ ...f, gender: e.target.value }))}
              options={[
                { value: 'M', label: 'Masculin' },
                { value: 'F', label: 'Féminin' },
              ]}
            />
            <Input
              label="Capacité"
              type="number"
              min="1"
              value={editForm.capacity}
              onChange={(e) => setEditForm((f) => ({ ...f, capacity: e.target.value }))}
            />
            <Input
              label="Bâtiment"
              value={editForm.building}
              onChange={(e) => setEditForm((f) => ({ ...f, building: e.target.value }))}
            />
            <Input
              label="Matelas comptés"
              type="number"
              min="0"
              placeholder="Non compté"
              value={editForm.mattressCount}
              onChange={(e) => setEditForm((f) => ({ ...f, mattressCount: e.target.value }))}
            />

            <div className="mt-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={closeEdit}>
                Annuler
              </Button>
              <Button onClick={handleSaveEdit} loading={saving}>
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
