import { useCallback } from 'react';
import { Printer } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { listRooms } from '../../api/roomApi';
import { listDut1 } from '../../api/dut1Api';
import { getRoomLuggage } from '../../api/roomApi';
import LuggageItemThumb from '../../components/upload/LuggageItemThumb';
import Button from '../../components/common/Button';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState, LoadingState, EmptyState } from '../../components/common/StateViews';
import { DEPARTMENT_LABELS } from '../../utils/departments';

export default function PrintRoomManifestPage() {
  const roomsFetch = useFetch(listRooms, []);

  const occupantsFetcher = useCallback(async () => {
    if (!roomsFetch.data) return {};
    const entries = await Promise.all(
      roomsFetch.data.rooms.map((r) =>
        listDut1({ roomId: r.id, pageSize: 100 }).then((res) => [r.id, res.records])
      )
    );
    return Object.fromEntries(entries);
  }, [roomsFetch.data]);
  const occupantsFetch = useFetch(occupantsFetcher, [roomsFetch.data]);

  const luggageFetcher = useCallback(async () => {
    if (!roomsFetch.data) return {};
    const entries = await Promise.all(
      roomsFetch.data.rooms.map((r) =>
        getRoomLuggage(r.id).then((res) => [r.id, res.items || []])
      )
    );
    return Object.fromEntries(entries);
  }, [roomsFetch.data]);
  const luggageFetch = useFetch(luggageFetcher, [roomsFetch.data]);

  const loading = roomsFetch.loading || occupantsFetch.loading || luggageFetch.loading;
  const error = roomsFetch.error || occupantsFetch.error || luggageFetch.error;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <PageHeader title="Fiches de répartition des chambres" />
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Imprimer
        </Button>
      </div>

      {loading && <LoadingState />}
      {error && <ErrorState label={error} onRetry={roomsFetch.reload} />}
      {!loading && !error && roomsFetch.data.rooms.length === 0 && (
        <EmptyState label="Aucune chambre configurée." />
      )}

      {!loading && !error && roomsFetch.data.rooms.length > 0 && (
        <div className="flex flex-col gap-6 print:text-black">
          {roomsFetch.data.rooms.map((room) => {
            const occupants = occupantsFetch.data?.[room.id] || [];
            const luggage = luggageFetch.data?.[room.id] || [];
            return (
              <div key={room.id} className="break-inside-avoid rounded-lg border border-border p-4 print:border-black">
                <h2 className="mb-2 text-base font-semibold text-foreground">
                  Chambre {room.label} — {room.gender === 'M' ? 'Masculin' : 'Féminin'} — {room.building || '—'} —{' '}
                  {occupants.length}/{room.capacity}
                </h2>
                {occupants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun occupant assigné.</p>
                ) : (
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                        <th className="py-1 pr-4">Nom</th>
                        <th className="py-1 pr-4">Département</th>
                        <th className="py-1 pr-4">Genre</th>
                        <th className="py-1">Bagages</th>
                      </tr>
                    </thead>
                    <tbody>
                      {occupants.map((o) => {
                        const oLuggage = luggage.filter((l) => l.dut1_id === o.id);
                        return (
                          <tr key={o.id} className="border-b border-border">
                            <td className="py-1 pr-4">{o.first_name} {o.last_name}</td>
                            <td className="py-1 pr-4">{DEPARTMENT_LABELS[o.department] || o.department}</td>
                            <td className="py-1 pr-4">{o.gender}</td>
                            <td className="py-1">
                              {oLuggage.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {oLuggage.map((item) => (
                                    <img
                                      key={item.id}
                                      src={`/api/luggage-items/${item.id}/photo`}
                                      alt={item.original_name || 'bagage'}
                                      className="h-10 w-10 rounded object-cover print:h-8 print:w-8"
                                      loading="lazy"
                                    />
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Aucun</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
