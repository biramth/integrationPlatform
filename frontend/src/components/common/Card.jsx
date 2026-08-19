import { cn } from '@/lib/utils';

export default function Card({ interactive = false, accent, className = '', children, ...props }) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border bg-card p-4 text-card-foreground shadow-soft transition-all duration-150',
        interactive && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lifted',
        className
      )}
      {...props}
    >
      {accent && <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />}
      {children}
    </div>
  );
}
