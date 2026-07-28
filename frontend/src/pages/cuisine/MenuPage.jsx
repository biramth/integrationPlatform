import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import * as mealApi from '../../api/mealApi';
import { listAllergens } from '../../api/allergenApi';
import { MEAL_TYPES, MEAL_TYPE_LABELS } from '../../utils/mealTypes';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import AllergenCheckboxes from '../../components/common/AllergenCheckboxes';
import Card from '../../components/common/Card';
import PageHeader from '../../components/common/PageHeader';
import { ErrorState, EmptyState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { useToast } from '../../hooks/useToast';
import { staggerStyle } from '../../utils/stagger';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function MenuPage() {
  const { showToast } = useToast();
  const [date, setDate] = useState(todayIso());
  const [mealType, setMealType] = useState('dejeuner');
  const [dishName, setDishName] = useState('');
  const [dishAllergenIds, setDishAllergenIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const servicesFetch = useFetch(() => mealApi.listMealServices(date), [date]);
  const allergensFetch = useFetch(listAllergens, []);

  const service = servicesFetch.data?.mealServices.find((s) => s.mealType === mealType) || null;

  async function handleAddDish(e) {
    e.preventDefault();
    if (!dishName.trim()) return;
    setSubmitting(true);
    try {
      let serviceId = service?.id;
      if (!serviceId) {
        const created = await mealApi.createMealService(date, mealType);
        serviceId = created.mealService.id;
      }
      await mealApi.createDish(serviceId, dishName.trim(), dishAllergenIds);
      setDishName('');
      setDishAllergenIds([]);
      showToast('Plat ajouté.', 'success');
      servicesFetch.reload();
    } catch (err) {
      showToast(err.response?.data?.error || "Erreur lors de l'ajout du plat.", 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteDish(dishId) {
    try {
      await mealApi.deleteDish(dishId);
      servicesFetch.reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Suppression impossible.', 'error');
    }
  }

  return (
    <div>
      <PageHeader
        title="Menu du jour"
        description="Saisis les plats et leurs allergènes potentiels — la commission Santé s'en sert pour repérer les DUT1 à risque."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="flex gap-2">
          {MEAL_TYPES.map((mt) => (
            <button
              key={mt}
              onClick={() => setMealType(mt)}
              className={`min-h-[44px] rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.97] ${
                mealType === mt ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {MEAL_TYPE_LABELS[mt]}
            </button>
          ))}
        </div>
      </div>

      {servicesFetch.loading && <CardListSkeleton rows={2} />}
      {servicesFetch.error && <ErrorState label={servicesFetch.error} onRetry={servicesFetch.reload} />}

      {!servicesFetch.loading && !servicesFetch.error && (
        <div className="mb-6 flex flex-col gap-3">
          {(!service || service.dishes.length === 0) && <EmptyState label="Aucun plat enregistré pour ce service." />}
          {service?.dishes.map((dish, i) => (
            <div key={dish.id} className="animate-fade-in-up" style={staggerStyle(i)}>
              <Card className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{dish.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {dish.allergens.length === 0 && <span className="text-xs text-slate-400">Aucun allergène déclaré</span>}
                    {dish.allergens.map((a) => (
                      <Badge key={a.id} variant="warning">{a.label}</Badge>
                    ))}
                  </div>
                </div>
                <button onClick={() => handleDeleteDish(dish.id)} className="shrink-0 text-xs text-red-600 hover:underline">
                  Supprimer
                </button>
              </Card>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAddDish} className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-semibold text-slate-900">Ajouter un plat — {MEAL_TYPE_LABELS[mealType]}</p>
        <Input
          label="Nom du plat"
          required
          value={dishName}
          onChange={(e) => setDishName(e.target.value)}
          className="mb-3"
        />
        {allergensFetch.data && (
          <div className="mb-3">
            <p className="mb-2 text-sm font-medium text-slate-700">Allergènes potentiels</p>
            <AllergenCheckboxes
              allergens={allergensFetch.data.allergens}
              selectedIds={dishAllergenIds}
              onChange={setDishAllergenIds}
            />
          </div>
        )}
        <Button type="submit" loading={submitting} className="w-full sm:w-auto">
          Ajouter le plat
        </Button>
      </form>
    </div>
  );
}
