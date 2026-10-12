import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ECUADOR_ZONE, formatLocal } from '@/shared/lib/dates';
import { useAuditLog, type AuditEvent, type AuditOperation } from '@/shared/api';
import { ResourceFilters, type FilterSpec } from '@/shared/crud';
import { es, fmt } from '@/shared/i18n';
import { Badge, Button, DataTable, EmptyState, ErrorState, type Column } from '@/shared/ui';
import { AuditDiff } from './AuditDiff';

const t = es.audit;

const OPERATION_TONE: Record<AuditOperation, 'success' | 'warning' | 'error'> = { INSERT: 'success', UPDATE: 'warning', DELETE: 'error' };

const FILTERS: FilterSpec[] = [
  { name: 'table', label: t.filters.table, kind: 'text', maxLength: 63, pattern: /^[a-z_]+$/, patternMessage: t.tableInvalid, placeholder: 'aerolinea' },
  {
    name: 'operation',
    label: t.filters.operation,
    kind: 'select',
    options: (Object.keys(t.operations) as AuditOperation[]).map((o) => ({ value: o, label: t.operations[o] })),
  },
  { name: 'userId', label: t.filters.userId, kind: 'text', maxLength: 100, pattern: /^\S+$/, patternMessage: es.validation.required },
  { name: 'recordId', label: t.filters.recordId, kind: 'text', maxLength: 100, pattern: /^\S+$/, patternMessage: es.validation.required },
  { name: 'from', label: t.filters.from, kind: 'date' },
  { name: 'to', label: t.filters.to, kind: 'date' },
];

/** Registro de auditoría (solo lectura): filtros, tabla, fila expandible con el diff y "Cargar más" por cursor. */
export function AuditScreen() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<Set<string>>(new Set());
  const query = useAuditLog(filters);
  const events = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);

  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const columns: Column<AuditEvent>[] = [
    { id: 'when', header: t.cols.when, cell: (e) => <time dateTime={e.occurredAt}>{formatLocal(e.occurredAt, ECUADOR_ZONE)}</time>, className: 'whitespace-nowrap' },
    { id: 'table', header: t.cols.table, cell: (e) => <span className="font-mono">{e.table}</span> },
    { id: 'operation', header: t.cols.operation, cell: (e) => <Badge tone={OPERATION_TONE[e.operation]}>{t.operations[e.operation]}</Badge> },
    { id: 'record', header: t.cols.record, cell: (e) => <span className="font-mono break-all">{e.recordId}</span> },
    {
      id: 'user',
      header: t.cols.user,
      cell: (e) => (e.userId ? <span className="font-mono text-xs break-all">{e.userId}</span> : <span className="text-muted">{t.system}</span>),
    },
    { id: 'ip', header: t.cols.ip, cell: (e) => <span className="font-mono">{e.ipAddress ?? es.common.dash}</span> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <ResourceFilters filters={FILTERS} applied={filters} onApply={(values) => { setFilters(values); setOpen(new Set()); }} />

      <p className="text-sm text-muted" role="status">
        {query.isSuccess ? fmt(t.loadedInfo, { count: events.length }) : ''}
      </p>

      {query.error && !query.data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.isSuccess && events.length === 0 ? (
        <EmptyState title={t.emptyTitle} text={t.emptyText} />
      ) : (
        <>
          <DataTable
            caption={t.tableCaption}
            columns={columns}
            rows={events}
            getRowId={(e) => e.id}
            loading={query.isLoading}
            actions={(e) => {
              const expanded = open.has(e.id);
              return (
                <Button
                  size="sm"
                  variant="secondary"
                  aria-expanded={expanded}
                  aria-controls={expanded ? `audit-diff-${e.id}` : undefined}
                  aria-label={fmt(expanded ? t.collapseAria : t.expandAria, { id: e.id, operation: t.operations[e.operation], table: e.table })}
                  onClick={() => toggle(e.id)}
                >
                  {expanded ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
                  {expanded ? t.collapse : t.expand}
                </Button>
              );
            }}
            expanded={(e) => (open.has(e.id) ? <AuditDiff event={e} id={`audit-diff-${e.id}`} /> : null)}
          />
          {query.error ? <ErrorState error={query.error} onRetry={() => void query.fetchNextPage()} /> : null}
          <div className="flex flex-wrap items-center gap-4">
            {query.hasNextPage ? (
              <Button variant="secondary" onClick={() => void query.fetchNextPage()} loading={query.isFetchingNextPage} loadingText={es.a11y.loading}>
                {es.common.loadMore}
              </Button>
            ) : query.isSuccess ? (
              <p className="text-sm text-muted">{t.end}</p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
