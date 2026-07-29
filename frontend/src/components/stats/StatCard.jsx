import Card from '../common/Card';

const TONES = {
  blue: { accent: 'bg-blue-800', iconBg: 'bg-blue-50', iconText: 'text-blue-800' },
  emerald: { accent: 'bg-emerald-600', iconBg: 'bg-emerald-50', iconText: 'text-emerald-600' },
  amber: { accent: 'bg-amber-500', iconBg: 'bg-amber-50', iconText: 'text-amber-600' },
  violet: { accent: 'bg-violet-600', iconBg: 'bg-violet-50', iconText: 'text-violet-600' },
};

export default function StatCard({ label, value, sublabel, icon: Icon, tone = 'blue' }) {
  const t = TONES[tone] || TONES.blue;

  return (
    <Card interactive accent={t.accent} className="pl-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
          {sublabel && <p className="mt-1 text-xs text-slate-400">{sublabel}</p>}
        </div>
        {Icon && (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-150 group-hover:scale-110 ${t.iconBg} ${t.iconText}`}>
            <Icon className="h-4.5 w-4.5" size={18} strokeWidth={2} />
          </span>
        )}
      </div>
    </Card>
  );
}
