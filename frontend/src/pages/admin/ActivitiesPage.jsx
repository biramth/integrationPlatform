import { useState } from 'react';
import { Trash2, Plus, CalendarDays } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import * as activityApi from '../../api/activityApi';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { confirm } from '../../components/common/confirmService';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState, EmptyState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { useToast } from '../../hooks/useToast';
import ActivityTimeline from '../../components/activities/ActivityTimeline';

const EMPTY_FORM = { name: '', activityDate: '', startTime: '', endDate: '', description: '' };

// Champs communs au formulaire d'ajout et à la fenêtre de modification.
function ActivityFields({ value, onChange, idPrefix }) {
  const set = (key) => (e) => onChange({ ...value, [key]: e.target.value });
  return (
    <>
      <Input id={`${idPrefix}-name`} label="Nom" required value={value.name} onChange={set('name')} />
      <Input id={`${idPrefix}-date`} label="Date" type="date" required value={value.activityDate} onChange={set('activityDate')} />
      <Input id={`${idPrefix}-time`} label="Heure (optionnel)" type="time" value={value.startTime} onChange={set('startTime')} />
      <Input id={`${idPrefix}-end`} label="Date de fin (optionnel)" type="date" value={value.endDate} onChange={set('endDate')} />
      <Input
        id={`${idPrefix}-description`}
        label="Description (optionnel)"
        value={value.description}
        onChange={set('description')}
      />
    </>
  );
}

export default function ActivitiesPage() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useFetch(activityApi.listActivities, [], {
    resourceTypes: ['activity'],
  });
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
      // On garde la date : on saisit souvent plusieurs activités d'affilée
      // pour le même jour.
      setForm((f) => ({ ...EMPTY_FORM, activityDate: f.activityDate }));
      showToast('Activité ajoutée.', 'success');
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur lors de la création.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(activity) {
    setEditingActivity(activity);
    setEditForm({
      name: activity.name,
      activityDate: activity.activity_date,
      startTime: activity.start_time || '',
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

  async function handleDelete() {
    const activity = editingActivity;
    if (!(await confirm({ message: `Supprimer l'activité "${activity.name}" ?`, danger: true }))) return;
    try {
      await activityApi.deleteActivity(activity.id);
      showToast('Activité supprimée.', 'success');
      closeEdit();
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Suppression impossible.', 'error');
    }
  }

  const activities = data?.activities || [];

  return (
    <div>
      <PageHeader
        title="Activités"
        description="Programme de la semaine d'intégration, jour par jour. Cliquez sur une activité pour la modifier."
      />

      <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-border bg-card p-4 shadow-soft">
        <p className="mb-3 text-sm font-semibold text-foreground">Ajouter une activité</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <ActivityFields value={form} onChange={setForm} idPrefix="new-activity" />
        </div>
        <div className="mt-3 flex justify-end">
          <Button type="submit" loading={submitting}>
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </div>
      </form>

      {loading && <CardListSkeleton />}
      {error && <ErrorState label={error} onRetry={reload} />}
      {!loading && !error && activities.length === 0 && (
        <EmptyState label="Aucune activité configurée." icon={CalendarDays} />
      )}

      {!loading && !error && activities.length > 0 && (
        <ActivityTimeline activities={activities} onSelect={openEdit} />
      )}

      <Modal open={!!editingActivity} onClose={closeEdit} title={editingActivity ? `Modifier ${editingActivity.name}` : ''}>
        {editingActivity && (
          <div className="flex flex-col gap-3">
            <ActivityFields value={editForm} onChange={setEditForm} idPrefix="edit-activity" />

            <div className="mt-2 flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={handleDelete} className="text-danger hover:text-danger">
                <Trash2 className="h-4 w-4" /> Supprimer
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={closeEdit}>
                  Annuler
                </Button>
                <Button onClick={handleSaveEdit} loading={saving}>
                  Enregistrer
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
