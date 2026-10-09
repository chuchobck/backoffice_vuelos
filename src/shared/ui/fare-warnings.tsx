import { AlertTriangle } from 'lucide-react';
import { es, fmt } from '@/shared/i18n';
import type { FareWarning } from '@/shared/lib/fareChecks';
import { fromCents } from '@/shared/lib/money';
import { cabinLabel } from '@/shared/lib/labels';

const t = es.fareChecks;

export function fareWarningText(w: FareWarning, currency = 'USD'): string {
  const money = (cents: number) => `${fromCents(cents)} ${currency}`;
  switch (w.kind) {
    case 'zero':
      return fmt(t.zero, { name: w.name });
    case 'high':
    case 'low':
      return fmt(t[w.kind], {
        name: w.name,
        amount: money(w.amountCents),
        scope: w.galapagos ? t.scopeGalapagos : t.scopeMainland,
        min: money(w.range.minCents),
        max: money(w.range.maxCents),
      });
    case 'duplicate':
      return fmt(t.duplicate, { cabin: cabinLabel(w.cabin).toLowerCase(), amount: money(w.amountCents), names: w.names.join(', ') });
  }
}

/**
 * Avisos de tarifa (no bloquean). Se anuncian de forma cortés (role="status"): el usuario puede
 * guardar igual.
 */
export function FareWarningList({ warnings, currency }: { warnings: FareWarning[]; currency?: string }) {
  if (warnings.length === 0) return null;
  return (
    <div role="status" className="flex gap-3 rounded border-2 border-l-8 border-warning bg-warning-tint p-4 text-foreground">
      <AlertTriangle aria-hidden="true" className="size-6 shrink-0 text-warning" />
      <div className="flex flex-col gap-2">
        <p className="font-bold">{t.title}</p>
        <ul className="flex list-disc flex-col gap-1 pl-6">
          {warnings.map((w, i) => (
            <li key={`${w.kind}-${i}`}>{fareWarningText(w, currency)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
