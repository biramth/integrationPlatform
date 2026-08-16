import { Badge as ShadBadge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const VARIANTS = {
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-700',
};

export default function Badge({ variant = 'neutral', className = '', children }) {
  return (
    <ShadBadge variant="secondary" className={cn('h-auto py-0.5', VARIANTS[variant], className)}>
      {children}
    </ShadBadge>
  );
}
