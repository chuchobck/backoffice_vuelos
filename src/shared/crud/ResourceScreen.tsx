import { Eye, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { FieldValues } from 'react-hook-form';
import {
  ALL_PAGES_CAP, errorMessage, useAllPages, useDeactivateMutation, useList, useReactivateMutation, type ItemOf, type ResourceName,
} from '@/shared/api';
import { es, fmt } from '@/shared/i18n';
import { Button, Checkbox, ConfirmDialog, DataTable, EmptyState, ErrorState, Field, Input, nextSort, Select, sortRows, toast, type SortState } from '@/shared/ui';
import { ResourceDetailDialog } from './ResourceDetailDialog';
import { ResourceFilters } from './ResourceFilters';
import { ResourceFormDialog } from './ResourceFormDialog';
import { ResourcePager } from './ResourcePager';
import type { ResourceConfig } from './types';

const PAGE_SIZES = [10, 25, 50];

/** Texto sin mayúsculas ni tildes, para que "quito" encuentre "Quito" y "cordoba" encuentre "Córdoba". */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Pantalla de un recurso de /admin: tabla accesible con búsqueda, filtros, paginación por cursor,
 * ordenar por columna, "buscar en todas las páginas", crear, editar, detalle, baja lógica con
 * confirmación y reactivación. Cada módulo de `features` solo aporta su configuración.
 */
export function ResourceScreen<N extends ResourceName, V extends FieldValues = FieldValues>({ config }: { config: ResourceConfig<N, V> }) {
  type Item = ItemOf<N>;
  const [filters, setFilters] = useState<Record<string, string>>(config.initialFilters ?? {});
  const [inactive, setInactive] = useState(false);
  const [allMode, setAllMode] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState | null>(null);
  const [form, setForm] = useState<{ open: boolean; item?: Item }>({ open: false });
  const [detailItem, setDetailItem] = useState<Item | null>(null);
  const [target, setTarget] = useState<Item | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const base = { includeInactive: inactive, filters };
  const serverQuery = useList(config.resource, { ...base, limit: pageSize, cursor: cursors[page] }, !allMode);
  const allQuery = useAllPages(config.resource, base, allMode);
  const active = allMode ? allQuery : serverQuery;
  const deactivate = useDeactivateMutation(config.resource, config.invalidates);
  const reactivate = useReactivateMutation(config.resource, config.invalidates);

  const resetPaging = () => {
    setCursors([undefined]);
    setPage(0);
  };

  const raw = useMemo<Item[]>(() => (allMode ? (allQuery.data?.items as Item[] | undefined) : (serverQuery.data?.items as Item[] | undefined)) ?? [], [allMode, allQuery.data, serverQuery.data]);
  const needle = normalizeText(search.trim());
  const filtered = useMemo(() => {
    if (!needle) return raw;
    return raw.filter((item) => normalizeText(config.searchText ? config.searchText(item) : Object.values(item as object).map(String).join(' ')).includes(needle));
  }, [raw, needle, config]);
  const sorted = useMemo(() => sortRows(filtered, config.columns, sort), [filtered, config.columns, sort]);
  const totalPages = allMode ? Math.max(1, Math.ceil(sorted.length / pageSize)) : undefined;
  const shown = allMode ? sorted.slice(page * pageSize, (page + 1) * pageSize) : sorted;
  const hasNext = allMode ? page + 1 < (totalPages ?? 1) : !!serverQuery.data?.nextCursor;

  const loading = active.isLoading;
  const hasFilters = Object.keys(filters).length > 0 || needle !== '';
  const label = config.deactivation;

  const onConfirmDeactivate = async () => {
    if (!target) return;
    setDeactivateError(null);
    try {
      await deactivate.mutateAsync(config.idOf(target));
      toast({ title: es.common.deactivated, variant: 'success' });
      setTarget(null);
    } catch (error) {
      setDeactivateError(errorMessage(error));
    }
  };

  const onReactivate = async (item: Item) => {
    try {
      await reactivate.mutateAsync(config.idOf(item));
      toast({ title: es.common.reactivated, variant: 'success' });
    } catch (error) {
      toast({ title: errorMessage(error), variant: 'error' });
    }
  };

  const searchHint = allMode ? es.table.searchHintAll : es.table.searchHintPage;
  const allInfo =
    allMode && allQuery.data
      ? fmt(allQuery.data.truncated ? es.table.searchAllTruncated : es.table.searchAllComplete, { count: allQuery.data.items.length, cap: ALL_PAGES_CAP })
      : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-4">
          <Field id="resource-search" label={es.table.searchLabel} hint={searchHint} required className="min-w-60 flex-1">
            <Input
              type="search"
              value={search}
              placeholder={es.table.searchPlaceholder}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPaging();
              }}
            />
          </Field>
          <Checkbox
            label={es.table.searchAll}
            hint={fmt(es.table.searchAllHint, { cap: ALL_PAGES_CAP })}
            checked={allMode}
            onCheckedChange={(v) => {
              setAllMode(v === true);
              resetPaging();
            }}
          />
        </div>
        {config.createLink ? (
          <Button asChild>
            <Link to={config.createLink.to}>
              <Plus aria-hidden="true" />
              {config.createLink.label}
            </Link>
          </Button>
        ) : config.createDialog || (config.form && !config.noCreate) ? (
          <Button onClick={() => setForm({ open: true })}>
            <Plus aria-hidden="true" />
            {fmt(config.feminine ? es.crud.newItemF : es.crud.newItem, { noun: config.noun })}
          </Button>
        ) : null}
      </div>

      {config.filters && config.filters.length > 0 ? (
        <ResourceFilters
          filters={config.filters}
          applied={filters}
          onApply={(values) => {
            setFilters(values);
            resetPaging();
          }}
        />
      ) : null}

      <div className="flex flex-wrap items-end gap-4">
        <Checkbox
          label={es.table.showInactive}
          checked={inactive}
          onCheckedChange={(v) => {
            setInactive(v === true);
            resetPaging();
          }}
        />
        <Field id="resource-page-size" label={es.table.rowsPerPage} required className="w-40">
          <Select
            value={String(pageSize)}
            options={PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              resetPaging();
            }}
          />
        </Field>
      </div>

      <div aria-live="polite" className="text-sm text-muted">
        {allMode && allQuery.isLoading ? es.table.searchAllLoading : allInfo}
      </div>

      {active.error && !active.data ? (
        <ErrorState error={active.error} onRetry={() => void active.refetch()} />
      ) : !loading && raw.length === 0 && !hasFilters ? (
        <EmptyState title={es.table.emptyTitle} text={es.table.emptyText} />
      ) : !loading && shown.length === 0 ? (
        <EmptyState title={es.table.noResultsTitle} text={es.table.noResultsText} />
      ) : (
        <>
          <p className="text-sm text-muted" role="status">
            {fmt(allMode ? es.table.rowsInfoAll : es.table.rowsInfo, { shown: shown.length, total: allMode ? sorted.length : filtered.length })}
          </p>
          <DataTable
            caption={config.title}
            columns={config.columns}
            rows={shown}
            getRowId={config.idOf}
            sort={sort}
            onSort={(id) => setSort((s) => nextSort(s, id))}
            loading={loading}
            isRowMuted={(item) => !config.isActive(item)}
            actions={(item) => {
              const id = config.idOf(item);
              const names = { noun: config.noun, id };
              const isActive = config.isActive(item);
              return (
                <div className="flex flex-wrap gap-1">
                  {config.detail ? (
                    <Button size="sm" variant="ghost" aria-label={fmt(es.crud.viewAria, names)} onClick={() => setDetailItem(item)}>
                      <Eye aria-hidden="true" />
                      {es.crud.view}
                    </Button>
                  ) : null}
                  {config.form || config.editDialog ? (
                    <Button size="sm" variant="secondary" aria-label={fmt(es.crud.editAria, names)} onClick={() => setForm({ open: true, item })}>
                      <Pencil aria-hidden="true" />
                      {es.common.edit}
                    </Button>
                  ) : null}
                  {isActive ? (
                    <Button size="sm" variant="danger-outline" aria-label={fmt(label?.ariaLabel ?? es.crud.deactivateAria, names)} onClick={() => { setDeactivateError(null); setTarget(item); }}>
                      <Trash2 aria-hidden="true" />
                      {label?.label ?? es.crud.deactivate}
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" aria-label={fmt(es.crud.reactivateAria, names)} onClick={() => void onReactivate(item)}>
                      <RotateCcw aria-hidden="true" />
                      {es.crud.reactivate}
                    </Button>
                  )}
                </div>
              );
            }}
          />
          <ResourcePager
            page={page}
            hasNext={hasNext}
            totalPages={totalPages}
            onPrevious={() => setPage((p) => Math.max(0, p - 1))}
            onNext={() => {
              if (allMode) setPage((p) => p + 1);
              else {
                const next = serverQuery.data?.nextCursor;
                if (!next) return;
                setCursors((c) => [...c.slice(0, page + 1), next]);
                setPage((p) => p + 1);
              }
            }}
          />
        </>
      )}
      {config.note ? <p className="text-sm text-muted">{config.note}</p> : null}

      {(() => {
        const Custom = form.item ? config.editDialog : config.createDialog;
        const onOpenChange = (open: boolean) => setForm((f) => ({ ...f, open }));
        return Custom ? (
          <Custom item={form.item} open={form.open} onOpenChange={onOpenChange} onSaved={resetPaging} />
        ) : (
          <ResourceFormDialog config={config} item={form.item} open={form.open} onOpenChange={onOpenChange} onSaved={resetPaging} />
        );
      })()}
      <ResourceDetailDialog config={config as unknown as ResourceConfig<N>} item={detailItem} onClose={() => setDetailItem(null)} />
      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => (open ? undefined : setTarget(null))}
        title={fmt(label?.title ?? es.crud.deactivateTitle, { noun: config.noun, id: target ? config.idOf(target) : '' })}
        description={label?.text ?? es.crud.deactivateText}
        confirmLabel={label?.label ?? es.crud.deactivate}
        cancelLabel={es.crud.keep}
        onConfirm={() => void onConfirmDeactivate()}
        loading={deactivate.isPending}
        destructive
        error={deactivateError}
      />
    </div>
  );
}
