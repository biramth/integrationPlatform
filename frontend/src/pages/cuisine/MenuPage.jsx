import { useState } from 'react';
import { Trash2, Plus, UtensilsCrossed, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorState, EmptyState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { useToast } from '../../hooks/useToast';
import { staggerStyle } from '../../utils/stagger';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(iso, days) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
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
        <div className="flex items-end gap-1">
          <button
            type="button"
            onClick={() => setDate((d) => shiftDate(d, -1))}
            className="flex h-11 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition-colors hover:bg-slate-50"
            aria-label="Jour précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button
            type="button"
            onClick={() => setDate((d) => shiftDate(d, 1))}
            className="flex h-11 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition-colors hover:bg-slate-50"
            aria-label="Jour suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <Tabs value={mealType} onValueChange={setMealType}>
          <TabsList className="h-11 p-1">
            {MEAL_TYPES.map((mt) => (
              <TabsTrigger key={mt} value={mt} className="px-3 text-sm">
                {MEAL_TYPE_LABELS[mt]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {servicesFetch.loading && <CardListSkeleton rows={2} />}
      {servicesFetch.error && <ErrorState label={servicesFetch.error} onRetry={servicesFetch.reload} />}

      {!servicesFetch.loading && !servicesFetch.error && (
        <div className="mb-6 flex flex-col gap-3">
          {(!service || service.dishes.length === 0) && <EmptyState label="Aucun plat enregistré pour ce service." />}
          {service?.dishes.map((dish, i) => (
            <div key={dish.id} className="animate-fade-in-up" style={staggerStyle(i)}>
              <Card className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-800">
                    <UtensilsCrossed className="h-4.5 w-4.5" size={18} />
                  </span>
                  <div>
                    <p className="font-medium text-slate-900">{dish.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {dish.allergens.length === 0 && <span className="text-xs text-slate-400">Aucun allergène déclaré</span>}
                      {dish.allergens.map((a) => (
                        <Badge key={a.id} variant="warning">{a.label}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteDish(dish.id)}
                  className="flex shrink-0 items-center gap-1 text-xs text-red-600 transition-colors hover:text-red-700 hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Supprimer
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
          <Plus className="h-4 w-4" /> Ajouter le plat
        </Button>
      </form>
    </div>
  );
}
