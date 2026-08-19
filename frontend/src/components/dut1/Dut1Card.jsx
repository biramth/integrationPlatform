import Badge from '../common/Badge';
import Card from '../common/Card';
import Avatar from '../common/Avatar';
import { DEPARTMENT_LABELS } from '../../utils/departments';

function formatBirthDate(birthDate) {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return birthDate;
  return d.toLocaleDateString('fr-FR');
}

export default function Dut1Card({ record, onClick, actions }) {
  const birthDate = formatBirthDate(record.birth_date);

  return (
    <Card interactive={!!onClick} onClick={onClick} role={onClick ? 'button' : undefined}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar name={`${record.first_name} ${record.last_name}`} size={36} />
          <div>
            <p className="font-medium text-slate-900">
              {record.first_name} {record.last_name}
            </p>
            <p className="text-sm text-slate-500">{DEPARTMENT_LABELS[record.department] || record.department}</p>
            {(birthDate || record.student_number) && (
              <p className="text-xs text-slate-400">
                {birthDate && <>Né(e) le {birthDate}</>}
                {birthDate && record.student_number && ' · '}
                {record.student_number && <>Matricule {record.student_number}</>}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {record.room_label ? (
            <Badge variant="success">Chambre {record.room_label}</Badge>
          ) : (
            <Badge variant="warning">Sans chambre</Badge>
          )}
          {record.admission_list_type && (
            <Badge variant={record.admission_list_type === 'principale' ? 'success' : 'warning'}>
              {record.admission_list_type === 'principale' ? 'Liste principale' : "Liste d'attente"}
            </Badge>
          )}
        </div>
      </div>
      {actions && <div className="mt-3">{actions}</div>}
    </Card>
  );
}
