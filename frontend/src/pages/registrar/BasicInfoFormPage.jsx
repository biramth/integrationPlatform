import { useState } from 'react';
import { Plus, Search, TriangleAlert, Trash2 } from 'lucide-react';
import Dut1BasicForm from '../../components/dut1/Dut1BasicForm';
import AdmittedStudentLookup from '../../components/dut1/AdmittedStudentLookup';
import Dut1Card from '../../components/dut1/Dut1Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import PageHeader from '../../components/common/PageHeader';
import { EmptyState, ErrorState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { createDut1, deleteDut1, listDut1 } from '../../api/dut1Api';
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

  const { data, loading, error, reload } = useFetch(
    () => listDut1({ createdBy: user.id, search }),
    [user.id, search]
  );

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
    if (!values.fatherPhone && !values.motherPhone) {
      newErrors.fatherPhone = 'Au moins un numéro parent requis';
      newErrors.motherPhone = 'Au moins un numéro parent requis';
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
    if (!window.confirm(`Supprimer le dossier de ${record.first_name} ${record.last_name} pour recommencer la saisie ?`)) return;
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

  return (
    <div>
      <PageHeader
        eyebrow="Mon historique"
        title="Enregistrements"
        action={
          <Button onClick={openModal} className="sm:w-auto">
            <Plus className="h-4 w-4" /> Nouvelle fiche
          </Button>
        }
      />

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
        <EmptyState label="Aucun dossier enregistré pour l'instant — clique sur « Nouvelle fiche » pour commencer." />
      )}

      {!loading && !error && data.records.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.records.map((record, i) => (
            <div key={record.id} className="animate-fade-in-up" style={staggerStyle(i)}>
              <Dut1Card
                record={record}
                actions={
                  canSelfDelete(record) ? (
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
                  )
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
    </div>
  );
}
