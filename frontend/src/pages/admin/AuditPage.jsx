import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import * as auditApi from '../../api/auditApi';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import { ErrorState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import AuditFilters from '../../components/audit/AuditFilters';
import AuditLogFeed from '../../components/audit/AuditLogFeed';

const PAGE_SIZE = 25;

// Vue IT : toutes les commissions, avec filtre par commission (y compris
// 'global', réservé aux actions comme la réinitialisation de la plateforme).
export default function AdminAuditPage() {
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
      <PageHeader title="Journal d'audit" description="Toutes les commissions, toutes les actions." />

      <AuditFilters filters={filters} onChange={setFilters} showCommission />

      {loading && <CardListSkeleton />}
      {error && <ErrorState label={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          <AuditLogFeed logs={data.logs} showCommission />
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
