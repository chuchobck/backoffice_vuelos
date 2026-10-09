import type { AdminApi } from '@/shared/api';
import { ApiError, errorMessage } from '@/shared/api';
import { es, fmt } from '@/shared/i18n';
import type { Plan } from './plan';
import type { ExecutionResult } from './types';

const r = es.wizard.run;
const MAX_RETRIES_429 = 3;

/** Un paso de la creación falló: dice cuál (para el mensaje) y conserva el error original. */
export class StepError extends Error {
  constructor(
    readonly step: string,
    readonly original: unknown,
  ) {
    super(step);
    this.name = 'StepError';
  }
  get userMessage(): string {
    return fmt(es.wizard.review.failure, { step: this.step, message: errorMessage(this.original) });
  }
}

export type CreationApi = Pick<AdminApi, 'flightNumbers' | 'departures' | 'fares'>;

export interface ExecuteOptions {
  say: (message: string) => void;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Espera lo que diga Retry-After (máx. 65 s) y reintenta hasta 3 veces ante un 429; cualquier otro error sube. */
async function withRateLimit<T>(call: () => Promise<T>, { say, sleep = defaultSleep }: ExecuteOptions): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await call();
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 429 || attempt >= MAX_RETRIES_429) throw error;
      const seconds = Math.min(Math.max(error.retryAfter ?? 5, 1), 65);
      say(fmt(r.waiting, { seconds }));
      await sleep(seconds * 1000);
    }
  }
}

/** Resultado vacío para un plan nuevo. */
export const emptyResult = (): ExecutionResult => ({ flightCreated: false, departures: [], done: false });

/**
 * Ejecuta el plan en orden: número de vuelo (si es nuevo) → una salida por fecha → las tarifas de cada
 * salida. `result` se va llenando con lo creado; si algo falla a medias, volver a llamar con el mismo
 * `result` crea SOLO lo que falta (nunca duplica).
 */
export async function executePlan(plan: Plan, api: CreationApi, result: ExecutionResult, options: ExecuteOptions): Promise<ExecutionResult> {
  const { say } = options;
  const call = async <T>(step: string, fn: () => Promise<T>): Promise<T> => {
    try {
      return await withRateLimit(fn, options);
    } catch (error) {
      throw new StepError(step, error);
    }
  };

  if (plan.flightToCreate && !result.flightCreated) {
    say(fmt(r.creatingFlight, { flight: plan.flightNumber }));
    await call(fmt(r.stepFlight, { flight: plan.flightNumber }), () => api.flightNumbers.create(plan.flightToCreate!));
    result.flightCreated = true;
    say(fmt(r.flightCreated, { flight: plan.flightNumber }));
  }

  for (let i = 0; i < plan.departures.length; i++) {
    const planned = plan.departures[i]!;
    result.departures[i] ??= { date: planned.date, id: null, fares: {} };
    const slot = result.departures[i]!;

    if (!slot.id) {
      say(fmt(r.creatingDeparture, { date: planned.date }));
      const created = await call(fmt(r.stepDeparture, { date: planned.date }), () => api.departures.create(planned.body));
      slot.id = created.id;
      say(fmt(r.departureCreated, { date: planned.date, id: created.id }));
    }

    for (const fare of plan.fares) {
      if (slot.fares[fare.familyId]) continue;
      say(fmt(r.creatingFare, { code: fare.code, date: planned.date }));
      const created = await call(fmt(r.stepFare, { code: fare.code, date: planned.date }), () => api.fares.create({ departureId: slot.id!, ...fare.body }));
      slot.fares[fare.familyId] = created.id;
    }
    say(fmt(r.faresDone, { count: plan.fares.length, date: planned.date }));
  }

  result.done = true;
  return result;
}
