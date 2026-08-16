import { Avatar as ShadAvatar, AvatarFallback } from '@/components/ui/avatar';

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export default function Avatar({ name, size = 36 }) {
  return (
    <ShadAvatar style={{ width: size, height: size }} className="size-auto shrink-0">
      <AvatarFallback
        className="bg-blue-800 font-semibold text-white"
        style={{ fontSize: size * 0.4 }}
      >
        {getInitials(name)}
      </AvatarFallback>
    </ShadAvatar>
  );
}
