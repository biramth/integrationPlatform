import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export default function IllnessTrendChart({ rows }) {
  const data = rows.map((r) => ({ date: formatDate(r.date), count: r.count }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-slate-900">Tendance des maladies (14 derniers jours)</p>
      {data.length === 0 ? (
        <p className="flex h-[260px] items-center justify-center text-sm text-slate-400">Aucune maladie déclarée récemment.</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#898781' }} />
            <YAxis tick={{ fontSize: 11, fill: '#898781' }} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#e1e0d9', fontSize: 13 }} />
            <Line type="monotone" dataKey="count" name="Malades" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
