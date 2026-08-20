import { useState } from 'react';
import { Trash2, Plus, Pencil, CalendarDays } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import * as activityApi from '../../api/activityApi';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState, EmptyState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { useToast } from '../../hooks/useToast';
import { staggerStyle } from '../../utils/stagger';
import { formatDateLong, formatDateShort, isToday, groupActivitiesByDate } from '../../utils/activityDates';

const EMPTY_FORM = { name: '', activityDate: '', endDate: '', description: '' };

export default function ActivitiesPage() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useFetch(activityApi.listActivities, []);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [editingActivity, setEditingActivity] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await activityApi.createActivity(form);
      setForm(EMPTY_FORM);
      showToast('Activité ajoutée.', 'success');
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur lors de la création.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(activity) {
    if (!window.confirm(`Supprimer l'activité "${activity.name}" ?`)) return;
    try {
      await activityApi.deleteActivity(activity.id);
      showToast('Activité supprimée.', 'success');
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Suppression impossible.', 'error');
    }
  }

  function openEdit(activity) {
    setEditingActivity(activity);
    setEditForm({
      name: activity.name,
      activityDate: activity.activity_date,
      endDate: activity.end_date || '',
      description: activity.description || '',
    });
  }

  function closeEdit() {
    setEditingActivity(null);
  }

  async function handleSaveEdit() {
    setSaving(true);
    try {
      await activityApi.updateActivity(editingActivity.id, editForm);
      showToast('Activité mise à jour.', 'success');
      closeEdit();
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur lors de la mise à jour.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Activités"
        description="Programme de la semaine d'intégration — sert de référence à la commission Santé pour cibler les restrictions d'aptitude."
      />

      <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-border bg-card p-4 shadow-soft">
        <p className="mb-3 text-sm font-semibold text-foreground">Ajouter une activité</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Input
            label="Nom"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Date"
            type="date"
            required
            value={form.activityDate}
            onChange={(e) => setForm((f) => ({ ...f, activityDate: e.target.value }))}
          />
          <Input
            label="Date de fin (optionnel)"
            type="date"
            value={form.endDate}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
          />
          <Input
            label="Description (optionnel)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <Button type="submit" loading={submitting}>
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </div>
      </form>

      {loading && <CardListSkeleton />}
      {error && <ErrorState label={error} onRetry={reload} />}
      {!loading && !error && data.activities.length === 0 && (
        <EmptyState label="Aucune activité configurée." icon={CalendarDays} />
      )}

      {!loading && !error && data.activities.length > 0 && (
        <div className="flex flex-col">
          {groupActivitiesByDate(data.activities).map((group, groupIndex) => (
            <div key={group.date} className="animate-fade-in-up" style={staggerStyle(groupIndex, 60)}>
              <div className="sticky top-0 z-10 -mx-1 flex items-center gap-2 bg-background/95 px-1 py-2 backdrop-blur-sm">
                <h2 className="text-sm font-semibold capitalize text-foreground">{formatDateLong(group.date)}</h2>
                {isToday(group.date) && <Badge variant="info">Aujourd'hui</Badge>}
              </div>

              <ul className="relative ml-2.5 flex flex-col gap-3 border-l-2 border-border pb-2 pl-6">
                {group.items.map((activity) => (
                  <li key={activity.id} className="relative">
                    <span className="absolute -left-[1.85rem] top-1.5 h-3 w-3 rounded-full border-2 border-card bg-role-accent" />
                    <div className="rounded-xl border border-border bg-card p-3.5 shadow-soft">
                      <p className="font-medium text-foreground">{activity.name}</p>
                      {activity.end_date && activity.end_date !== activity.activity_date && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Jusqu'au {formatDateShort(activity.end_date)}
                        </p>
                      )}
                      {activity.description && (
                        <p className="mt-1.5 text-sm text-muted-foreground">{activity.description}</p>
                      )}

                      <div className="mt-3 flex items-center gap-3">
                        <button
                          onClick={() => openEdit(activity)}
                          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(activity)}
                          className="flex items-center gap-1 text-xs text-danger transition-colors hover:opacity-80 hover:underline"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Supprimer
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!editingActivity} onClose={closeEdit} title={editingActivity ? `Modifier ${editingActivity.name}` : ''}>
        {editingActivity && (
          <div className="flex flex-col gap-3">
            <Input
              label="Nom"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="Date"
              type="date"
              value={editForm.activityDate}
              onChange={(e) => setEditForm((f) => ({ ...f, activityDate: e.target.value }))}
            />
            <Input
              label="Date de fin (optionnel)"
              type="date"
              value={editForm.endDate}
              onChange={(e) => setEditForm((f) => ({ ...f, endDate: e.target.value }))}
            />
            <Input
              label="Description (optionnel)"
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
            />

            <div className="mt-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={closeEdit}>
                Annuler
              </Button>
              <Button onClick={handleSaveEdit} loading={saving}>
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
