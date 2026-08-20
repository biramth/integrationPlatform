import { TrendingDown, TrendingUp } from 'lucide-react';
import Card from '../common/Card';

const TONES = {
  blue: { accent: 'bg-info', iconBg: 'bg-gradient-to-br from-info/20 to-info/5', iconText: 'text-info' },
  emerald: { accent: 'bg-success', iconBg: 'bg-gradient-to-br from-success/20 to-success/5', iconText: 'text-success' },
  amber: { accent: 'bg-warning', iconBg: 'bg-gradient-to-br from-warning/20 to-warning/5', iconText: 'text-warning' },
  violet: { accent: 'bg-violet-600', iconBg: 'bg-gradient-to-br from-violet-500/20 to-violet-500/5', iconText: 'text-violet-600' },
  rose: { accent: 'bg-danger', iconBg: 'bg-gradient-to-br from-danger/20 to-danger/5', iconText: 'text-danger' },
};

export default function StatCard({ label, value, sublabel, icon: Icon, tone = 'blue', trend }) {
  const t = TONES[tone] || TONES.blue;

  return (
    <Card interactive accent={t.accent} className="pl-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
          <div className="mt-1 flex items-center gap-1.5">
            {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
            {trend && (
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                  trend.direction === 'up' ? 'text-success' : 'text-danger'
                }`}
              >
                {trend.direction === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trend.value}
              </span>
            )}
          </div>
        </div>
        {Icon && (
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-soft transition-transform duration-150 group-hover:scale-110 ${t.iconBg} ${t.iconText}`}
          >
            <Icon className="h-4.5 w-4.5" size={18} strokeWidth={2} />
          </span>
        )}
      </div>
    </Card>
  );
}
