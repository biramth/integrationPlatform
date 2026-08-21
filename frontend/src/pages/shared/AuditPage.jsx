import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import * as auditApi from '../../api/auditApi';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import { ErrorState } from '../../components/common/StateViews';
import { CardListSkeleton } from '../../components/common/Skeleton';
import AuditFilters from '../../components/audit/AuditFilters';
import AuditLogFeed from '../../components/audit/AuditLogFeed';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../utils/roles';

const PAGE_SIZE = 25;

// Vue chef de commission : scopée côté serveur à sa propre commission (domaine
// de la ressource touchée, pas seulement les actions de ses propres agents —
// cf. auditController.listAuditLogs). Pas de filtre "commission" ici, il
// serait de toute façon ignoré par le backend.
export default function AuditPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({ page: 1 });

  const { data, loading, error, reload } = useFetch(
    () => auditApi.listAuditLogs({ ...filters, pageSize: PAGE_SIZE }),
    [
      filters.page,
      filters.action,
      filters.resourceType,
      filters.success,
      filters.from,
      filters.to,
      filters.search,
    ]
  );

  return (
    <div>
      <PageHeader
        title="Journal d'audit"
        description={`Actions enregistrées sur le périmètre de la ${ROLE_LABELS[user.role]}.`}
      />

      <AuditFilters filters={filters} onChange={setFilters} showCommission={false} />

      {loading && <CardListSkeleton />}
      {error && <ErrorState label={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          <AuditLogFeed logs={data.logs} showCommission={false} />
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
