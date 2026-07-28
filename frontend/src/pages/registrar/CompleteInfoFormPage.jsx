import { useState } from 'react';
import { listDut1, completeComplementary } from '../../api/dut1Api';
import { setDut1Allergies } from '../../api/dut1AllergyApi';
import Dut1Card from '../../components/dut1/Dut1Card';
import Dut1ComplementaryForm from '../../components/dut1/Dut1ComplementaryForm';
import AllergySelect from '../../components/dut1/AllergySelect';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { EmptyState, LoadingState } from '../../components/common/StateViews';
import { useToast } from '../../hooks/useToast';

export default function CompleteInfoFormPage() {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [values, setValues] = useState({});
  const [allergenIds, setAllergenIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    if (!search.trim()) return;
    setSearching(true);
    try {
      const data = await listDut1({ search: search.trim() });
      setResults(data.records);
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
        <button onClick={() => setSelected(null)} className="mb-4 text-sm text-blue-900">
          ← Retour à la recherche
        </button>
        <h1 className="mb-1 text-xl font-semibold text-slate-900">
          Infos complémentaires — {selected.first_name} {selected.last_name}
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          {selected.complementary_completed_at ? (
            <Badge variant="success">Déjà complété — modification possible</Badge>
          ) : (
            <Badge variant="warning">Pas encore complété</Badge>
          )}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-6 rounded-xl border border-slate-200 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-900">Allergies</p>
            <AllergySelect selectedIds={allergenIds} onChange={setAllergenIds} />
          </div>
          <Dut1ComplementaryForm values={values} onChange={handleChange} />
          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Compléter un dossier DUT1</h1>
      <p className="mb-4 text-sm text-slate-500">
        Recherchez le DUT1 par nom ou prénom pour ajouter ses infos complémentaires.
      </p>

      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <Input
          placeholder="Nom ou prénom…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={searching}>
          {searching ? '…' : 'Rechercher'}
        </Button>
      </form>

      {searching && <LoadingState />}
      {!searching && results.length === 0 && search && <EmptyState label="Aucun dossier trouvé." />}

      <div className="flex flex-col gap-3">
        {results.map((record) => (
          <Dut1Card
            key={record.id}
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
        ))}
      </div>
    </div>
  );
}
