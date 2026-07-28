import { useState } from 'react';
import Dut1BasicForm from '../../components/dut1/Dut1BasicForm';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { createDut1 } from '../../api/dut1Api';
import { DUT1_BASIC_DEFAULTS } from '../../utils/dut1BasicFields';
import { useToast } from '../../hooks/useToast';

export default function BasicInfoFormPage() {
  const { showToast } = useToast();
  const [values, setValues] = useState(DUT1_BASIC_DEFAULTS);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  function handleChange(key, value) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
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
    setResult(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const data = await createDut1(values);
      setResult(data);
      setValues(DUT1_BASIC_DEFAULTS);
      setErrors({});
      showToast('Dossier créé avec succès.', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur lors de la création du dossier.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Nouvelle fiche DUT1 — Infos de base</h1>
      <p className="mb-6 text-sm text-slate-500">
        Cette fiche suffit pour assigner une chambre et rendre le DUT1 visible pour l'équipe logistique.
      </p>

      {result && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="font-medium text-green-800">
            Dossier de {result.record.first_name} {result.record.last_name} créé avec succès.
          </p>
          <p className="mt-1 text-sm text-green-700">
            {result.roomAssigned ? (
              <>
                Chambre assignée : <Badge variant="success">{result.room.label}</Badge>
              </>
            ) : (
              <Badge variant="warning">{result.warning}</Badge>
            )}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Dut1BasicForm values={values} errors={errors} onChange={handleChange} />
        <div className="sticky bottom-16 mt-6 flex justify-end bg-gradient-to-t from-white via-white pt-4 md:static md:bg-none">
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? 'Enregistrement…' : 'Enregistrer le dossier'}
          </Button>
        </div>
      </form>
    </div>
  );
}
