import { useMemo, useState } from 'react';
import { ShieldAlert, Luggage as LuggageIcon, ChevronDown, Search } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { listWithoutLuggage } from '../../api/dut1Api';
import * as luggageApi from '../../api/luggageApi';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Input from '../../components/common/Input';
import PhotoCapture from '../../components/upload/PhotoCapture';
import LuggageItemThumb from '../../components/upload/LuggageItemThumb';
import PageHeader from '../../components/common/PageHeader';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState, ErrorState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import { useToast } from '../../hooks/useToast';
import { staggerStyle } from '../../utils/stagger';
import { DEPARTMENT_LABELS } from '../../utils/departments';
import { Progress } from '@/components/ui/progress';

function RecentLuggageTab() {
  const { data, loading, error, reload } = useFetch(luggageApi.listMyLuggageItems, []);

  if (loading) return <CardListSkeleton />;
  if (error) return <ErrorState label={error} onRetry={reload} />;
  if (data.items.length === 0) return <EmptyState label="Aucun bagage traité pour le moment." />;

  return (
    <div className="flex flex-col gap-3">
      {data.items.map((item, i) => (
        <div key={item.id} className="animate-fade-in-up" style={staggerStyle(i)}>
          <Card className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-foreground">
                {item.first_name} {item.last_name}
              </p>
              <p className="text-xs text-muted-foreground">{new Date(item.uploaded_at).toLocaleString('fr-FR')}</p>
            </div>
            {item.is_sensitive && (
              <Badge variant="warning">
                <ShieldAlert className="mr-1 inline h-3 w-3" /> Sensible
              </Badge>
            )}
          </Card>
        </div>
      ))}
    </div>
  );
}

export default function LogisticsListPage() {
  const { showToast } = useToast();
  const { data, loading, error, reload } = useFetch(listWithoutLuggage, []);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('todo');
  const [expandedId, setExpandedId] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const [itemsByDut1, setItemsByDut1] = useState({});
  const [countDraft, setCountDraft] = useState('');

  const filtered = useMemo(() => {
    const records = data?.records || [];
    if (!search.trim()) return records;
    const q = search.trim().toLowerCase();
    return records.filter(
      (r) => r.last_name.toLowerCase().includes(q) || r.first_name.toLowerCase().includes(q)
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
    setCountDraft(record.luggage_count ?? '');
    if (!itemsByDut1[record.id]) loadItems(record.id);
  }

  async function handleSaveCount(record) {
    const value = countDraft === '' ? null : Number(countDraft);
    if (value === record.luggage_count) return;
    try {
      await luggageApi.setLuggageCount(record.id, value);
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur lors de la mise à jour.', 'error');
    }
  }

  async function handleCapture(record, file, isSensitive, sensitiveNote) {
    setSubmittingId(record.id);
    try {
      await luggageApi.createLuggageItem(record.id, file, isSensitive, sensitiveNote);
      showToast('Bagage ajouté.', 'success');
      await loadItems(record.id);
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || "Échec de l'envoi de la photo.", 'error');
    } finally {
      setSubmittingId(null);
    }
  }

  async function handleDeleteItem(record, item) {
    if (!window.confirm('Supprimer ce bagage ?')) return;
    try {
      await luggageApi.deleteLuggageItem(item.id);
      await loadItems(record.id);
      reload();
    } catch (err) {
      showToast(err.response?.data?.error || 'Suppression impossible.', 'error');
    }
  }

  return (
    <div>
      <PageHeader
        title="Bagages"
        description="Nombre de bagages de chaque DUT1, avec photo et signalement des objets sensibles."
      />

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList className="h-11 p-1">
          <TabsTrigger value="todo" className="px-3 text-sm">
            À traiter
          </TabsTrigger>
          <TabsTrigger value="recent" className="px-3 text-sm">
            Récents
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'recent' && <RecentLuggageTab />}

      {tab === 'todo' && (
        <>
          <Input
            icon={Search}
            placeholder="Rechercher un nom…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4"
          />

          {loading && <CardListSkeleton />}
          {error && <ErrorState label={error} onRetry={reload} />}
          {!loading && !error && filtered.length === 0 && <EmptyState label="Tous les bagages sont à jour." />}

          <div className="flex flex-col gap-3">
            {filtered.map((record, i) => {
              const expanded = expandedId === record.id;
              const items = itemsByDut1[record.id];
              const hasCount = record.luggage_count !== null && record.luggage_count !== undefined;

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
                          <Badge variant={record.room_label ? 'success' : 'warning'}>
                            {record.room_label ? `Chambre ${record.room_label}` : 'Sans chambre'}
                          </Badge>
                          <Badge variant={hasCount && record.luggage_items_count > 0 ? 'neutral' : 'warning'}>
                            <LuggageIcon className="mr-1 inline h-3 w-3" />
                            {record.luggage_items_count}
                            {hasCount ? `/${record.luggage_count}` : ''} bagage{record.luggage_items_count > 1 ? 's' : ''}
                          </Badge>
                          {record.luggage_sensitive_count > 0 && (
                            <Badge variant="warning">
                              <ShieldAlert className="mr-1 inline h-3 w-3" />
                              {record.luggage_sensitive_count} sensible{record.luggage_sensitive_count > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        {hasCount && (
                          <Progress
                            value={Math.min((record.luggage_items_count / Math.max(record.luggage_count, 1)) * 100, 100)}
                            className="mt-2 h-1.5 w-40"
                          />
                        )}
                      </div>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {expanded && (
                      <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4" onClick={(e) => e.stopPropagation()}>
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="font-medium text-foreground">Nombre de bagages déclaré</span>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="0"
                              value={countDraft}
                              onChange={(e) => setCountDraft(e.target.value)}
                              onBlur={() => handleSaveCount(record)}
                              placeholder="Ex : 3"
                              className="min-h-[44px] w-28 rounded-lg border border-border bg-card px-3 py-2 text-base text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        </label>

                        {items === undefined && <p className="text-sm text-muted-foreground">Chargement des bagages…</p>}
                        {items && items.length > 0 && (
                          <div>
                            <p className="mb-2 text-sm font-medium text-foreground">Bagages photographiés</p>
                            <div className="flex flex-wrap gap-2">
                              {items.map((item, idx) => (
                                <LuggageItemThumb
                                  key={item.id}
                                  item={item}
                                  index={idx}
                                  onDelete={() => handleDeleteItem(record, item)}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        <PhotoCapture
                          submitting={submittingId === record.id}
                          onCapture={(file, isSensitive, sensitiveNote) => handleCapture(record, file, isSensitive, sensitiveNote)}
                        />
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
