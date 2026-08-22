import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartColors } from '../../lib/chartTheme';
import ChartCard from './ChartCard';

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export default function IllnessTrendChart({ rows }) {
  const CHART_COLORS = useChartColors();
  const data = rows.map((r) => ({ date: formatDate(r.date), count: r.count }));

  return (
    <ChartCard
      title="Tendance des maladies (14 derniers jours)"
      empty={data.length === 0 ? 'Aucune maladie déclarée récemment.' : null}
    >
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: CHART_COLORS.tick }} />
          <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.tick }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              borderColor: CHART_COLORS.tooltipBorder,
              backgroundColor: CHART_COLORS.tooltipBg,
              fontSize: 13,
            }}
          />
          <Line type="monotone" dataKey="count" name="Malades" stroke={CHART_COLORS.series[4]} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
