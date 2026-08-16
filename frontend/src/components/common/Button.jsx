import { Button as ShadButton } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Spinner from './Spinner';

const VARIANT_MAP = {
  primary: 'default',
  secondary: 'secondary',
  danger: 'destructive',
  ghost: 'ghost',
};

export default function Button({ variant = 'primary', loading = false, className = '', children, disabled, ...props }) {
  return (
    <ShadButton
      variant={VARIANT_MAP[variant] || 'default'}
      disabled={disabled || loading}
      className={cn('min-h-[44px] gap-2 rounded-lg px-4 text-sm active:translate-y-0 active:scale-[0.97]', className)}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </ShadButton>
  );
}
