import { useState } from 'react';
import { ChevronDown, BedDouble } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import * as roomApi from '../../api/roomApi';
import { listDut1 } from '../../api/dut1Api';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState, EmptyState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { useToast } from '../../hooks/useToast';
import { staggerStyle } from '../../utils/stagger';
import { getMattressStatus } from '../../utils/mattressStatus';

export default function RoomsPage() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useFetch(roomApi.listRooms, []);
  const [expandedId, setExpandedId] = useState(null);
  const [occupantsByRoom, setOccupantsByRoom] = useState({});
  const [draftByRoom, setDraftByRoom] = useState({});

  async function toggleExpand(room) {
    if (expandedId === room.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(room.id);
    setDraftByRoom((m) => ({ ...m, [room.id]: room.mattress_count ?? '' }));
    if (!occupantsByRoom[room.id]) {
      const res = await listDut1({ roomId: room.id, pageSize: 100 });
      setOccupantsByRoom((m) => ({ ...m, [room.id]: res.records }));
    }
  }

  async function handleSaveMattress(room) {
    const draft = draftByRoom[room.id];
    const value = draft === '' ? null : Number(draft);
    if (value === (room.mattress_count ?? null)) return;
    try {
      await roomApi.updateMattressCount(room.id, value);
      showToast('Nombre de matelas mis à jour.', 'success');
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Mise à jour impossible.', 'error');
    }
  }

  return (
    <div>
      <PageHeader
        title="Chambres"
        description="Compte le nombre de matelas réellement présents dans chaque chambre."
      />

      {loading && <CardListSkeleton />}
      {error && <ErrorState label={error} onRetry={reload} />}
      {!loading && !error && data.rooms.length === 0 && <EmptyState label="Aucune chambre configurée." />}

      {!loading && !error && data.rooms.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.rooms.map((room, i) => {
            const expanded = expandedId === room.id;
            const occupants = occupantsByRoom[room.id];
            const mattress = getMattressStatus(room);
            return (
              <div key={room.id} className="animate-fade-in-up" style={staggerStyle(i)}>
                <Card>
                  <button
                    type="button"
                    onClick={() => toggleExpand(room)}
                    className="flex w-full items-start justify-between gap-2 text-left"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{room.label}</p>
                      <p className="text-sm text-slate-500">{room.gender === 'M' ? 'Masculin' : 'Féminin'} · {room.building || '—'}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant={room.occupied >= room.capacity ? 'danger' : 'success'}>
                          {room.occupied}/{room.capacity} occupé{room.occupied > 1 ? 's' : ''}
                        </Badge>
                        <Badge variant={mattress.variant}>
                          <BedDouble className="mr-1 inline h-3 w-3" /> {mattress.label}
                        </Badge>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {expanded && (
                    <div className="mt-4 flex flex-col gap-4 border-t border-slate-100 pt-4" onClick={(e) => e.stopPropagation()}>
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="font-medium text-slate-700">Nombre de matelas comptés</span>
                        <input
                          type="number"
                          min="0"
                          value={draftByRoom[room.id] ?? ''}
                          onChange={(e) => setDraftByRoom((m) => ({ ...m, [room.id]: e.target.value }))}
                          onBlur={() => handleSaveMattress(room)}
                          placeholder={`Capacité : ${room.capacity}`}
                          className="min-h-[44px] w-32 rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </label>

                      {occupants === undefined && <p className="text-sm text-slate-400">Chargement des occupants…</p>}
                      {occupants && occupants.length === 0 && <p className="text-sm text-slate-400">Aucun DUT1 assigné.</p>}
                      {occupants && occupants.length > 0 && (
                        <div>
                          <p className="mb-2 text-sm font-medium text-slate-700">Occupants</p>
                          <ul className="flex flex-col gap-1.5">
                            {occupants.map((o) => (
                              <li key={o.id} className="text-sm text-slate-700">
                                {o.first_name} {o.last_name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
