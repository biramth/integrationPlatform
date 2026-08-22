import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useChartColors } from '../../lib/chartTheme';
import ChartCard from './ChartCard';

export default function AllergyPrevalenceChart({ rows }) {
  const CHART_COLORS = useChartColors();
  const data = rows.filter((r) => r.count > 0).map((r) => ({ label: r.label, count: r.count }));

  return (
    <ChartCard title="Prévalence des allergies" empty={data.length === 0 ? 'Aucune allergie déclarée pour le moment.' : null}>
      <ResponsiveContainer width="100%" height={Math.max(260, data.length * 32)}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: CHART_COLORS.tick }} allowDecimals={false} />
          <YAxis dataKey="label" type="category" tick={{ fontSize: 11, fill: CHART_COLORS.tick }} width={140} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              borderColor: CHART_COLORS.tooltipBorder,
              backgroundColor: CHART_COLORS.tooltipBg,
              fontSize: 13,
            }}
            cursor={{ fill: CHART_COLORS.hoverCursor }}
          />
          <Bar dataKey="count" name="DUT1 concernés" fill={CHART_COLORS.series[3]} radius={[0, 4, 4, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
