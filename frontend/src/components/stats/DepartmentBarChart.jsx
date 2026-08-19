import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DEPARTMENT_LABELS } from '../../utils/departments';
import { CHART_COLORS } from '../../lib/chartTheme';
import ChartCard from './ChartCard';

export default function DepartmentBarChart({ rows }) {
  const data = rows.map((r) => ({ department: DEPARTMENT_LABELS[r.department] || r.department, count: r.count }));

  return (
    <ChartCard title="Répartition par département" empty={data.length === 0 ? 'Aucun dossier enregistré.' : null}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="department"
            tick={{ fontSize: 11, fill: CHART_COLORS.tick }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={50}
          />
          <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.tick }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              borderColor: CHART_COLORS.tooltipBorder,
              backgroundColor: CHART_COLORS.tooltipBg,
              fontSize: 13,
            }}
            cursor={{ fill: 'rgba(42,120,214,0.08)' }}
          />
          <Bar dataKey="count" name="DUT1" fill={CHART_COLORS.series[0]} radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
