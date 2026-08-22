import { useMemo, useState } from 'react';
import { ChevronDown, DoorOpen, Luggage as LuggageIcon, PackageCheck, Search, ShieldAlert } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { listPendingDelivery, listMyDeliveries, confirmLuggageDelivery } from '../../api/dut1Api';
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

export default function RoomDeliveryPage() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useFetch(listPendingDelivery, []);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('todo');
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
      await confirmLuggageDelivery(record.id);
      showToast(`Dépôt confirmé pour ${record.first_name} ${record.last_name}.`, 'success');
      setExpandedId(null);
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Confirmation impossible.', 'error');
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Livraison des bagages"
        description="Amène dans la chambre assignée les bagages déjà photographiés par l'agent bagages, puis confirme le dépôt."
      />

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList className="h-11 p-1">
          <TabsTrigger value="todo" className="px-3 text-sm">
            À livrer
          </TabsTrigger>
          <TabsTrigger value="recent" className="px-3 text-sm">
            Livrées récemment
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'recent' && <RecentDeliveriesTab />}

      {tab === 'todo' && (
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
          {!loading && !error && filtered.length === 0 && (
            <EmptyState label="Aucune livraison en attente : tous les bagages enregistrés ont été déposés." />
          )}

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
                            <p className="mb-2 text-sm font-medium text-foreground">Bagages à transporter</p>
                            <div className="flex flex-wrap gap-2">
                              {items.map((item, idx) => (
                                <LuggageItemThumb key={item.id} item={item} index={idx} />
                              ))}
                            </div>
                          </div>
                        )}

                        <Button onClick={() => handleConfirm(record)} loading={confirmingId === record.id}>
                          <PackageCheck className="h-4 w-4" /> Confirmer le dépôt en chambre
                        </Button>
                      </div>
                    )}
                  </Card>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
