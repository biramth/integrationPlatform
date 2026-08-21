import { Search } from 'lucide-react';
import Card from '../common/Card';
import Input from '../common/Input';
import Select from '../common/Select';
import { ACTION_LABELS, RESOURCE_TYPE_LABELS, COMMISSION_LABELS } from '../../utils/audit';

const ACTION_OPTIONS = Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label }));
const RESOURCE_TYPE_OPTIONS = Object.entries(RESOURCE_TYPE_LABELS).map(([value, label]) => ({ value, label }));
const COMMISSION_OPTIONS = Object.entries(COMMISSION_LABELS).map(([value, label]) => ({ value, label }));
const SUCCESS_OPTIONS = [
  { value: 'true', label: 'Réussies' },
  { value: 'false', label: 'Échouées' },
];

export default function AuditFilters({ filters, onChange, showCommission = false }) {
  function set(key, value) {
    onChange({ ...filters, [key]: value, page: 1 });
  }

  return (
    <Card className="mb-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="Recherche"
          icon={Search}
          placeholder="Nom, dossier…"
          value={filters.search || ''}
          onChange={(e) => set('search', e.target.value)}
        />
        <Select
          label="Action"
          placeholder="Toutes"
          value={filters.action || ''}
          onChange={(e) => set('action', e.target.value)}
          options={ACTION_OPTIONS}
        />
        <Select
          label="Ressource"
          placeholder="Toutes"
          value={filters.resourceType || ''}
          onChange={(e) => set('resourceType', e.target.value)}
          options={RESOURCE_TYPE_OPTIONS}
        />
        {showCommission && (
          <Select
            label="Commission"
            placeholder="Toutes"
            value={filters.commission || ''}
            onChange={(e) => set('commission', e.target.value)}
            options={COMMISSION_OPTIONS}
          />
        )}
        <Select
          label="Résultat"
          placeholder="Tous"
          value={filters.success || ''}
          onChange={(e) => set('success', e.target.value)}
          options={SUCCESS_OPTIONS}
        />
        <Input
          label="Depuis le"
          type="date"
          value={filters.from ? filters.from.slice(0, 10) : ''}
          onChange={(e) => set('from', e.target.value ? `${e.target.value}T00:00:00` : '')}
        />
        <Input
          label="Jusqu'au"
          type="date"
          value={filters.to ? filters.to.slice(0, 10) : ''}
          onChange={(e) => set('to', e.target.value ? `${e.target.value}T23:59:59` : '')}
        />
      </div>
    </Card>
  );
}
