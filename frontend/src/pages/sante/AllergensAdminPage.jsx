import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import * as allergenApi from '../../api/allergenApi';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState, EmptyState } from '../../components/common/StateViews';
import Skeleton from '../../components/common/Skeleton';
import { useToast } from '../../hooks/useToast';
import { staggerStyle } from '../../utils/stagger';

export default function AllergensAdminPage() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useFetch(allergenApi.listAllergens, []);
  const [label, setLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    if (!label.trim()) return;
    setSubmitting(true);
    try {
      await allergenApi.createAllergen(label.trim());
      setLabel('');
      showToast('Allergène ajouté.', 'success');
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur lors de la création.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(allergen) {
    if (!window.confirm(`Supprimer l'allergène "${allergen.label}" ?`)) return;
    try {
      await allergenApi.deleteAllergen(allergen.id);
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Suppression impossible (allergène utilisé).', 'error');
    }
  }

  return (
    <div>
      <PageHeader
        title="Liste des allergènes"
        description="Utilisée pour les allergies des DUT1 et les allergènes des plats. Gérée par la commission Santé."
      />

      <form onSubmit={handleCreate} className="mb-6 flex gap-2">
        <Input placeholder="Nouvel allergène…" value={label} onChange={(e) => setLabel(e.target.value)} className="flex-1" />
        <Button type="submit" loading={submitting}>
          Ajouter
        </Button>
      </form>

      {loading && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      )}
      {error && <ErrorState label={error} onRetry={reload} />}
      {!loading && !error && data.allergens.length === 0 && <EmptyState label="Aucun allergène configuré." />}

      {!loading && !error && data.allergens.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.allergens.map((a, i) => (
            <div
              key={a.id}
              className="animate-fade-in-up flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
              style={staggerStyle(i, 20, 200)}
            >
              <span className="text-sm text-slate-900">{a.label}</span>
              <button onClick={() => handleDelete(a)} className="text-xs text-red-600 hover:underline">
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
