import { Badge as ShadBadge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const VARIANTS = {
  neutral: 'bg-muted text-muted-foreground',
  success: 'bg-success-soft text-success-soft-foreground',
  warning: 'bg-warning-soft text-warning-soft-foreground',
  danger: 'bg-danger-soft text-danger-soft-foreground',
  info: 'bg-info-soft text-info-soft-foreground',
};

export default function Badge({ variant = 'neutral', className = '', children }) {
  return (
    <ShadBadge variant="secondary" className={cn('h-auto py-0.5', VARIANTS[variant], className)}>
      {children}
    </ShadBadge>
  );
}
