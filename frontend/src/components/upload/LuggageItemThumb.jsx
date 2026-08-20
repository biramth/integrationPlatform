import { useEffect, useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

export default function LuggageItemThumb({ item, index, onDelete }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let objectUrl;
    let cancelled = false;

    axiosClient.get(`/luggage-items/${item.id}/photo`, { responseType: 'blob' }).then((res) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(res.data);
      setSrc(objectUrl);
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.id]);

  return (
    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
      {src ? (
        <img src={src} alt={`Bagage ${index + 1}`} className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full animate-pulse bg-muted" />
      )}
      <span className="absolute bottom-0 left-0 rounded-tr-md bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
        #{index + 1}
      </span>
      {!!item.is_sensitive && (
        <span
          className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-warning text-warning-foreground shadow"
          title={item.sensitive_note || 'Objet sensible'}
        >
          <ShieldAlert className="h-3 w-3" />
        </span>
      )}
      <button
        type="button"
        onClick={() => onDelete(item)}
        aria-label="Supprimer ce bagage"
        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-card/90 text-muted-foreground shadow transition-colors hover:bg-danger hover:text-danger-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
