import Badge from '../common/Badge';
import { DEPARTMENT_LABELS } from '../../utils/departments';

export default function Dut1Card({ record, onClick, actions }) {
  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-slate-900">
            {record.first_name} {record.last_name}
          </p>
          <p className="text-sm text-slate-500">{DEPARTMENT_LABELS[record.department] || record.department}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {record.room_label ? (
            <Badge variant="success">Chambre {record.room_label}</Badge>
          ) : (
            <Badge variant="warning">Sans chambre</Badge>
          )}
        </div>
      </div>
      {actions && <div className="mt-3">{actions}</div>}
    </div>
  );
}
