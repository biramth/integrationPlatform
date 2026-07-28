import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DEPARTMENT_LABELS } from '../../utils/departments';

export default function DepartmentBarChart({ rows }) {
  const data = rows.map((r) => ({ department: DEPARTMENT_LABELS[r.department] || r.department, count: r.count }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-slate-900">Répartition par département</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
          <XAxis
            dataKey="department"
            tick={{ fontSize: 11, fill: '#898781' }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={50}
          />
          <YAxis tick={{ fontSize: 11, fill: '#898781' }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: 8, borderColor: '#e1e0d9', fontSize: 13 }}
            cursor={{ fill: 'rgba(42,120,214,0.08)' }}
          />
          <Bar dataKey="count" name="DUT1" fill="#2a78d6" radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
