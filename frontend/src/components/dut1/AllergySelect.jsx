import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { listAllergens, createAllergen } from '../../api/allergenApi';
import AllergenCheckboxes from '../common/AllergenCheckboxes';
import Input from '../common/Input';
import Button from '../common/Button';
import { LoadingState, ErrorState } from '../common/StateViews';
import { useToast } from '../../hooks/useToast';

export default function AllergySelect({ selectedIds, onChange, severities, onSeverityChange, disabled = false }) {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useFetch(listAllergens, []);
  // Référentiel non figé : l'agent qui interroge le DUT1 peut ajouter ici
  // l'allergène qu'il vient de citer, sans quitter la complétion du dossier.
  // L'allergène ajouté est coché immédiatement (sévérité par défaut, modérée).
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const result = await createAllergen(trimmed);
      const newId = result.allergen.id;
      setLabel('');
      setAdding(false);
      reload();
      if (!selectedIds.includes(newId)) onChange([...selectedIds, newId]);
      showToast('Allergène ajouté et sélectionné.', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || "Erreur lors de l'ajout.", 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function cancelAdd() {
    setAdding(false);
    setLabel('');
  }

  if (loading) return <LoadingState label="Chargement des allergènes…" />;
  if (error) return <ErrorState label={error} onRetry={reload} />;

  return (
    <div className="flex flex-col gap-3">
      <AllergenCheckboxes
        allergens={data.allergens}
        selectedIds={selectedIds}
        onChange={onChange}
        severities={severities}
        onSeverityChange={onSeverityChange}
        disabled={disabled}
      />

      {!disabled &&
        (adding ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                autoFocus
                label="Nouvel allergène"
                placeholder="Ex : Kiwi"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') cancelAdd();
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" loading={submitting} className="px-3 py-1.5 text-xs">
                Ajouter
              </Button>
              <Button type="button" variant="secondary" onClick={cancelAdd} className="px-3 py-1.5 text-xs">
                Annuler
              </Button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-fit items-center gap-1 text-xs text-role-accent transition-opacity hover:opacity-80"
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter un allergène
          </button>
        ))}
    </div>
  );
}
