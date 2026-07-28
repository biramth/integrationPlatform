import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = { M: '#2a78d6', F: '#eb6834' };
const LABELS = { M: 'Masculin', F: 'Féminin' };

export default function GenderPieChart({ rows }) {
  const data = rows.map((r) => ({ key: r.gender, name: LABELS[r.gender] || r.gender, value: r.count }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-slate-900">Répartition par genre</p>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
            {data.map((entry) => (
              <Cell key={entry.key} fill={COLORS[entry.key] || '#898781'} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#e1e0d9', fontSize: 13 }} />
          <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
