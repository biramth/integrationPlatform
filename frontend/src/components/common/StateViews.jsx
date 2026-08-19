import { Inbox } from 'lucide-react';

export function LoadingState({ label = 'Chargement…' }) {
  return <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">{label}</div>;
}

export function EmptyState({ label = 'Aucun résultat.', icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
      <Icon className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ label = 'Une erreur est survenue.', onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-sm text-danger">
      <span>{label}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg bg-danger-soft px-3 py-1.5 text-danger-soft-foreground transition-opacity hover:opacity-80"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}
