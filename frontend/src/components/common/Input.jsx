export default function Input({ label, error, className = '', ...props }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && (
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {label}
          {props.required && <span className="text-red-500"> *</span>}
        </span>
      )}
      <input
        className={`min-h-[44px] rounded-lg border px-3 py-2 text-base outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 ${
          error ? 'border-red-500' : 'border-slate-300'
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}
