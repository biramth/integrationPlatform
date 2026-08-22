import { useState } from 'react';
import { Trash2, Plus, Leaf, Pencil, Check, X } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import * as allergenApi from '../../api/allergenApi';
import Input from '../common/Input';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { ErrorState, EmptyState } from '../common/StateViews';
import Skeleton from '../common/Skeleton';
import { useToast } from '../../hooks/useToast';
import { staggerStyle } from '../../utils/stagger';

// Référentiel des allergènes, géré directement depuis la question "Allergies"
// du questionnaire phase 2 (plutôt qu'une page à part) : c'est là que le chef
// Santé configure déjà cette question, et ce référentiel n'a pas d'autre
// utilité (croisement menu/allergènes côté Cuisine mis à part).
export default function AllergensManager() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useFetch(allergenApi.listAllergens, []);
  const [label, setLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [renaming, setRenaming] = useState(false);

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

  function startEdit(allergen) {
    setEditingId(allergen.id);
    setEditLabel(allergen.label);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditLabel('');
  }

  async function handleRename(allergen) {
    if (!editLabel.trim() || editLabel.trim() === allergen.label) {
      cancelEdit();
      return;
    }
    setRenaming(true);
    try {
      await allergenApi.updateAllergen(allergen.id, editLabel.trim());
      showToast('Allergène renommé.', 'success');
      cancelEdit();
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Renommage impossible.', 'error');
    } finally {
      setRenaming(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="mb-4 flex gap-2">
        <Input placeholder="Nouvel allergène…" value={label} onChange={(e) => setLabel(e.target.value)} className="flex-1" />
        <Button type="submit" loading={submitting}>
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </form>

      {loading && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      )}
      {error && <ErrorState label={error} onRetry={reload} />}
      {!loading && !error && data.allergens.length === 0 && <EmptyState label="Aucun allergène configuré." />}

      {!loading && !error && data.allergens.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {data.allergens.map((a, i) => {
            const editing = editingId === a.id;
            return (
              <div
                key={a.id}
                className="animate-fade-in-up flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-soft transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lifted"
                style={staggerStyle(i, 20, 200)}
              >
                {editing ? (
                  <>
                    <input
                      autoFocus
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(a);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      className="min-w-0 flex-1 rounded-md border border-border px-2 py-1 text-sm outline-none focus:border-role-accent focus:ring-1 focus:ring-role-accent"
                    />
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => handleRename(a)}
                        disabled={renaming}
                        className="flex items-center text-success transition-colors hover:opacity-80"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={cancelEdit} className="flex items-center text-muted-foreground transition-colors hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex min-w-0 items-center gap-2">
                      <Leaf className="h-3.5 w-3.5 shrink-0 text-success" />
                      <span className="truncate text-sm text-foreground">{a.label}</span>
                      {(a.dut1_count > 0 || a.dish_count > 0) && (
                        <Badge variant="neutral" className="shrink-0">
                          {a.dut1_count} DUT1 · {a.dish_count} plats
                        </Badge>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button onClick={() => startEdit(a)} className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline">
                        <Pencil className="h-3.5 w-3.5" /> Renommer
                      </button>
                      <button onClick={() => handleDelete(a)} className="flex items-center gap-1 text-xs text-danger transition-colors hover:opacity-80 hover:underline">
                        <Trash2 className="h-3.5 w-3.5" /> Supprimer
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
