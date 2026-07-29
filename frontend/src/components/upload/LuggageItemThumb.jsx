import { ShieldAlert, X } from 'lucide-react';

export default function LuggageItemThumb({ item, index, onDelete }) {
  return (
    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
      <img src={`/${item.file_path}`} alt={`Bagage ${index + 1}`} className="h-full w-full object-cover" />
      <span className="absolute bottom-0 left-0 rounded-tr-md bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">
        #{index + 1}
      </span>
      {!!item.is_sensitive && (
        <span
          className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white shadow"
          title={item.sensitive_note || 'Objet sensible'}
        >
          <ShieldAlert className="h-3 w-3" />
        </span>
      )}
      <button
        type="button"
        onClick={() => onDelete(item)}
        aria-label="Supprimer ce bagage"
        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow transition-colors hover:bg-red-600 hover:text-white"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
