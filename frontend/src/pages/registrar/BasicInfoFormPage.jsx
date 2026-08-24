import { useState } from 'react';
import { Plus, Search, TriangleAlert, Trash2, Lock, BedDouble } from 'lucide-react';
import { getPlatformSettings } from '../../api/platformSettingsApi';
import Dut1BasicForm from '../../components/dut1/Dut1BasicForm';
import AdmittedStudentLookup from '../../components/dut1/AdmittedStudentLookup';
import Dut1Card from '../../components/dut1/Dut1Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import { confirm } from '../../components/common/confirmService';
import PageHeader from '../../components/common/PageHeader';
import { EmptyState, ErrorState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { createDut1, deleteDut1, listAvailableRooms, listDut1, reassignRoom } from '../../api/dut1Api';
import { DUT1_BASIC_DEFAULTS } from '../../utils/dut1BasicFields';
import { DEPARTMENT_LABELS } from '../../utils/departments';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { staggerStyle } from '../../utils/stagger';

export default function BasicInfoFormPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [values, setValues] = useState(DUT1_BASIC_DEFAULTS);
  const [admittedStudentId, setAdmittedStudentId] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  // Déplacement de chambre : l'agent ne touche qu'aux dossiers qu'il a lui-même
  // enregistrés (c'est aussi la règle backend). Les chambres compatibles
  // (même genre, places libres) viennent de l'endpoint léger dédié — pas
  // besoin d'accéder à la configuration complète des chambres.
  const [movingRecord, setMovingRecord] = useState(null);
  const [moveRooms, setMoveRooms] = useState([]);
  const [moveChoice, setMoveChoice] = useState('');
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [moving, setMoving] = useState(false);

  const { data, loading, error, reload } = useFetch(
    () => listDut1({ createdBy: user.id, search }),
    [user.id, search]
  );
  const settingsFetch = useFetch(getPlatformSettings, []);
  const registrationEnabled = settingsFetch.data?.registration !== false;

  function handleChange(key, value) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setDuplicateWarning(null);
  }

  function openModal() {
    setValues(DUT1_BASIC_DEFAULTS);
    setAdmittedStudentId(null);
    setErrors({});
    setDuplicateWarning(null);
    setModalOpen(true);
  }

  function handleSelectAdmitted(student) {
    setValues((v) => ({
      ...v,
      lastName: student.last_name,
      firstName: student.first_name,
      department: student.department,
      birthDate: student.birth_date || v.birthDate,
      birthPlace: student.birth_place || v.birthPlace,
    }));
    setAdmittedStudentId(student.id);
    setErrors({});
  }

  function validate() {
    const newErrors = {};
    if (!values.lastName) newErrors.lastName = 'Requis';
    if (!values.firstName) newErrors.firstName = 'Requis';
    if (!values.birthDate) newErrors.birthDate = 'Requis';
    if (!values.birthPlace) newErrors.birthPlace = 'Requis';
    if (!values.gender) newErrors.gender = 'Requis';
    if (!values.department) newErrors.department = 'Requis';
    const hasEmergencyPhone = (values.emergencyContacts || []).some((c) => (c.phone || '').trim());
    if (!hasEmergencyPhone) {
      newErrors.emergencyContacts = "Au moins un numéro à contacter en cas d'urgence est requis";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    await submitRecord({ confirmDuplicate: false });
  }

  async function submitRecord({ confirmDuplicate }) {
    setSubmitting(true);
    try {
      const data = await createDut1({ ...values, admittedStudentId }, { confirmDuplicate });
      const roomText = data.roomAssigned ? `— chambre ${data.room.label}` : `— ${data.warning}`;
      showToast(`${data.record.first_name} ${data.record.last_name} enregistré(e) ${roomText}`, 'success');
      // L'orthographe saisie a remplacé celle, fautive, du référentiel des
      // admis (convertisseur PDF→Excel) — le rendre visible pour l'IT.
      if (data.repaired) {
        showToast(
          `Référentiel des admis corrigé : « ${data.repaired.from.firstName} ${data.repaired.from.lastName} » → « ${data.repaired.to.firstName} ${data.repaired.to.lastName} ».`,
          'info'
        );
      }
      setModalOpen(false);
      setDuplicateWarning(null);
      reload();
    } catch (err) {
      if (err.response?.status === 409 && err.response.data?.duplicate) {
        setDuplicateWarning(err.response.data.duplicate);
      } else {
        showToast(err.response?.data?.error || 'Erreur lors de la création du dossier.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Reflet côté front de la règle imposée par le backend : dès qu'une autre
  // commission a construit sur ce dossier (phase 2, bagages, allergies), il
  // ne peut plus être annulé depuis cette page — seul IT peut encore le
  // supprimer. Sert à griser le bouton ; le backend reste la source de
  // vérité (il bloque aussi le cas — plus rare — d'une restriction de santé
  // déclarée sans phase 2 complétée, non visible depuis cette liste).
  function canSelfDelete(record) {
    return !record.complementary_completed_at && !record.luggage_items_count && !(record.allergens?.length > 0);
  }

  async function handleDelete(record) {
    if (
      !(await confirm({
        message: `Supprimer le dossier de ${record.first_name} ${record.last_name} pour recommencer la saisie ?`,
        danger: true,
      }))
    )
      return;
    setDeletingId(record.id);
    try {
      await deleteDut1(record.id);
      showToast('Dossier supprimé — vous pouvez recommencer la saisie.', 'success');
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Suppression impossible.', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  function openMove(record) {
    setMovingRecord(record);
    setMoveChoice('');
    setMoveRooms([]);
    setLoadingTargets(true);
    listAvailableRooms(record.gender)
      .then((res) => setMoveRooms(res.rooms))
      .catch(() => setMoveRooms([]))
      .finally(() => setLoadingTargets(false));
  }

  // Même tri que l'attribution automatique et que la page Chambres : d'abord
  // les chambres où le département du DUT1 est le moins représenté (mélange),
  // puis les plus libres — la première gagne un badge "Recommandé".
  const decoratedTargets = movingRecord
    ? moveRooms
        .filter((r) => r.id !== movingRecord.room_id)
        .map((r) => ({
          ...r,
          free: r.capacity - r.occupied,
          sameDepartment:
            (r.departments || []).find((d) => d.department === movingRecord.department)?.count || 0,
        }))
        .sort((a, b) => a.sameDepartment - b.sameDepartment || b.free - a.free || a.label.localeCompare(b.label))
    : [];

  async function handleMove() {
    if (!movingRecord || !moveChoice) return;
    const target = decoratedTargets.find((r) => String(r.id) === moveChoice);
    setMoving(true);
    try {
      await reassignRoom(movingRecord.id, Number(moveChoice));
      showToast(
        `${movingRecord.first_name} ${movingRecord.last_name} déplacé(e) en chambre ${target ? target.label : 'choisie'}.`,
        'success'
      );
      setMovingRecord(null);
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Déplacement impossible.', 'error');
    } finally {
      setMoving(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Mon historique"
        title="Enregistrements"
        action={
          registrationEnabled && (
            <Button onClick={openModal} className="sm:w-auto">
              <Plus className="h-4 w-4" /> Nouvelle fiche
            </Button>
          )
        }
      />

      {!registrationEnabled && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-warning bg-warning-soft px-3 py-2.5">
          <Lock className="h-4 w-4 shrink-0 text-warning" />
          <p className="text-sm text-warning-soft-foreground">
            L'enregistrement de nouveaux dossiers est désactivé pour cette édition. L'historique reste consultable.
          </p>
        </div>
      )}

      <Input
        icon={Search}
        placeholder="Rechercher dans mes enregistrements (nom, téléphone, matricule)…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />

      {loading && <CardListSkeleton />}
      {error && <ErrorState label={error} onRetry={reload} />}
      {!loading && !error && data.records.length === 0 && (
        <EmptyState
          label={
            registrationEnabled
              ? "Aucun dossier enregistré pour l'instant — clique sur « Nouvelle fiche » pour commencer."
              : 'Aucun dossier enregistré pour l\'instant.'
          }
        />
      )}

      {!loading && !error && data.records.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.records.map((record, i) => (
            <div key={record.id} className="animate-fade-in-up" style={staggerStyle(i)}>
              <Dut1Card
                record={record}
                actions={
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {canSelfDelete(record) ? (
                      <Button
                        variant="danger"
                        onClick={() => handleDelete(record)}
                        loading={deletingId === record.id}
                        className="px-3 py-1.5 text-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Supprimer et recommencer
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Déjà pris en charge par une autre commission (phase 2, bagages ou allergies) — seule la commission IT peut encore le supprimer.
                      </p>
                    )}
                    <Button
                      variant="secondary"
                      onClick={() => openMove(record)}
                      className="px-3 py-1.5 text-xs"
                    >
                      <BedDouble className="h-3.5 w-3.5" />
                      {record.room_label ? `Déplacer (${record.room_label})` : 'Assigner une chambre'}
                    </Button>
                  </div>
                }
              />
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle fiche DUT1 — Infos de base">
        <form onSubmit={handleSubmit}>
          <AdmittedStudentLookup department={values.department} onSelect={handleSelectAdmitted} />
          <div className="mt-4">
            <Dut1BasicForm values={values} errors={errors} onChange={handleChange} />
          </div>

          {duplicateWarning && (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-warning bg-warning-soft px-3 py-2.5">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div className="text-sm text-warning-soft-foreground">
                <p className="font-medium">
                  Un dossier existe déjà pour {duplicateWarning.firstName} {duplicateWarning.lastName}
                  {' '}(
                  {DEPARTMENT_LABELS[duplicateWarning.department] || duplicateWarning.department}
                  {duplicateWarning.roomLabel ? `, chambre ${duplicateWarning.roomLabel}` : ''}
                  ).
                </p>
                <p className="mt-1">
                  S'il s'agit d'un homonyme (autre personne, même nom et même date de naissance), la création peut
                  continuer. S'il s'agit de la même personne, annuler pour éviter un doublon.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            {duplicateWarning ? (
              <Button
                type="button"
                variant="danger"
                loading={submitting}
                onClick={() => submitRecord({ confirmDuplicate: true })}
              >
                Enregistrer quand même
              </Button>
            ) : (
              <Button type="submit" loading={submitting}>
                Enregistrer le dossier
              </Button>
            )}
          </div>
        </form>
      </Modal>

      <Modal
        open={!!movingRecord}
        onClose={() => setMovingRecord(null)}
        title={movingRecord ? `Déplacer ${movingRecord.first_name} ${movingRecord.last_name}` : ''}
      >
        {movingRecord && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="neutral">
                {DEPARTMENT_LABELS[movingRecord.department] || movingRecord.department}
              </Badge>
              {movingRecord.room_label ? (
                <Badge variant="success">Chambre {movingRecord.room_label}</Badge>
              ) : (
                <Badge variant="warning">Aucune chambre</Badge>
              )}
            </div>

            {loadingTargets && (
              <p className="text-sm text-muted-foreground">Chargement des chambres disponibles…</p>
            )}

            {!loadingTargets && decoratedTargets.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune autre chambre disponible pour ce genre.</p>
            )}

            {!loadingTargets && decoratedTargets.length > 0 && (
              <>
                <p className="-mb-2 text-xs text-muted-foreground">
                  Les chambres où ce département est le moins représenté apparaissent en premier — même logique que
                  l'attribution automatique.
                </p>
                <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {decoratedTargets.map((r) => {
                    const selected = moveChoice === String(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setMoveChoice(String(r.id))}
                        className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                          selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="font-medium text-foreground">{r.label}</span>
                          <span className="ml-1.5 truncate text-xs text-muted-foreground">{r.building || '—'}</span>
                          {r.departments?.length > 0 && (
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {r.departments.map((d) => `${d.department} ×${d.count}`).join(' · ')}
                            </span>
                          )}
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {r.id === decoratedTargets[0].id && (
                            <Badge variant="success" className="shrink-0">Recommandé</Badge>
                          )}
                          <Badge variant={r.free <= 1 ? 'warning' : 'success'}>{r.occupied}/{r.capacity}</Badge>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="mt-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setMovingRecord(null)}>
                Annuler
              </Button>
              <Button onClick={handleMove} loading={moving} disabled={!moveChoice}>
                Déplacer ici
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
