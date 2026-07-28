export default function Spinner({ className = '' }) {
  return (
    <span
      className={`inline-block h-4 w-4 shrink-0 animate-spin-slow rounded-full border-2 border-current border-t-transparent align-[-2px] ${className}`}
      aria-hidden="true"
    />
  );
}
