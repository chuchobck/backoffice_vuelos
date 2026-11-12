import { CheckCircle2, XCircle } from 'lucide-react';
import type { BoardingScanResult } from '@/shared/api';
import { es } from '@/shared/i18n';
import { ResultFact as Fact } from './ResultFact';

const t = es.boarding.result;

/**
 * Resultado del último escaneo, grande y claro. Éxito en `role="status"` (siempre presente, así se anuncia al llenarse) y
 * error en `role="alert"`; los dos con icono y texto. `data` trae el nombre: solo se pinta aquí, nunca se guarda.
 */
export function ScanResult({ data, error }: { data: BoardingScanResult | undefined; error: string | null }) {
  return (
    <div className="flex flex-col gap-4">
      <div role="status" aria-label={es.boarding.scan.resultRegion}>
        {data ? (
          <div className="flex flex-col gap-4 rounded border-4 border-success bg-success-tint p-6">
            <p className="flex items-center gap-3 text-3xl font-bold">
              <CheckCircle2 aria-hidden="true" className="size-12 shrink-0 text-success" />
              {t.boarded}
            </p>
            <dl className="flex flex-col gap-3">
              <div className="flex flex-col">
                <dt className="text-sm font-bold">{t.passenger}</dt>
                <dd className="text-3xl font-bold [overflow-wrap:anywhere]">{data.passenger.firstName} {data.passenger.lastName}</dd>
              </div>
              {data.infants.map((infant) => (
                <div key={infant.passengerId} className="flex flex-col">
                  <dt className="text-sm font-bold">{t.infants}</dt>
                  <dd className="text-2xl font-bold [overflow-wrap:anywhere]">{infant.firstName} {infant.lastName}</dd>
                </div>
              ))}
            </dl>
            <dl className="flex flex-wrap gap-x-10 gap-y-3">
              <Fact label={t.seat} value={data.seat} />
              <Fact label={t.group} value={data.boardingGroup ?? t.noValue} />
              <Fact label={t.position} value={data.boardingPosition ?? t.noValue} />
              <Fact label={t.flight} value={data.flightNumber} />
            </dl>
            <p className="text-sm">{t.privacy}</p>
          </div>
        ) : null}
      </div>
      {error ? (
        <div role="alert" className="flex items-start gap-4 rounded border-4 border-error bg-error-tint p-6">
          <XCircle aria-hidden="true" className="size-12 shrink-0 text-error" />
          <div className="flex flex-col gap-1">
            <p className="text-3xl font-bold">{t.errorTitle}</p>
            <p className="text-xl">{error}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
