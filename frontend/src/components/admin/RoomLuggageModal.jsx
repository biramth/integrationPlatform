import { useState, useCallback } from 'react';
import { Package, X, Camera, ShieldAlert, Loader2 } from 'lucide-react';
import * as roomApi from '../../api/roomApi';
import LuggageItemThumb from '../../components/upload/LuggageItemThumb';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { useToast } from '../../hooks/useToast';

export function useRoomLuggage() {
  const { showToast } = useToast();
  const [luggageRoom, setLuggageRoom] = useState(null);
  const [luggageItems, setLuggageItems] = useState([]);
  const [luggageLoading, setLuggageLoading] = useState(false);

  const openLuggage = useCallback(async (room) => {
    setLuggageRoom(room);
    setLuggageItems([]);
    setLuggageLoading(true);
    try {
      const res = await roomApi.getRoomLuggage(room.id);
      setLuggageItems(res.items || []);
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur chargement bagages.', 'error');
      setLuggageRoom(null);
    } finally {
      setLuggageLoading(false);
    }
  }, [showToast]);

  const closeLuggage = useCallback(() => {
    setLuggageRoom(null);
    setLuggageItems([]);
  }, []);

  return { luggageRoom, luggageItems, luggageLoading, openLuggage, closeLuggage };
}

export function RoomLuggageModal({ luggageRoom, luggageItems, luggageLoading, onClose }) {
  if (!luggageRoom) return null;
  return (
    <Modal open={!!luggageRoom} onClose={onClose} title={`Bagages — ${luggageRoom.label}`}>
      {luggageLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : luggageItems.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Aucun bagage enregistré pour cette chambre.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{luggageItems.length} bagage{luggageItems.length > 1 ? 's' : ''} trouvé{luggageItems.length > 1 ? 's' : ''}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {luggageItems.map((item, idx) => (
              <div key={item.id} className="flex flex-col gap-1 rounded-lg border border-border p-2">
                <LuggageItemThumb item={item} index={idx} />
                <p className="truncate text-xs font-medium text-foreground">{item.first_name} {item.last_name}</p>
                <p className="truncate text-[10px] text-muted-foreground">{item.department}</p>
                {item.is_sensitive && (
                  <Badge variant="warning" className="text-[10px]">
                    <ShieldAlert className="mr-0.5 inline h-2.5 w-2.5" /> Sensible
                  </Badge>
                )}
                {item.sensitive_note && (
                  <p className="text-[10px] text-warning">{item.sensitive_note}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
