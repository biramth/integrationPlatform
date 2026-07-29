import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import * as roomApi from '../../api/roomApi';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState, EmptyState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { useToast } from '../../hooks/useToast';
import { staggerStyle } from '../../utils/stagger';

const EMPTY_FORM = { label: '', gender: '', capacity: '', building: '' };

export default function AdminRoomsPage() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useFetch(roomApi.listRooms, []);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <div>
      <PageHeader title="Chambres" />

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
          {data.rooms.map((room, i) => (
            <div key={room.id} className="animate-fade-in-up" style={staggerStyle(i)}>
              <Card accent={room.gender === 'M' ? 'bg-sky-600' : 'bg-pink-500'} className="pl-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium text-slate-900">{room.label}</p>
                  <Badge variant={room.occupied >= room.capacity ? 'danger' : 'success'}>
                    {room.occupied}/{room.capacity}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500">{room.gender === 'M' ? 'Masculin' : 'Féminin'} · {room.building || '—'}</p>
                <button
                  onClick={() => handleDelete(room)}
                  className="mt-3 flex items-center gap-1 text-xs text-red-600 transition-colors hover:text-red-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
                  disabled={room.occupied > 0}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Supprimer
                </button>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
