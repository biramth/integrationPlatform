import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function AllergyPrevalenceChart({ rows }) {
  const data = rows.filter((r) => r.count > 0).map((r) => ({ label: r.label, count: r.count }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-slate-900">Prévalence des allergies</p>
      {data.length === 0 ? (
        <p className="flex h-[260px] items-center justify-center text-sm text-slate-400">Aucune allergie déclarée pour le moment.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(260, data.length * 32)}>
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#898781' }} allowDecimals={false} />
            <YAxis dataKey="label" type="category" tick={{ fontSize: 11, fill: '#898781' }} width={140} />
            <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#e1e0d9', fontSize: 13 }} cursor={{ fill: 'rgba(42,120,214,0.08)' }} />
            <Bar dataKey="count" name="DUT1 concernés" fill="#d97706" radius={[0, 4, 4, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
