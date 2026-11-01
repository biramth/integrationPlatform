import { useEffect, useState } from 'react';
import { ShieldAlert, X, ImageOff, Maximize2 } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

export default function LuggageItemThumb({ item, index, onDelete }) {
  const [src, setSrc] = useState(null);
  const [hasError, setHasError] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    let objectUrl;
    let cancelled = false;

    axiosClient
      .get(`/luggage-items/${item.id}/photo`, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setSrc(objectUrl);
        setHasError(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn(`[LuggageItemThumb] Erreur photo #${item.id}:`, err?.message);
        setHasError(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setSrc(null);
      setHasError(false);
    };
  }, [item.id]);

  return (
    <>
      <div className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
        {src ? (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="h-full w-full block text-left focus:outline-none focus:ring-2 focus:ring-primary"
            title="Cliquer pour agrandir la photo"
          >
            <img src={src} alt={`Bagage ${index + 1}`} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <Maximize2 className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
            </div>
          </button>
        ) : hasError ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-muted p-1 text-center text-muted-foreground">
            <ImageOff className="h-5 w-5 text-muted-foreground/60" />
            <span className="text-[10px] leading-tight text-muted-foreground">Photo indisponible</span>
          </div>
        ) : (
          <div className="h-full w-full animate-pulse bg-muted" />
        )}

        <span className="pointer-events-none absolute bottom-0 left-0 rounded-tr-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
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

        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(item)}
            aria-label="Supprimer ce bagage"
            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-card/90 text-muted-foreground shadow transition-colors hover:bg-danger hover:text-danger-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {showModal && src && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl bg-card border border-border shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 px-2 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">Bagage #{index + 1}</span>
                {item.is_sensitive && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning font-medium">
                    <ShieldAlert className="h-3.5 w-3.5" /> Sensible: {item.sensitive_note || 'Oui'}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-center max-h-[75vh] overflow-hidden">
              <img
                src={src}
                alt={`Bagage ${index + 1}`}
                className="max-h-[75vh] max-w-full rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
