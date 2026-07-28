export function LoadingState({ label = 'Chargement…' }) {
  return <div className="flex items-center justify-center py-10 text-sm text-slate-500">{label}</div>;
}

export function EmptyState({ label = 'Aucun résultat.' }) {
  return <div className="flex items-center justify-center py-10 text-sm text-slate-400">{label}</div>;
}

export function ErrorState({ label = 'Une erreur est survenue.', onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-sm text-red-600">
      <span>{label}</span>
      {onRetry && (
        <button onClick={onRetry} className="rounded-lg bg-red-50 px-3 py-1.5 text-red-700 hover:bg-red-100">
          Réessayer
        </button>
      )}
    </div>
  );
}
