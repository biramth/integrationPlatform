import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import * as auditApi from '../../api/auditApi';
import PageHeader from '../common/PageHeader';
import Pagination from '../common/Pagination';
import { ErrorState } from '../common/StateViews';
import { CardListSkeleton } from '../common/Skeleton';
import AuditFilters from './AuditFilters';
import AuditLogFeed from './AuditLogFeed';

const PAGE_SIZE = 25;

// Contenu partagé par les deux pages de journal d'audit : vue chef de
// commission (scopée côté serveur à son périmètre, pas de filtre commission)
// et vue IT (toutes les commissions, filtre commission disponible) — mêmes
// composants, seule la portée diffère.
export default function AuditPageView({ description, showCommission }) {
  const [filters, setFilters] = useState({ page: 1 });

  const { data, loading, error, reload } = useFetch(
    () => auditApi.listAuditLogs({ ...filters, pageSize: PAGE_SIZE }),
    [
      filters.page,
      filters.action,
      filters.resourceType,
      filters.commission,
      filters.success,
      filters.from,
      filters.to,
      filters.search,
    ]
  );

  return (
    <div>
      <PageHeader title="Journal d'audit" description={description} />

      <AuditFilters filters={filters} onChange={setFilters} showCommission={showCommission} />

      {loading && <CardListSkeleton />}
      {error && <ErrorState label={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          <AuditLogFeed logs={data.logs} showCommission={showCommission} />
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
          />
        </>
      )}
    </div>
  );
}
