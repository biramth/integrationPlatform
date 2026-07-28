import Badge from '../common/Badge';
import Dut1Card from '../dut1/Dut1Card';
import { DEPARTMENT_LABELS } from '../../utils/departments';
import { staggerStyle } from '../../utils/stagger';

export default function RecordsTable({ records, onSelect }) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Département</th>
              <th className="px-4 py-3">Genre</th>
              <th className="px-4 py-3">Chambre</th>
              <th className="px-4 py-3">Bagages</th>
              <th className="px-4 py-3">Phase 2</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, i) => (
              <tr
                key={record.id}
                onClick={() => onSelect(record)}
                className="animate-fade-in cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-blue-50/60"
                style={staggerStyle(i, 25, 300)}
              >
                <td className="px-4 py-3 font-medium text-slate-900">
                  {record.first_name} {record.last_name}
                </td>
                <td className="px-4 py-3 text-slate-600">{DEPARTMENT_LABELS[record.department] || record.department}</td>
                <td className="px-4 py-3 text-slate-600">{record.gender}</td>
                <td className="px-4 py-3">
                  {record.room_label ? <Badge variant="success">{record.room_label}</Badge> : <Badge variant="warning">Aucune</Badge>}
                </td>
                <td className="px-4 py-3">
                  {record.has_luggage_photo ? <Badge variant="success">Oui</Badge> : <Badge variant="neutral">Non</Badge>}
                </td>
                <td className="px-4 py-3">
                  {record.complementary_completed_at ? (
                    <Badge variant="success">Complété</Badge>
                  ) : (
                    <Badge variant="neutral">En attente</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {records.map((record, i) => (
          <div key={record.id} className="animate-fade-in-up" style={staggerStyle(i)}>
            <Dut1Card record={record} onClick={() => onSelect(record)} />
          </div>
        ))}
      </div>
    </>
  );
}
