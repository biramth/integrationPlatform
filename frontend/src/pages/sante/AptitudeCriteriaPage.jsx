import { useState } from 'react';
import { Trash2, Plus, Pencil, Check, X, HeartPulse, CalendarDays, ChevronUp, ChevronDown } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import * as criteriaApi from '../../api/aptitudeCriteriaApi';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
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
  const [newLevelLabel, setNewLevelLabel] = useState({});
  const [addingLevelFor, setAddingLevelFor] = useState(null);
  const [editingLevel, setEditingLevel] = useState(null); // { criterionId, levelId }
  const [editingLevelLabel, setEditingLevelLabel] = useState('');
  const [busyLevelId, setBusyLevelId] = useState(null);
  const [savingRequirement, setSavingRequirement] = useState(null); // `${activityId}-${criterionId}`

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

  async function handleAddLevel(criterion, e) {
    e.preventDefault();
    const value = (newLevelLabel[criterion.id] || '').trim();
    if (!value) return;
    setAddingLevelFor(criterion.id);
    try {
      await criteriaApi.createLevel(criterion.id, value);
      setNewLevelLabel((m) => ({ ...m, [criterion.id]: '' }));
      showToast('Niveau ajouté.', 'success');
      criteriaFetch.reload();
    } catch (err) {
      showToast(err.response?.data?.error || "Erreur lors de l'ajout du niveau.", 'error');
    } finally {
      setAddingLevelFor(null);
    }
  }

  function startEditLevel(criterionId, level) {
    setEditingLevel({ criterionId, levelId: level.id });
    setEditingLevelLabel(level.label);
  }

  function cancelEditLevel() {
    setEditingLevel(null);
    setEditingLevelLabel('');
  }

  async function handleRenameLevel(level) {
    if (!editingLevelLabel.trim() || editingLevelLabel.trim() === level.label) {
      cancelEditLevel();
      return;
    }
    setBusyLevelId(level.id);
    try {
      await criteriaApi.updateLevel(editingLevel.criterionId, level.id, editingLevelLabel.trim());
      showToast('Niveau renommé.', 'success');
      cancelEditLevel();
      criteriaFetch.reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Renommage impossible.', 'error');
    } finally {
      setBusyLevelId(null);
    }
  }

  async function handleDeleteLevel(criterionId, level) {
    if (!(await confirm({ message: `Supprimer le niveau "${level.label}" ?`, danger: true }))) return;
    setBusyLevelId(level.id);
    try {
      await criteriaApi.deleteLevel(criterionId, level.id);
      showToast('Niveau supprimé.', 'success');
      criteriaFetch.reload();
      activitiesFetch.reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Suppression impossible (niveau utilisé).', 'error');
    } finally {
      setBusyLevelId(null);
    }
  }

  async function moveLevel(criterion, index, direction) {
    const levels = criterion.levels || [];
    const target = index + direction;
    if (target < 0 || target >= levels.length) return;
    const reordered = [...levels];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setBusyLevelId(levels[index].id);
    try {
      await criteriaApi.reorderLevels(criterion.id, reordered.map((l) => l.id));
      criteriaFetch.reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Réorganisation impossible.', 'error');
    } finally {
      setBusyLevelId(null);
    }
  }

  async function handleRequirementChange(activity, criterion, minLevelId) {
    const key = `${activity.id}-${criterion.id}`;
    const current = activity.requirements || [];
    const withoutThisCriterion = current.filter((r) => r.criterionId !== criterion.id);
    const next =
      minLevelId && minLevelId !== 'none'
        ? [...withoutThisCriterion, { criterionId: criterion.id, minLevelId: Number(minLevelId) }]
        : withoutThisCriterion;

    setSavingRequirement(key);
    try {
      await criteriaApi.setActivityCriteria(activity.id, next);
      activitiesFetch.reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Mise à jour impossible.', 'error');
    } finally {
      setSavingRequirement(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Critères d'aptitude"
        description="Chaque critère a son échelle de niveaux (ex: Sportif → Pas sportif / Peu sportif / Sportif / Très sportif). Pour chaque activité, choisissez le niveau minimum requis par critère — Risques du jour compare automatiquement le niveau déclaré par chaque DUT1 à l'enregistrement."
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

        {criteriaFetch.loading && <CardListSkeleton />}
        {criteriaFetch.error && <ErrorState label={criteriaFetch.error} onRetry={criteriaFetch.reload} />}
        {!criteriaFetch.loading && !criteriaFetch.error && criteria.length === 0 && (
          <EmptyState label="Aucun critère configuré." />
        )}

        {!criteriaFetch.loading && !criteriaFetch.error && criteria.length > 0 && (
          <div className="flex flex-col gap-3">
            {criteria.map((c, i) => {
              const editing = editingId === c.id;
              const levels = c.levels || [];
              return (
                <div key={c.id} className="animate-fade-in-up rounded-lg border border-border p-3" style={staggerStyle(i, 20, 200)}>
                  <div className="mb-2 flex items-center justify-between gap-2">
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
                        <span className="truncate text-sm font-medium text-foreground">{c.label}</span>
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

                  <div className="flex flex-col gap-1.5 pl-3">
                    {levels.length === 0 && (
                      <p className="text-xs text-muted-foreground">Aucun niveau — ajoutez-en au moins un ci-dessous.</p>
                    )}
                    {levels.map((level, li) => {
                      const editingThisLevel = editingLevel?.criterionId === c.id && editingLevel?.levelId === level.id;
                      const busy = busyLevelId === level.id;
                      return (
                        <div key={level.id} className="flex items-center gap-2">
                          <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{li}</span>
                          <div className="flex shrink-0 flex-col">
                            <button
                              onClick={() => moveLevel(c, li, -1)}
                              disabled={li === 0 || busy}
                              className="text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                              aria-label="Monter"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => moveLevel(c, li, 1)}
                              disabled={li === levels.length - 1 || busy}
                              className="text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                              aria-label="Descendre"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {editingThisLevel ? (
                            <>
                              <input
                                autoFocus
                                value={editingLevelLabel}
                                onChange={(e) => setEditingLevelLabel(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRenameLevel(level);
                                  if (e.key === 'Escape') cancelEditLevel();
                                }}
                                className="min-w-0 flex-1 rounded-md border border-border px-2 py-1 text-sm outline-none focus:border-role-accent focus:ring-1 focus:ring-role-accent"
                              />
                              <button onClick={() => handleRenameLevel(level)} disabled={busy} className="text-success transition-colors hover:opacity-80">
                                <Check className="h-4 w-4" />
                              </button>
                              <button onClick={cancelEditLevel} className="text-muted-foreground transition-colors hover:text-foreground">
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 truncate text-sm text-foreground">{level.label}</span>
                              <button
                                onClick={() => startEditLevel(c.id, level)}
                                className="text-muted-foreground transition-colors hover:text-foreground"
                                aria-label="Renommer ce niveau"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteLevel(c.id, level)}
                                disabled={busy}
                                className="text-danger transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Supprimer ce niveau"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}
                    <form onSubmit={(e) => handleAddLevel(c, e)} className="mt-1 flex gap-2">
                      <input
                        placeholder="Nouveau niveau… (ex: Très sportif)"
                        value={newLevelLabel[c.id] || ''}
                        onChange={(e) => setNewLevelLabel((m) => ({ ...m, [c.id]: e.target.value }))}
                        className="min-w-0 flex-1 rounded-md border border-border px-2 py-1.5 text-sm outline-none focus:border-role-accent focus:ring-1 focus:ring-role-accent"
                      />
                      <Button type="submit" variant="secondary" className="px-2.5 py-1 text-xs" loading={addingLevelFor === c.id}>
                        <Plus className="h-3.5 w-3.5" /> Niveau
                      </Button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarDays className="h-4 w-4 text-muted-foreground" /> Niveau minimum requis par activité
        </p>

        {activitiesFetch.loading && <CardListSkeleton />}
        {activitiesFetch.error && <ErrorState label={activitiesFetch.error} onRetry={activitiesFetch.reload} />}
        {!activitiesFetch.loading && !activitiesFetch.error && activities.length === 0 && (
          <EmptyState label="Aucune activité programmée." />
        )}
        {!activitiesFetch.loading && !activitiesFetch.error && criteria.length === 0 && activities.length > 0 && (
          <p className="text-sm text-muted-foreground">Ajoutez au moins un critère (avec ses niveaux) ci-dessus pour pouvoir l'exiger sur une activité.</p>
        )}

        {!activitiesFetch.loading && !activitiesFetch.error && activities.length > 0 && criteria.length > 0 && (
          <div className="flex flex-col gap-4">
            {activities.map((activity, i) => {
              const requirementByCriterion = Object.fromEntries((activity.requirements || []).map((r) => [r.criterionId, r.minLevelId]));
              return (
                <div key={activity.id} className="animate-fade-in-up border-b border-border pb-4 last:border-0 last:pb-0" style={staggerStyle(i)}>
                  <p className="mb-2 text-sm font-medium text-foreground">
                    {activity.name} <span className="font-normal text-muted-foreground">— {formatActivityDate(activity)}</span>
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {criteria
                      .filter((c) => (c.levels || []).length > 0)
                      .map((c) => (
                        <Select
                          key={c.id}
                          label={c.label}
                          placeholder="Aucune exigence"
                          value={requirementByCriterion[c.id] || 'none'}
                          onChange={(e) => handleRequirementChange(activity, c, e.target.value)}
                          disabled={savingRequirement === `${activity.id}-${c.id}`}
                          options={[
                            { value: 'none', label: 'Aucune exigence' },
                            ...(c.levels || []).map((l) => ({ value: l.id, label: l.label })),
                          ]}
                        />
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
