import { es } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import type { AuditEvent } from '@/shared/api';
import { diffEvent, formatValue, type DiffStatus } from './diff';

const t = es.audit;

const STATUS_LABEL: Record<DiffStatus, string> = { changed: t.diffChanged, added: t.diffAdded, removed: t.diffRemoved, same: t.diffSame };
const STATUS_STYLE: Record<DiffStatus, string> = {
  changed: 'bg-warning-tint',
  added: 'bg-success-tint',
  removed: 'bg-error-tint',
  same: '',
};

function Value({ present, value }: { present: boolean; value: unknown }) {
  if (!present) return <span className="text-muted">{t.empty}</span>;
  return <code className="break-all font-mono text-xs">{formatValue(value)}</code>;
}

/**
 * Diferencia legible entre `before` y `after`. El estado de cada campo va en texto (no solo en color) y los valores
 * censurados por la API se muestran como llegan: "[REDACTED]".
 */
export function AuditDiff({ event, id }: { event: AuditEvent; id: string }) {
  const rows = diffEvent(event);
  return (
    <section id={id} aria-label={t.changesTitle.replace('{id}', event.id)} className="flex flex-col gap-2">
      {rows.length === 0 ? (
        <p className="text-muted">{t.diffNone}</p>
      ) : (
        <div className="relative overflow-x-auto rounded border border-border bg-surface">
          <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
            <caption className="sr-only">{t.changesTitle.replace('{id}', event.id)}</caption>
            <thead>
              <tr className="bg-primary-tint">
                <th scope="col" className="px-3 py-2">{t.diffColumns.field}</th>
                <th scope="col" className="px-3 py-2">{t.diffColumns.before}</th>
                <th scope="col" className="px-3 py-2">{t.diffColumns.after}</th>
                <th scope="col" className="px-3 py-2">{es.common.state}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.field} className={cn('border-t border-border align-top', STATUS_STYLE[row.status])}>
                  <th scope="row" className="px-3 py-2 font-mono text-xs font-bold">{row.field}</th>
                  <td className="px-3 py-2"><Value present={row.hasBefore} value={row.before} /></td>
                  <td className="px-3 py-2"><Value present={row.hasAfter} value={row.after} /></td>
                  <td className="px-3 py-2 font-bold">{STATUS_LABEL[row.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted">{t.redactedNote}</p>
    </section>
  );
}
