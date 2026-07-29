import { useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { listDut1, completeComplementary } from '../../api/dut1Api';
import { setDut1Allergies } from '../../api/dut1AllergyApi';
import Dut1Card from '../../components/dut1/Dut1Card';
import Dut1ComplementaryForm from '../../components/dut1/Dut1ComplementaryForm';
import AllergySelect from '../../components/dut1/AllergySelect';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import PageHeader from '../../components/common/PageHeader';
import { EmptyState, LoadingState } from '../../components/common/StateViews';
import { useToast } from '../../hooks/useToast';
import { DEPARTMENTS, DEPARTMENT_LABELS } from '../../utils/departments';
import { staggerStyle } from '../../utils/stagger';

export default function CompleteInfoFormPage() {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [gender, setGender] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [values, setValues] = useState({});
  const [allergenIds, setAllergenIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    if (!search.trim() && !department && !gender) return;
    setSearching(true);
    try {
      const data = await listDut1({ search: search.trim(), department, gender });
      setResults(data.records);
      setSearched(true);
    } finally {
      setSearching(false);
    }
  }

  function selectRecord(record) {
    setSelected(record);
    setValues(record.extra_fields || {});
    setAllergenIds((record.allergens || []).map((a) => a.id));
  }

  function handleChange(key, value) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const [data] = await Promise.all([
        completeComplementary(selected.id, values),
        setDut1Allergies(selected.id, allergenIds),
      ]);
      showToast('Infos complémentaires enregistrées.', 'success');
      setSelected(data.record);
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur lors de l\'enregistrement.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (selected) {
    return (
      <div>
        <button
          onClick={() => setSelected(null)}
          className="mb-4 flex items-center gap-1 text-sm text-blue-900 transition-colors hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à la recherche
        </button>
        <PageHeader
          eyebrow="Phase 2 — infos complémentaires"
          title={`${selected.first_name} ${selected.last_name}`}
          description={
            selected.complementary_completed_at
              ? undefined
              : "Ces informations viennent du questionnaire de la commission Santé."
          }
          action={
            selected.complementary_completed_at ? (
              <Badge variant="success">Déjà complété — modification possible</Badge>
            ) : (
              <Badge variant="warning">Pas encore complété</Badge>
            )
          }
        />

        <form onSubmit={handleSubmit}>
          <div className="mb-6 rounded-xl border border-slate-200 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-900">Allergies</p>
            <AllergySelect selectedIds={allergenIds} onChange={setAllergenIds} />
          </div>
          <Dut1ComplementaryForm values={values} onChange={handleChange} />
          <div className="mt-6 flex justify-end">
            <Button type="submit" loading={submitting} className="w-full sm:w-auto">
              Enregistrer
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Compléter un dossier DUT1"
        description="Recherche par nom, prénom, téléphone ou matricule. En cas d'homonymes, affine avec le département/genre — la date de naissance et le matricule s'affichent aussi sur chaque résultat."
      />

      <form onSubmit={handleSearch} className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input
          icon={Search}
          placeholder="Nom, prénom, téléphone, matricule…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select
          placeholder="Département"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          options={DEPARTMENTS.map((d) => ({ value: d, label: DEPARTMENT_LABELS[d] }))}
          className="sm:w-48"
        />
        <Select
          placeholder="Genre"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          options={[
            { value: 'M', label: 'Masculin' },
            { value: 'F', label: 'Féminin' },
          ]}
          className="sm:w-36"
        />
        <Button type="submit" loading={searching}>
          Rechercher
        </Button>
      </form>

      {searching && <LoadingState />}
      {!searching && searched && results.length === 0 && <EmptyState label="Aucun dossier trouvé." />}

      <div className="flex flex-col gap-3">
        {results.map((record, i) => (
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
    </div>
  );
}
