import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Plus, Pencil, ChevronDown, BedDouble, Printer, Upload, DoorOpen, Users, PercentCircle, ArrowRightLeft } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import RoomsImportPanel from '../../components/admin/RoomsImportPanel';
import * as roomApi from '../../api/roomApi';
import * as statsApi from '../../api/statsApi';
import { listDut1, reassignRoom } from '../../api/dut1Api';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/stats/StatCard';
import { ErrorState, EmptyState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { useToast } from '../../hooks/useToast';
import { staggerStyle } from '../../utils/stagger';
import { getMattressStatus } from '../../utils/mattressStatus';
import { DEPARTMENT_LABELS } from '../../utils/departments';

const EMPTY_FORM = { label: '', gender: '', capacity: '', building: '' };

export default function AdminRoomsPage() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useFetch(roomApi.listRooms, []);
  const occupancyFetch = useFetch(statsApi.getRoomsOccupancy, []);
  const [movingOccupant, setMovingOccupant] = useState(null);
  const [moveTargetRoomId, setMoveTargetRoomId] = useState('');
  const [moving, setMoving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [editingRoom, setEditingRoom] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [expandedId, setExpandedId] = useState(null);
  const [occupantsByRoom, setOccupantsByRoom] = useState({});
  const [historyRoomId, setHistoryRoomId] = useState(null);
  const [historyByRoom, setHistoryByRoom] = useState({});
  const [importOpen, setImportOpen] = useState(false);

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

  async function toggleHistory(room) {
    if (historyRoomId === room.id) {
      setHistoryRoomId(null);
      return;
    }
    setHistoryRoomId(room.id);
    if (!historyByRoom[room.id]) {
      const res = await roomApi.getRoomHistory(room.id);
      setHistoryByRoom((m) => ({ ...m, [room.id]: res.history }));
    }
  }

  function openMove(occupant, fromRoomId) {
    setMovingOccupant({ ...occupant, fromRoomId });
    setMoveTargetRoomId('');
  }

  function closeMove() {
    setMovingOccupant(null);
  }

  async function handleMove() {
    if (!moveTargetRoomId) return;
    setMoving(true);
    try {
      await reassignRoom(movingOccupant.id, Number(moveTargetRoomId));
      showToast(`${movingOccupant.first_name} ${movingOccupant.last_name} déplacé(e).`, 'success');
      setOccupantsByRoom({});
      setExpandedId(null);
      closeMove();
      reload();
      occupancyFetch.reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Déplacement impossible.', 'error');
    } finally {
      setMoving(false);
    }
  }

  const occ = occupancyFetch.data;
  const targetRooms = (data?.rooms || []).filter(
    (r) => movingOccupant && r.id !== movingOccupant.fromRoomId && r.gender === movingOccupant.gender && r.occupied < r.capacity
  );

  return (
    <div>
      <PageHeader
        title="Chambres"
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/print/rooms">
              <Button variant="secondary">
                <Printer className="h-4 w-4" /> Imprimer fiches chambres
              </Button>
            </Link>
            <Button variant="secondary" onClick={() => setImportOpen((v) => !v)}>
              <Upload className="h-4 w-4" /> {importOpen ? "Fermer l'import" : 'Importer (Excel)'}
            </Button>
          </div>
        }
      />

      {occ && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Chambres" value={occ.rooms.length} icon={DoorOpen} tone="blue" />
          <StatCard label="Places occupées" value={occ.totalOccupied} sublabel={`sur ${occ.totalCapacity}`} icon={Users} tone="violet" />
          <StatCard label="Places libres" value={occ.totalCapacity - occ.totalOccupied} icon={BedDouble} tone="emerald" />
          <StatCard label="Taux d'occupation" value={`${occ.occupancyRate}%`} icon={PercentCircle} tone="amber" />
        </div>
      )}

      {importOpen && (
        <RoomsImportPanel
          onImported={() => {
            setImportOpen(false);
            reload();
          }}
        />
      )}

      <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-semibold text-foreground">Ajouter une chambre</p>
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
            const historyExpanded = historyRoomId === room.id;
            const history = historyByRoom[room.id];
            const mattress = getMattressStatus(room);
            return (
              <div key={room.id} className="animate-fade-in-up" style={staggerStyle(i)}>
                <Card accent={room.gender === 'M' ? 'bg-sky-600' : 'bg-pink-500'} className="pl-5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium text-foreground">{room.label}</p>
                    <Badge variant={room.occupied >= room.capacity ? 'danger' : 'success'}>
                      {room.occupied}/{room.capacity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{room.gender === 'M' ? 'Masculin' : 'Féminin'} · {room.building || '—'}</p>
                  <div className="mt-2">
                    <Badge variant={mattress.variant}>
                      <BedDouble className="mr-1 inline h-3 w-3" /> {mattress.label}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEdit(room)}
                        className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(room)}
                        className="flex items-center gap-1 text-xs text-danger transition-colors hover:opacity-80 hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
                        disabled={room.occupied > 0}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Supprimer
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleExpand(room)}
                        className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Occupants
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                      </button>
                      <button
                        onClick={() => toggleHistory(room)}
                        className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Historique
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${historyExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-3 border-t border-border pt-3">
                      {occupants === undefined && <p className="text-xs text-muted-foreground">Chargement…</p>}
                      {occupants && occupants.length === 0 && <p className="text-xs text-muted-foreground">Aucun DUT1 assigné.</p>}
                      {occupants && occupants.length > 0 && (
                        <ul className="flex flex-col gap-2">
                          {occupants.map((o) => (
                            <li key={o.id} className="flex items-center justify-between gap-2 text-sm">
                              <span>
                                <span className="text-foreground">
                                  {o.first_name} {o.last_name}
                                </span>
                                <span className="ml-1.5 text-xs text-muted-foreground">
                                  {DEPARTMENT_LABELS[o.department] || o.department}
                                </span>
                              </span>
                              <button
                                onClick={() => openMove(o, room.id)}
                                className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
                              >
                                <ArrowRightLeft className="h-3.5 w-3.5" /> Déplacer
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {historyExpanded && (
                    <div className="mt-3 border-t border-border pt-3">
                      {history === undefined && <p className="text-xs text-muted-foreground">Chargement…</p>}
                      {history && history.length === 0 && <p className="text-xs text-muted-foreground">Aucun changement enregistré.</p>}
                      {history && history.length > 0 && (
                        <ul className="flex flex-col gap-1.5">
                          {history.map((h) => (
                            <li key={h.id} className="text-xs text-muted-foreground">
                              {h.first_name} {h.last_name} —{' '}
                              {h.old_room_label ? `${h.old_room_label} → ${h.new_room_label || 'aucune'}` : 'assigné(e) ici'}
                              {' · '}
                              {new Date(h.changed_at).toLocaleString('fr-FR')}
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

      <Modal
        open={!!movingOccupant}
        onClose={closeMove}
        title={movingOccupant ? `Déplacer ${movingOccupant.first_name} ${movingOccupant.last_name}` : ''}
      >
        {movingOccupant && (
          <div className="flex flex-col gap-3">
            <Select
              label="Nouvelle chambre"
              placeholder="Choisir une chambre…"
              value={moveTargetRoomId}
              onChange={(e) => setMoveTargetRoomId(e.target.value)}
              options={targetRooms.map((r) => ({ value: r.id, label: `${r.label} (${r.occupied}/${r.capacity})` }))}
            />
            {targetRooms.length === 0 && (
              <p className="text-xs text-muted-foreground">Aucune autre chambre disponible pour ce genre.</p>
            )}
            <div className="mt-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={closeMove}>
                Annuler
              </Button>
              <Button onClick={handleMove} loading={moving} disabled={!moveTargetRoomId}>
                Déplacer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
