export default function Input({ label, error, icon: Icon, className = '', ...props }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && (
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {label}
          {props.required && <span className="text-red-500"> *</span>}
        </span>
      )}
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
        <input
          className={`min-h-[44px] w-full rounded-lg border px-3 py-2 text-base outline-none transition-colors focus:border-blue-600 focus:ring-1 focus:ring-blue-600 ${
            Icon ? 'pl-9' : ''
          } ${error ? 'border-red-500' : 'border-slate-300'} ${className}`}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}
