function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export default function Avatar({ name, size = 36 }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-blue-800 font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {getInitials(name)}
    </span>
  );
}
