import { useFetch } from '../../hooks/useFetch';
import { listAllergens } from '../../api/allergenApi';
import AllergenCheckboxes from '../common/AllergenCheckboxes';
import { LoadingState, ErrorState } from '../common/StateViews';

export default function AllergySelect({ selectedIds, onChange, severities, onSeverityChange }) {
  const { data, loading, error, reload } = useFetch(listAllergens, []);

  if (loading) return <LoadingState label="Chargement des allergènes…" />;
  if (error) return <ErrorState label={error} onRetry={reload} />;

  return (
    <AllergenCheckboxes
      allergens={data.allergens}
      selectedIds={selectedIds}
      onChange={onChange}
      severities={severities}
      onSeverityChange={onSeverityChange}
    />
  );
}
