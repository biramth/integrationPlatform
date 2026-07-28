export default function Card({ interactive = false, accent, className = '', children, ...props }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-150 ${
        interactive ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : ''
      } ${className}`}
      {...props}
    >
      {accent && <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />}
      {children}
    </div>
  );
}
