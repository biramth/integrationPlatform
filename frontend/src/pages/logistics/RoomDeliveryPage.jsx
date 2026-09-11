import { useMemo, useState } from 'react';
import { ChevronDown, DoorOpen, Luggage as LuggageIcon, PackageCheck, Search, ShieldAlert, Truck, User as UserIcon } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import {
  listPendingDelivery,
  listPickedUpPendingDelivery,
  listMyDeliveries,
  confirmLuggagePickup,
  confirmLuggageDelivery,
} from '../../api/dut1Api';
import * as luggageApi from '../../api/luggageApi';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import LuggageItemThumb from '../../components/upload/LuggageItemThumb';
import PageHeader from '../../components/common/PageHeader';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState, ErrorState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { useToast } from '../../hooks/useToast';
import { staggerStyle } from '../../utils/stagger';
import { DEPARTMENT_LABELS } from '../../utils/departments';

function RecentDeliveriesTab() {
  const { data, loading, error, reload } = useFetch(listMyDeliveries, []);

  if (loading) return <CardListSkeleton />;
  if (error) return <ErrorState label={error} onRetry={reload} />;
  if (data.records.length === 0) return <EmptyState label="Aucun dépôt confirmé pour le moment." />;

  return (
    <div className="flex flex-col gap-3">
      {data.records.map((record, i) => (
        <div key={record.id} className="animate-fade-in-up" style={staggerStyle(i)}>
          <Card className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-foreground">
                {record.first_name} {record.last_name}
              </p>
              <p className="text-xs text-muted-foreground">{new Date(record.luggage_delivered_at).toLocaleString('fr-FR')}</p>
            </div>
            <Badge variant="success">
              <DoorOpen className="mr-1 inline h-3 w-3" /> {record.room_label || '—'}
            </Badge>
          </Card>
        </div>
      ))}
    </div>
  );
}

// Étape "à transporter" (pas encore prise en charge) et étape "en cours de
// livraison" (prise en charge, pas encore livrée) partagent la même
// mécanique — recherche, dépliage des bagages, confirmation d'une étape —
// seule l'action et son libellé changent.
function LuggageWorkflowTab({ fetcher, onConfirm, confirmLabel, confirmingLabel, ConfirmIcon, emptyLabel, showPickedUpBy = false }) {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useFetch(fetcher, []);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [itemsByDut1, setItemsByDut1] = useState({});

  const filtered = useMemo(() => {
    const records = data?.records || [];
    if (!search.trim()) return records;
    const q = search.trim().toLowerCase();
    return records.filter(
      (r) => r.last_name.toLowerCase().includes(q) || r.first_name.toLowerCase().includes(q) || (r.room_label || '').toLowerCase().includes(q)
    );
  }, [data, search]);

  async function loadItems(dut1Id) {
    const res = await luggageApi.listLuggageItems(dut1Id);
    setItemsByDut1((m) => ({ ...m, [dut1Id]: res.items }));
  }

  function toggleExpand(record) {
    if (expandedId === record.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(record.id);
    if (!itemsByDut1[record.id]) loadItems(record.id);
  }

  async function handleConfirm(record) {
    setConfirmingId(record.id);
    try {
      await onConfirm(record.id);
      showToast(`${confirmingLabel} pour ${record.first_name} ${record.last_name}.`, 'success');
      setExpandedId(null);
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Confirmation impossible.', 'error');
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <>
      <Input
        icon={Search}
        placeholder="Rechercher un nom ou une chambre…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />

      {loading && <CardListSkeleton />}
      {error && <ErrorState label={error} onRetry={reload} />}
      {!loading && !error && filtered.length === 0 && <EmptyState label={emptyLabel} />}

      <div className="flex flex-col gap-3">
        {filtered.map((record, i) => {
          const expanded = expandedId === record.id;
          const items = itemsByDut1[record.id];

          return (
            <div key={record.id} className="animate-fade-in-up" style={staggerStyle(i)}>
              <Card>
                <button
                  type="button"
                  onClick={() => toggleExpand(record)}
                  className="flex w-full items-start justify-between gap-2 text-left"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {record.first_name} {record.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{DEPARTMENT_LABELS[record.department] || record.department}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="success">
                        <DoorOpen className="mr-1 inline h-3 w-3" /> Chambre {record.room_label}
                      </Badge>
                      <Badge variant="neutral">
                        <LuggageIcon className="mr-1 inline h-3 w-3" />
                        {record.luggage_items_count} bagage{record.luggage_items_count > 1 ? 's' : ''}
                      </Badge>
                      {record.luggage_sensitive_count > 0 && (
                        <Badge variant="warning">
                          <ShieldAlert className="mr-1 inline h-3 w-3" />
                          {record.luggage_sensitive_count} sensible{record.luggage_sensitive_count > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {showPickedUpBy && record.luggage_picked_up_by_name && (
                        <Badge variant="neutral">
                          <UserIcon className="mr-1 inline h-3 w-3" />
                          {record.luggage_picked_up_by_name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                  />
                </button>

                {expanded && (
                  <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4" onClick={(e) => e.stopPropagation()}>
                    {items === undefined && <p className="text-sm text-muted-foreground">Chargement des bagages…</p>}
                    {items && items.length > 0 && (
                      <div>
                        <p className="mb-2 text-sm font-medium text-foreground">Bagages</p>
                        <div className="flex flex-wrap gap-2">
                          {items.map((item, idx) => (
                            <LuggageItemThumb key={item.id} item={item} index={idx} />
                          ))}
                        </div>
                      </div>
                    )}

                    <Button onClick={() => handleConfirm(record)} loading={confirmingId === record.id}>
                      <ConfirmIcon className="h-4 w-4" /> {confirmLabel}
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function RoomDeliveryPage() {
  const [tab, setTab] = useState('todo');

  return (
    <div>
      <PageHeader
        title="Livraison des bagages"
        description="Prends en charge les bagages déjà photographiés dans la chambre assignée, puis confirme le dépôt une fois arrivé."
      />

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList className="h-11 p-1">
          <TabsTrigger value="todo" className="px-3 text-sm">
            À transporter
          </TabsTrigger>
          <TabsTrigger value="in-transit" className="px-3 text-sm">
            En cours de livraison
          </TabsTrigger>
          <TabsTrigger value="recent" className="px-3 text-sm">
            Livrées récemment
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'todo' && (
        <LuggageWorkflowTab
          fetcher={listPendingDelivery}
          onConfirm={confirmLuggagePickup}
          confirmLabel="Prendre en charge"
          confirmingLabel="Prise en charge confirmée"
          ConfirmIcon={Truck}
          emptyLabel="Aucun bagage en attente : tout a déjà été pris en charge."
        />
      )}

      {tab === 'in-transit' && (
        <LuggageWorkflowTab
          fetcher={listPickedUpPendingDelivery}
          onConfirm={confirmLuggageDelivery}
          confirmLabel="Confirmer le dépôt en chambre"
          confirmingLabel="Dépôt confirmé"
          ConfirmIcon={PackageCheck}
          emptyLabel="Aucune livraison en cours."
          showPickedUpBy
        />
      )}

      {tab === 'recent' && <RecentDeliveriesTab />}
    </div>
  );
}
