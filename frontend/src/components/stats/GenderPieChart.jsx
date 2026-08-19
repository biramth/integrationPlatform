import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CHART_COLORS } from '../../lib/chartTheme';
import ChartCard from './ChartCard';

const COLORS = { M: CHART_COLORS.series[0], F: CHART_COLORS.series[1] };
const LABELS = { M: 'Masculin', F: 'Féminin' };

export default function GenderPieChart({ rows }) {
  const data = rows.map((r) => ({ key: r.gender, name: LABELS[r.gender] || r.gender, value: r.count }));
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <ChartCard title="Répartition par genre" empty={total === 0 ? 'Aucun dossier enregistré.' : null}>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
            {data.map((entry) => (
              <Cell key={entry.key} fill={COLORS[entry.key] || CHART_COLORS.tick} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              borderColor: CHART_COLORS.tooltipBorder,
              backgroundColor: CHART_COLORS.tooltipBg,
              fontSize: 13,
            }}
          />
          <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
