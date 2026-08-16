import Badge from '../common/Badge';
import Dut1Card from '../dut1/Dut1Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { DEPARTMENT_LABELS } from '../../utils/departments';
import { staggerStyle } from '../../utils/stagger';
import { getLuggageStatus } from '../../utils/luggageStatus';

export default function RecordsTable({ records, onSelect }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 text-xs uppercase text-muted-foreground hover:bg-muted/50">
              <TableHead className="py-3 pl-4">Nom</TableHead>
              <TableHead>Département</TableHead>
              <TableHead>Genre</TableHead>
              <TableHead>Chambre</TableHead>
              <TableHead>Bagages</TableHead>
              <TableHead>Phase 2</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record, i) => {
              const luggage = getLuggageStatus(record);
              return (
                <TableRow
                  key={record.id}
                  onClick={() => onSelect(record)}
                  className="animate-fade-in cursor-pointer"
                  style={staggerStyle(i, 25, 300)}
                >
                  <TableCell className="whitespace-normal py-3 pl-4 font-medium text-foreground">
                    {record.first_name} {record.last_name}
                  </TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">
                    {DEPARTMENT_LABELS[record.department] || record.department}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{record.gender}</TableCell>
                  <TableCell>
                    {record.room_label ? <Badge variant="success">{record.room_label}</Badge> : <Badge variant="warning">Aucune</Badge>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={luggage.variant}>{luggage.label}</Badge>
                  </TableCell>
                  <TableCell>
                    {record.complementary_completed_at ? (
                      <Badge variant="success">Complété</Badge>
                    ) : (
                      <Badge variant="neutral">En attente</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
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
