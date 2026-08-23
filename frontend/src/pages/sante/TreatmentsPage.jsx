import { useState } from 'react';
import { Sunrise, Sun, Moon, Plus, Pencil, Trash2, CheckCircle2, History as HistoryIcon } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import * as healthApi from '../../api/healthApi';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import PageHeader from '../../components/common/PageHeader';
import TreatmentFormModal from '../../components/sante/TreatmentFormModal';
import { confirm } from '../../components/common/confirmService';
import { ErrorState, EmptyState } from '../../components/common/StateViews';
import { useToast } from '../../hooks/useToast';
import { staggerStyle } from '../../utils/stagger';
import { DEPARTMENT_LABELS } from '../../utils/departments';

const SLOTS = [
  { key: 'matin', label: 'Matin', icon: Sunrise },
  { key: 'midi', label: 'Midi', icon: Sun },
  { key: 'soir', label: 'Soir', icon: Moon },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// Créneau présélectionné selon l'heure d'ouverture : le matin on tombe sur la
// liste du matin, etc. — l'agent voit directement "qui doit prendre quoi
// maintenant" sans cliquer.
function defaultSlot() {
  const h = new Date().getHours();
  if (h < 12) return 'matin';
  if (h < 18) return 'midi';
  return 'soir';
}

export default function TreatmentsPage() {
  const { showToast } = useToast();

  // Prises du jour : une date, un créneau actif, et l'état pris/pas pris de
  // chaque DUT1 — cochables en un clic.
  const [date, setDate] = useState(todayIso());
  const [slot, setSlot] = useState(defaultSlot);
  const [markingKey, setMarkingKey] = useState(null);
  const scheduleFetch = useFetch(() => healthApi.getTreatmentSchedule(date), [date]);

  // Traitements actifs par défaut ; bascule possible vers l'historique complet.
  const [status, setStatus] = useState('active');
  const treatmentsFetch = useFetch(() => healthApi.getTreatments(status), [status]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState(null);

  const currentSlot = scheduleFetch.data?.slots?.[slot];
  const allTaken = currentSlot && currentSlot.total > 0 && currentSlot.takenCount === currentSlot.total;
  const noneTakenYet = currentSlot && currentSlot.total > 0 && currentSlot.takenCount === 0;

  async function handleToggleIntake(item) {
    const key = `${item.treatmentId}-${item.slot}`;
    setMarkingKey(key);
    try {
      await healthApi.markTreatmentIntake(item.treatmentId, { date, slot: item.slot, taken: !item.taken });
      scheduleFetch.reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur lors du marquage de la prise.', 'error');
    } finally {
      setMarkingKey(null);
    }
  }

  function openCreate() {
    setEditingTreatment(null);
    setFormOpen(true);
  }

  function openEdit(treatment) {
    setEditingTreatment(treatment);
    setFormOpen(true);
  }

  async function handleSaved(payload) {
    try {
      if (editingTreatment) {
        await healthApi.updateTreatment(editingTreatment.id, payload);
        showToast('Traitement mis à jour.', 'success');
      } else {
        await healthApi.createTreatment(payload);
        showToast('Traitement créé.', 'success');
      }
      setFormOpen(false);
      setEditingTreatment(null);
      treatmentsFetch.reload();
      scheduleFetch.reload();
    } catch (err) {
      showToast(err.response?.data?.error || "Erreur lors de l'enregistrement.", 'error');
    }
  }

  async function handleEnd(treatment) {
    if (
      !(await confirm({
        message: `Clôturer le traitement de ${treatment.firstName} ${treatment.lastName} ? Il disparaîtra immédiatement des prises du jour.`,
      }))
    )
      return;
    try {
      await healthApi.endTreatment(treatment.id);
      showToast('Traitement clôturé — retiré des prises.', 'success');
      treatmentsFetch.reload();
      scheduleFetch.reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Clôture impossible.', 'error');
    }
  }

  async function handleDelete(treatment) {
    if (
      !(await confirm({
        message: `Supprimer définitivement le traitement de ${treatment.firstName} ${treatment.lastName} ?`,
        danger: true,
      }))
    )
      return;
    try {
      await healthApi.deleteTreatment(treatment.id);
      showToast('Traitement supprimé.', 'success');
      treatmentsFetch.reload();
      scheduleFetch.reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Suppression impossible.', 'error');
    }
  }

  return (
    <div>
      <PageHeader
        title="Traitements"
        description="Prises de médicaments par créneau (matin, midi, soir) : cochez chaque prise effectuée pour réduire les oubli. Un traitement fini (date passée ou clôturé) sort automatiquement des listes."
      />

      {/* ---------------------------------------------------------------- */}
      {/* Prises du jour                                                    */}
      {/* ---------------------------------------------------------------- */}
      <Card className="mb-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">Prises du jour</p>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="max-w-[180px]" />
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          {SLOTS.map(({ key, label, icon: Icon }) => {
            const s = scheduleFetch.data?.slots?.[key];
            const done = s && s.total > 0 && s.takenCount === s.total;
            return (
              <button
                key={key}
                onClick={() => setSlot(key)}
                className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-lg border p-3 text-sm font-medium transition-colors ${
                  key === slot
                    ? 'border-role-accent bg-role-accent-soft text-role-accent'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Icon className="h-4 w-4" /> {label}
                </span>
                <span className={`text-xs ${done ? 'font-semibold text-success' : ''}`}>
                  {s && s.total > 0 && (done ? '✓ Terminé' : `${s.takenCount}/${s.total}`)}
                  {s && s.total === 0 && '—'}
                </span>
              </button>
            );
          })}
        </div>

        {currentSlot && currentSlot.total > 0 && (
          <div
            className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
              allTaken
                ? 'border-success/30 bg-success-soft text-success-soft-foreground'
                : noneTakenYet
                ? 'border-warning/30 bg-warning-soft text-warning-soft-foreground'
                : 'border-info/30 bg-info-soft text-info-soft-foreground'
            }`}
          >
            {allTaken
              ? `✓ Toutes les prises ont été effectuées (${currentSlot.takenCount}/${currentSlot.total}).`
              : `${currentSlot.takenCount}/${currentSlot.total} prise(s) marquée(s).`}
          </div>
        )}

        {scheduleFetch.loading && <p className="py-2 text-sm text-muted-foreground">Chargement…</p>}
        {scheduleFetch.error && <ErrorState label={scheduleFetch.error} onRetry={scheduleFetch.reload} />}
        {!scheduleFetch.loading && !scheduleFetch.error && (!currentSlot || currentSlot.total === 0) && (
          <EmptyState label="Aucune prise prévue à ce créneau." icon={Moon} />
        )}

        {!scheduleFetch.loading && !scheduleFetch.error && currentSlot && currentSlot.items.length > 0 && (
          <div className="flex flex-col gap-2">
            {currentSlot.items.map((item, i) => {
              const key = `${item.treatmentId}-${item.slot}`;
              return (
                <div
                  key={key}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 ${
                    item.taken ? 'border-success/30 bg-success-soft/50' : 'border-border'
                  }`}
                  style={staggerStyle(i)}
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {item.firstName} {item.lastName}
                      {item.roomLabel && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">{item.roomLabel}</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.medicationName}
                      {item.dosage ? ` — ${item.dosage}` : ''}
                    </p>
                    {item.notes && <p className="mt-0.5 text-xs italic text-muted-foreground">{item.notes}</p>}
                    {item.taken && item.takenAt && (
                      <p className="mt-0.5 text-xs text-success">
                        Pris à{' '}
                        {new Date(item.takenAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        {item.takenByName ? ` (par ${item.takenByName})` : ''}
                      </p>
                    )}
                  </div>
                  <Button
                    variant={item.taken ? 'secondary' : 'primary'}
                    loading={markingKey === key}
                    onClick={() => handleToggleIntake(item)}
                    className="px-3 py-1.5 text-xs"
                  >
                    {item.taken ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Pris — annuler ?
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Marquer pris
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* Liste des traitements                                             */}
      {/* ---------------------------------------------------------------- */}
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-h2 text-foreground">Traitements</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {status === 'active'
              ? 'Traitements actifs à aujourd’hui.'
              : 'Historique complet : traitements clôturés ou dont les dates sont passées.'}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" onClick={() => setStatus((s) => (s === 'active' ? 'all' : 'active'))}>
            <HistoryIcon className="h-4 w-4" /> {status === 'active' ? "Voir l'historique" : 'Actifs seulement'}
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nouveau traitement
          </Button>
        </div>
      </div>

      {treatmentsFetch.loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {treatmentsFetch.error && <ErrorState label={treatmentsFetch.error} onRetry={treatmentsFetch.reload} />}
      {!treatmentsFetch.loading && !treatmentsFetch.error && (treatmentsFetch.data?.treatments || []).length === 0 && (
        <EmptyState
          label={status === 'active' ? 'Aucun traitement actif.' : 'Aucun traitement enregistré.'}
          icon={Sunrise}
        />
      )}

      {!treatmentsFetch.loading && !treatmentsFetch.error && (treatmentsFetch.data?.treatments || []).length > 0 && (
        <div className="flex flex-col gap-3">
          {treatmentsFetch.data.treatments.map((treatment, i) => (
            <div key={treatment.id} className="animate-fade-in-up" style={staggerStyle(i)}>
              <Card className={`flex flex-col gap-3 ${!treatment.isActive ? 'opacity-70' : ''}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">
                        {treatment.firstName} {treatment.lastName}
                      </p>
                      <Badge variant="neutral">{treatment.roomLabel || 'Sans chambre'}</Badge>
                      {treatment.isActive ? (
                        <Badge variant="warning">En cours</Badge>
                      ) : treatment.endedAt ? (
                        <Badge variant="success">Clôturé</Badge>
                      ) : (
                        <Badge variant="neutral">Fini</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {DEPARTMENT_LABELS[treatment.department] || treatment.department} —{' '}
                      {treatment.medicationName}
                      {treatment.dosage ? ` — ${treatment.dosage}` : ''} — depuis le {treatment.startDate}
                      {treatment.endDate ? ` au ${treatment.endDate}` : ' (durée indéterminée)'}
                    </p>
                    {treatment.notes && (
                      <p className="mt-0.5 text-xs italic text-muted-foreground">{treatment.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {['matin', 'midi', 'soir'].filter((k) => treatment.slots[k]).map((k) => (
                      <Badge key={k} variant="info">
                        {k.charAt(0).toUpperCase() + k.slice(1)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => openEdit(treatment)}>
                    <Pencil className="h-3.5 w-3.5" /> Modifier
                  </Button>
                  {treatment.isActive && (
                    <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => handleEnd(treatment)}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Clôturer (fin du traitement)
                    </Button>
                  )}
                  <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => handleDelete(treatment)}>
                    <Trash2 className="h-3.5 w-3.5" /> Supprimer
                  </Button>
                </div>

                {!treatment.isActive && treatment.endedAt && (
                  <p className="text-xs text-muted-foreground">
                    Clôturé le{' '}
                    {new Date(treatment.endedAt).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {treatment.endedByName ? ` par ${treatment.endedByName}` : ''}.
                  </p>
                )}
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* key force le remontage : chaque ouverture repart d'un état vierge. */}
      {formOpen && (
        <TreatmentFormModal
          key={`treatment-form-${editingTreatment?.id ?? 'create'}`}
          open={formOpen}
          onClose={() => {
            setFormOpen(false);
            setEditingTreatment(null);
          }}
          editingTreatment={editingTreatment}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
