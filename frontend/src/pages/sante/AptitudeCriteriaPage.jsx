import { useState } from 'react';
import { Trash2, Plus, Pencil, Check, X, HeartPulse, CalendarDays } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import * as criteriaApi from '../../api/aptitudeCriteriaApi';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState, EmptyState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { confirm } from '../../components/common/confirmService';
import { useToast } from '../../hooks/useToast';
import { staggerStyle } from '../../utils/stagger';

function formatActivityDate(activity) {
  if (activity.end_date && activity.end_date !== activity.activity_date) {
    return `${activity.activity_date} → ${activity.end_date}`;
  }
  return activity.activity_date;
}

export default function AptitudeCriteriaPage() {
  const { showToast } = useToast();
  const criteriaFetch = useFetch(criteriaApi.listCriteria, []);
  const activitiesFetch = useFetch(criteriaApi.listActivitiesWithCriteria, []);

  const [label, setLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [togglingKey, setTogglingKey] = useState(null);

  const criteria = criteriaFetch.data?.criteria || [];
  const activities = activitiesFetch.data?.activities || [];

  async function handleCreate(e) {
    e.preventDefault();
    if (!label.trim()) return;
    setSubmitting(true);
    try {
      await criteriaApi.createCriterion(label.trim());
      setLabel('');
      showToast('Critère ajouté.', 'success');
      criteriaFetch.reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur lors de la création.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(criterion) {
    setEditingId(criterion.id);
    setEditLabel(criterion.label);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditLabel('');
  }

  async function handleRename(criterion) {
    if (!editLabel.trim() || editLabel.trim() === criterion.label) {
      cancelEdit();
      return;
    }
    setRenaming(true);
    try {
      await criteriaApi.updateCriterion(criterion.id, editLabel.trim());
      showToast('Critère renommé.', 'success');
      cancelEdit();
      criteriaFetch.reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Renommage impossible.', 'error');
    } finally {
      setRenaming(false);
    }
  }

  async function handleDelete(criterion) {
    if (!(await confirm({ message: `Supprimer le critère "${criterion.label}" ?`, danger: true }))) return;
    try {
      await criteriaApi.deleteCriterion(criterion.id);
      showToast('Critère supprimé.', 'success');
      criteriaFetch.reload();
      activitiesFetch.reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Suppression impossible (critère utilisé).', 'error');
    }
  }

  async function toggleActivityCriterion(activity, criterionId) {
    const current = activity.criterion_ids || [];
    const next = current.includes(criterionId) ? current.filter((id) => id !== criterionId) : [...current, criterionId];
    const key = `${activity.id}`;
    setTogglingKey(key);
    try {
      await criteriaApi.setActivityCriteria(activity.id, next);
      activitiesFetch.reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Mise à jour impossible.', 'error');
    } finally {
      setTogglingKey(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Critères d'aptitude"
        description="Le référentiel des critères physiques ci-dessous, et pour chaque activité (créée par la commission Présidentielle) ceux qui sont exigés pour y participer — Risques du jour croise ensuite automatiquement les restrictions déclarées avec les activités du jour qui les exigent."
      />

      <Card className="mb-6">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <HeartPulse className="h-4 w-4 text-muted-foreground" /> Critères d'aptitude
        </p>
        <form onSubmit={handleCreate} className="mb-4 flex gap-2">
          <Input placeholder="Nouveau critère…" value={label} onChange={(e) => setLabel(e.target.value)} className="flex-1" />
          <Button type="submit" loading={submitting}>
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </form>

        {criteriaFetch.loading && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        )}
        {criteriaFetch.error && <ErrorState label={criteriaFetch.error} onRetry={criteriaFetch.reload} />}
        {!criteriaFetch.loading && !criteriaFetch.error && criteria.length === 0 && (
          <EmptyState label="Aucun critère configuré." />
        )}

        {!criteriaFetch.loading && !criteriaFetch.error && criteria.length > 0 && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {criteria.map((c, i) => {
              const editing = editingId === c.id;
              return (
                <div
                  key={c.id}
                  className="animate-fade-in-up flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-soft"
                  style={staggerStyle(i, 20, 200)}
                >
                  {editing ? (
                    <>
                      <input
                        autoFocus
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(c);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        className="min-w-0 flex-1 rounded-md border border-border px-2 py-1 text-sm outline-none focus:border-role-accent focus:ring-1 focus:ring-role-accent"
                      />
                      <div className="flex shrink-0 items-center gap-1">
                        <button onClick={() => handleRename(c)} disabled={renaming} className="flex items-center text-success transition-colors hover:opacity-80">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={cancelEdit} className="flex items-center text-muted-foreground transition-colors hover:text-foreground">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="truncate text-sm text-foreground">{c.label}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        <button onClick={() => startEdit(c)} className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline">
                          <Pencil className="h-3.5 w-3.5" /> Renommer
                        </button>
                        <button onClick={() => handleDelete(c)} className="flex items-center gap-1 text-xs text-danger transition-colors hover:opacity-80 hover:underline">
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
      </Card>

      <Card>
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarDays className="h-4 w-4 text-muted-foreground" /> Critères exigés par activité
        </p>

        {activitiesFetch.loading && <CardListSkeleton />}
        {activitiesFetch.error && <ErrorState label={activitiesFetch.error} onRetry={activitiesFetch.reload} />}
        {!activitiesFetch.loading && !activitiesFetch.error && activities.length === 0 && (
          <EmptyState label="Aucune activité programmée." />
        )}
        {!activitiesFetch.loading && !activitiesFetch.error && criteria.length === 0 && activities.length > 0 && (
          <p className="text-sm text-muted-foreground">Ajoutez au moins un critère ci-dessus pour pouvoir l'exiger sur une activité.</p>
        )}

        {!activitiesFetch.loading && !activitiesFetch.error && activities.length > 0 && criteria.length > 0 && (
          <div className="flex flex-col gap-4">
            {activities.map((activity, i) => (
              <div key={activity.id} className="animate-fade-in-up border-b border-border pb-4 last:border-0 last:pb-0" style={staggerStyle(i)}>
                <p className="mb-2 text-sm font-medium text-foreground">
                  {activity.name} <span className="font-normal text-muted-foreground">— {formatActivityDate(activity)}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {criteria.map((c) => {
                    const active = (activity.criterion_ids || []).includes(c.id);
                    const busy = togglingKey === `${activity.id}`;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        disabled={busy}
                        onClick={() => toggleActivityCriterion(activity, c.id)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                          active
                            ? 'border-role-accent bg-role-accent-soft text-role-accent'
                            : 'border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
