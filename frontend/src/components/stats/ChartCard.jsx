import { BarChart3 } from 'lucide-react';

export default function ChartCard({ title, children, empty, emptyIcon: EmptyIcon = BarChart3 }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
      <p className="mb-3 text-sm font-semibold text-foreground">{title}</p>
      {empty ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <EmptyIcon className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
          <span>{empty}</span>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
