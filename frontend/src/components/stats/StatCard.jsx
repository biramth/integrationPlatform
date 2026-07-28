import Card from '../common/Card';

export default function StatCard({ label, value, sublabel, icon, accent = 'bg-blue-800' }) {
  return (
    <Card interactive accent={accent} className="pl-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
          {sublabel && <p className="mt-1 text-xs text-slate-400">{sublabel}</p>}
        </div>
        {icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-lg">
            {icon}
          </span>
        )}
      </div>
    </Card>
  );
}
