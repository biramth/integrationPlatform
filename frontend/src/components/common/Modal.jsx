import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center animate-overlay-in"
      onClick={onClose}
    >
      <div
        className="max-h-[90svh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl animate-modal-in sm:max-w-lg sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100"
            aria-label="Fermer"
          >
            <X className="h-4.5 w-4.5" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
