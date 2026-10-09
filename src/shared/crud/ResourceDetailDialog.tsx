import { useDetail, type DetailOf, type ItemOf, type ResourceName } from '@/shared/api';
import { es, fmt } from '@/shared/i18n';
import { Dialog, DialogContent, DialogTitle, ErrorState, LoadingState } from '@/shared/ui';
import type { ResourceConfig } from './types';

function DetailBody<N extends ResourceName>({ config, item }: { config: ResourceConfig<N>; item: ItemOf<N> }) {
  const detail = config.detail!;
  const query = useDetail(config.resource, detail.fetch ? config.idOf(item) : undefined);
  if (detail.fetch && query.isLoading) return <LoadingState label={es.crud.detailLoading} />;
  if (detail.fetch && query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} headingLevel="h3" />;
  const data = (detail.fetch ? query.data : item) as DetailOf<N>;
  return (
    <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[minmax(8rem,max-content)_1fr]">
      {detail.rows(data).map((row) => (
        <div key={row.label} className="contents">
          <dt className="font-bold text-muted">{row.label}</dt>
          <dd className="min-w-0 break-words">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Detalle de un registro (solo lectura). Pide GET /{id} cuando el listado no trae todo (mapas de asientos). */
export function ResourceDetailDialog<N extends ResourceName>({ config, item, onClose }: { config: ResourceConfig<N>; item: ItemOf<N> | null; onClose: () => void }) {
  return (
    <Dialog open={item !== null} onOpenChange={(o) => (o ? undefined : onClose())}>
      <DialogContent aria-describedby={undefined} className="max-w-[40rem]">
        {item ? (
          <>
            <DialogTitle>{fmt(es.crud.detailTitle, { noun: config.noun, id: config.idOf(item) })}</DialogTitle>
            <DetailBody config={config} item={item} />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
