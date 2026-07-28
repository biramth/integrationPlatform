export default function StatCard({ label, value, sublabel }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {sublabel && <p className="mt-1 text-xs text-slate-400">{sublabel}</p>}
    </div>
  );
}
