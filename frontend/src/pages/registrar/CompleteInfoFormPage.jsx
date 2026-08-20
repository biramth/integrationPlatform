import { useCallback, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { listDut1, completeComplementary } from '../../api/dut1Api';
import { setDut1Allergies } from '../../api/dut1AllergyApi';
import { matchAdmittedStudent } from '../../api/admittedStudentsApi';
import Dut1Card from '../../components/dut1/Dut1Card';
import Dut1ComplementaryForm from '../../components/dut1/Dut1ComplementaryForm';
import AllergySelect from '../../components/dut1/AllergySelect';
import AdmissionListToggle from '../../components/dut1/AdmissionListToggle';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import PageHeader from '../../components/common/PageHeader';
import { EmptyState, ErrorState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { useToast } from '../../hooks/useToast';
import { useFetch } from '../../hooks/useFetch';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { DEPARTMENTS, DEPARTMENT_LABELS } from '../../utils/departments';
import { staggerStyle } from '../../utils/stagger';

const PAGE_SIZE = 25;

export default function CompleteInfoFormPage() {
  const { showToast } = useToast();
  const [filters, setFilters] = useState({ search: '', department: '', gender: '' });
  const debouncedSearch = useDebouncedValue(filters.search, 350);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [values, setValues] = useState({});
  const [allergies, setAllergies] = useState({});
  const [admissionListType, setAdmissionListType] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetcher = useCallback(
    () => listDut1({ search: debouncedSearch, department: filters.department, gender: filters.gender, page, pageSize: PAGE_SIZE }),
    [debouncedSearch, filters.department, filters.gender, page]
  );
  const { data, loading, error, reload } = useFetch(fetcher, [debouncedSearch, filters.department, filters.gender, page]);

  const allergenIds = Object.keys(allergies).map(Number);

  function setAllergenIds(ids) {
    setAllergies((prev) => {
      const next = {};
      for (const id of ids) {
        next[id] = prev[id] || 'moderee';
      }
      return next;
    });
  }

  function setSeverity(allergenId, severity) {
    setAllergies((prev) => ({ ...prev, [allergenId]: severity }));
  }

  function updateFilters(patch) {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }

  function selectRecord(record) {
    setSelected(record);
    setValues(record.extra_fields || {});
    setAdmissionListType(record.admission_list_type || null);
    const initial = {};
    for (const a of record.allergens || []) {
      initial[a.id] = a.severity || 'moderee';
    }
    setAllergies(initial);

    if (!record.admission_list_type) {
      matchAdmittedStudent({ lastName: record.last_name, firstName: record.first_name, department: record.department })
        .then((res) => {
          if (res.student) {
            setAdmissionListType((current) => current ?? res.student.list_type);
          }
        })
        .catch(() => {});
    }
  }

  function handleChange(key, value) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (
      !window.confirm(
        "Une fois enregistré, ce dossier ne sera plus modifiable depuis cette page. Confirmer l'enregistrement ?"
      )
    ) {
      return;
    }
    setSubmitting(true);
    try {
      const [data] = await Promise.all([
        completeComplementary(selected.id, values, admissionListType),
        setDut1Allergies(selected.id, allergies),
      ]);
      showToast('Infos complémentaires enregistrées.', 'success');
      setSelected(data.record);
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur lors de l\'enregistrement.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (selected) {
    const isLocked = !!selected.complementary_completed_at;

    return (
      <div>
        <button
          onClick={() => setSelected(null)}
          className="mb-4 flex items-center gap-1 text-sm text-blue-900 transition-colors hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à la liste
        </button>
        <PageHeader
          eyebrow="Phase 2 — infos complémentaires"
          title={`${selected.first_name} ${selected.last_name}`}
          description={
            isLocked
              ? 'Dossier complété — verrouillé. Une correction doit passer par un administrateur.'
              : "Ces informations viennent du questionnaire de la commission Santé."
          }
          action={
            isLocked ? (
              <Badge variant="success">Déjà complété — verrouillé</Badge>
            ) : (
              <Badge variant="warning">Pas encore complété</Badge>
            )
          }
        />

        <form onSubmit={handleSubmit}>
          <div className="mb-6 rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">Admission au concours</p>
            <AdmissionListToggle value={admissionListType} onChange={setAdmissionListType} disabled={isLocked} />
          </div>

          <div className="mb-6 rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">Allergies</p>
            <AllergySelect
              selectedIds={allergenIds}
              onChange={setAllergenIds}
              severities={allergies}
              onSeverityChange={setSeverity}
              disabled={isLocked}
            />
          </div>
          <Dut1ComplementaryForm values={values} onChange={handleChange} disabled={isLocked} />
          {!isLocked && (
            <div className="mt-6 flex justify-end">
              <Button type="submit" loading={submitting} className="w-full sm:w-auto">
                Enregistrer
              </Button>
            </div>
          )}
        </form>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Compléter un dossier DUT1"
        description="Tous les dossiers sont listés ci-dessous — utilise la recherche pour affiner (nom, prénom, téléphone, matricule)."
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input
          icon={Search}
          placeholder="Nom, prénom, téléphone, matricule…"
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
        />
        <Select
          placeholder="Tous les départements"
          value={filters.department}
          onChange={(e) => updateFilters({ department: e.target.value })}
          options={DEPARTMENTS.map((d) => ({ value: d, label: DEPARTMENT_LABELS[d] }))}
        />
        <Select
          placeholder="Tous les genres"
          value={filters.gender}
          onChange={(e) => updateFilters({ gender: e.target.value })}
          options={[
            { value: 'M', label: 'Masculin' },
            { value: 'F', label: 'Féminin' },
          ]}
        />
      </div>

      {loading && <CardListSkeleton rows={6} />}
      {error && <ErrorState label={error} onRetry={reload} />}
      {!loading && !error && data.records.length === 0 && <EmptyState label="Aucun dossier trouvé." />}

      {!loading && !error && data.records.length > 0 && (
        <>
          <div className="flex flex-col gap-3">
            {data.records.map((record, i) => (
              <div key={record.id} className="animate-fade-in-up" style={staggerStyle(i)}>
                <Dut1Card
                  record={record}
                  onClick={() => selectRecord(record)}
                  actions={
                    record.complementary_completed_at ? (
                      <Badge variant="success">Complémentaire OK</Badge>
                    ) : (
                      <Badge variant="warning">À compléter</Badge>
                    )
                  }
                />
              </div>
            ))}
          </div>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
