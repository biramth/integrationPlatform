import { Avatar as ShadAvatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export default function Avatar({ name, size = 36, ring = false }) {
  return (
    <ShadAvatar
      style={{ width: size, height: size }}
      className={cn('size-auto shrink-0', ring && 'ring-2 ring-role-accent ring-offset-2 ring-offset-background')}
    >
      <AvatarFallback
        className="bg-role-accent font-semibold text-white"
        style={{ fontSize: size * 0.4 }}
      >
        {getInitials(name)}
      </AvatarFallback>
    </ShadAvatar>
  );
}
