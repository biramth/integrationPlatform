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
