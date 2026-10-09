import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { adminApi, useAirportZones, useAllItems } from '@/shared/api';
import { es, fmt } from '@/shared/i18n';
import { formatLocal } from '@/shared/lib/dates';
import { cabinLabel } from '@/shared/lib/labels';
import { addMoney } from '@/shared/lib/money';
import { Alert } from '@/shared/ui';
import { emptyResult, executePlan, StepError } from './execute';
import { buildPlan } from './plan';
import { StepFrame } from './StepFrame';
import type { StepProps } from './StepProps';
import type { ExecutionResult } from './types';

const t = es.wizard.review;
const FARES_ID = 'wz-review-fares';

/**
 * Paso 5: resumen y confirmación. Al confirmar crea, en orden, el número de vuelo (si es nuevo), una
 * salida por fecha y las tarifas de cada salida. Si algo falla a medias, "Reintentar" crea solo lo que falta.
 */
export function StepReview({ state, onBack, onDone }: StepProps & { onDone: (result: ExecutionResult) => void }) {
  const { zoneOf } = useAirportZones();
  const airports = useAllItems('airports');
  const queryClient = useQueryClient();
  const result = useRef<ExecutionResult>(state.result ?? emptyResult());
  const [log, setLog] = useState<string[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const plan = buildPlan(state, zoneOf);
  const airportLabel = (code: string) => {
    const a = airports.data?.items.find((x) => x.code === code);
    return a ? `${code} — ${a.name}` : code;
  };
  const first = plan.departures[0]?.body;
  const retrying = log.length > 0 && failure !== null;

  const confirm = async () => {
    setFailure(null);
    setRunning(true);
    try {
      await executePlan(plan, adminApi, result.current, { say: (m) => setLog((l) => [...l, m]) });
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      onDone(result.current);
    } catch (error) {
      setFailure(error instanceof StepError ? error.userMessage : fmt(t.failureNoStep, { message: es.errors.unknown }));
    } finally {
      setRunning(false);
    }
  };

  const rows: [string, string][] = [
    [t.route, `${airportLabel(state.origin)}  →  ${airportLabel(state.destination)}`],
    [t.flight, fmt(state.flightMode === 'new' ? t.flightNew : t.flightExisting, { flight: plan.flightNumber })],
    [t.airlineModel, `${state.airline} · ${state.model}`],
    [t.seatMap, state.seatMap?.name ?? ''],
    [t.departures, fmt(t.departuresValue, { count: plan.departures.length, dates: `${plan.departures.map((d) => d.date).slice(0, 8).join(', ')}${plan.departures.length > 8 ? '…' : ''}` })],
    [
      t.schedule,
      fmt(t.scheduleValue, { dep: state.depTime, arr: state.arrTime, plus: state.arrPlus === '0' ? '' : ` (+${state.arrPlus})`, origin: state.origin, destination: state.destination }),
    ],
    ...(first
      ? ([[t.firstDeparture, fmt(t.firstDepartureValue, { local: formatLocal(first.scheduledDeparture, zoneOf(state.origin)), utc: first.scheduledDeparture })]] as [string, string][])
      : []),
    [t.cabins, plan.cabins.map((c) => fmt(t.cabinsValue, { cabin: cabinLabel(c.cabinClass), seats: c.totalSeats })).join(' · ')],
  ];

  return (
    <StepFrame step={4} intro={t.intro} summary={[]} summaryRef={null} onBack={running ? undefined : () => onBack({})} nextLabel={retrying ? t.retry : t.confirm} busy={running} onSubmit={(e) => { e.preventDefault(); void confirm(); }}>
      <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[minmax(8rem,max-content)_1fr]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="font-bold text-muted">{label}</dt>
            <dd className="min-w-0 break-words">{value}</dd>
          </div>
        ))}
      </dl>

      <h3 id={FARES_ID} className="text-lg">{t.faresTitle}</h3>
      <div role="region" aria-labelledby={FARES_ID} tabIndex={0} className="overflow-x-auto rounded border-2 border-border">
        <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
          <caption className="sr-only">{fmt(t.faresCaption, { count: plan.fares.length * plan.departures.length })}</caption>
          <thead>
            <tr className="bg-primary-tint">
              {[t.colCabin, t.colFamily, t.colAdultTotal, t.colPassengers, t.colBag].map((h) => (
                <th key={h} scope="col" className="px-3 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plan.fares.map((f) => {
              const adult = f.body.prices[0];
              return (
                <tr key={f.familyId} className="border-t border-border">
                  <td className="px-3 py-2">{cabinLabel(f.cabinClass)}</td>
                  <td className="px-3 py-2">{f.name} ({f.code})</td>
                  <td className="px-3 py-2 tabular-nums">{adult ? addMoney(adult.baseFare, adult.taxes) : ''} {state.currency}</td>
                  <td className="px-3 py-2">{f.body.prices.map((p) => es.enums.passenger[p.passengerType]).join(', ')}</td>
                  <td className="px-3 py-2 tabular-nums">{f.body.extraBagPrice}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted">{fmt(t.faresCaption, { count: plan.fares.length * plan.departures.length })}</p>

      <div aria-live="polite">{failure ? <Alert variant="error" live="assertive"><p>{failure}</p></Alert> : null}</div>
      {log.length > 0 ? (
        <ul aria-label={t.progressLabel} className="flex max-h-60 flex-col gap-1 overflow-y-auto rounded border-2 border-border p-3 text-sm">
          {log.map((line, i) => (
            <li key={`${i}-${line}`}>{line}</li>
          ))}
        </ul>
      ) : null}
    </StepFrame>
  );
}
