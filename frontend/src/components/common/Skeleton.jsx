export default function Skeleton({ className = '' }) {
  return <div className={`animate-pulse-skeleton rounded-lg bg-slate-200 ${className}`} />;
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-2 h-7 w-14" />
      <Skeleton className="mt-2 h-3 w-24" />
    </div>
  );
}

export function CardRowSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-3 w-20" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function CardListSkeleton({ rows = 4 }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <CardRowSkeleton key={i} />
      ))}
    </div>
  );
}
