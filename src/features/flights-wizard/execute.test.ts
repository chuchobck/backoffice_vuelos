import { describe, expect, it, vi } from 'vitest';
import { ApiError, createDemoAdminApi } from '@/shared/api';

import { emptyResult, executePlan, StepError, type CreationApi } from './execute';
import { buildPlan } from './plan';
import { initialWizardState, type WizardState } from './types';
import { EMPTY_PRICES } from '@/shared/lib/farePrices';

const NOW = new Date('2026-10-09T12:00:00Z');

function wizardState(familyIds: { basic: string; classic: string }): WizardState {
  return {
    ...initialWizardState(),
    origin: 'UIO',
    destination: 'GYE',
    airline: 'AV',
    model: '320',
    seatMap: { id: '', name: 'x', cabins: [{ cabinClass: 'ECONOMY', seats: 150 }] },
    number: '1999',
    startDate: '2026-11-02',
    endDate: '2026-11-04',
    depTime: '07:30',
    arrTime: '08:25',
    cabins: { ECONOMY: { on: true, seats: '100' } },
    families: {
      [familyIds.basic]: { ...EMPTY_PRICES, adultBase: '60.00', adultTaxes: '12.00', on: true, extraBag: '15.00', changeFee: '' },
      [familyIds.classic]: { ...EMPTY_PRICES, adultBase: '72.00', adultTaxes: '14.40', on: true, extraBag: '15.00', changeFee: '10.00' },
    },
    familyMeta: {
      [familyIds.basic]: { name: 'Basic', code: 'BASIC', cabinClass: 'ECONOMY', changeable: false, checkedBags: 0 },
      [familyIds.classic]: { name: 'Classic', code: 'CLASSIC', cabinClass: 'ECONOMY', changeable: true, checkedBags: 1 },
    },
  };
}

async function setup() {
  const demo = createDemoAdminApi({ now: () => NOW, latencyMs: 0 });
  const families = (await demo.fareFamilies.list({ limit: 50, filters: { airline: 'AV' } })).items;
  const maps = (await demo.seatMaps.list({ limit: 50, filters: { airline: 'AV', aircraftModel: '320' } })).items;
  const state = wizardState({ basic: families.find((f) => f.code === 'BASIC')!.id, classic: families.find((f) => f.code === 'CLASSIC')!.id });
  state.seatMap = { id: maps[0]!.id, name: maps[0]!.name, cabins: maps[0]!.cabins };
  return { demo, state, plan: buildPlan(state, () => 'America/Guayaquil') };
}

describe('ejecución del asistente (contra la API de demostración)', () => {
  it('crea el número de vuelo, una salida por fecha y las tarifas de cada salida', async () => {
    const { demo, plan } = await setup();
    const say = vi.fn();
    const result = await executePlan(plan, demo, emptyResult(), { say });
    expect(result.done).toBe(true);
    expect(result.flightCreated).toBe(true);
    expect(result.departures).toHaveLength(3);
    expect(result.departures.every((d) => d.id && Object.keys(d.fares).length === 2)).toBe(true);
    const deps = await demo.departures.list({ limit: 50, filters: { flightNumber: 'AV1999' } });
    expect(deps.items).toHaveLength(3);
    const fares = await demo.fares.list({ limit: 50, filters: { departureId: result.departures[0]!.id! } });
    expect(fares.items.map((f) => f.fareBrand).sort()).toEqual(['BASIC', 'CLASSIC']);
    expect(say).toHaveBeenCalled();
  });

  it('si algo falla a medias, al reintentar crea SOLO lo que falta (no duplica)', async () => {
    const { demo, plan } = await setup();
    // La segunda tarifa de la segunda salida falla una vez con un 500.
    let calls = 0;
    const flaky: CreationApi = {
      flightNumbers: demo.flightNumbers,
      departures: demo.departures,
      fares: {
        ...demo.fares,
        create: async (body) => {
          calls++;
          if (calls === 4) throw new ApiError({ status: 500 });
          return demo.fares.create(body);
        },
      },
    };
    const result = emptyResult();
    const first = await executePlan(plan, flaky, result, { say: () => undefined }).catch((e: unknown) => e);
    expect(first).toBeInstanceOf(StepError);
    expect((first as StepError).userMessage).toContain('Tarifa CLASSIC de la salida del 2026-11-03');
    expect(result.done).toBe(false);
    expect(result.flightCreated).toBe(true);

    await executePlan(plan, flaky, result, { say: () => undefined });
    expect(result.done).toBe(true);
    const deps = await demo.departures.list({ limit: 50, filters: { flightNumber: 'AV1999' } });
    expect(deps.items).toHaveLength(3);
    for (const d of result.departures) {
      expect((await demo.fares.list({ limit: 50, filters: { departureId: d.id! } })).items).toHaveLength(2);
    }
  });

  it('ante un 429 espera lo que diga Retry-After y reintenta', async () => {
    const { demo, plan } = await setup();
    let failed = false;
    const sleeps: number[] = [];
    const limited: CreationApi = {
      ...demo,
      departures: {
        ...demo.departures,
        create: async (body) => {
          if (!failed) {
            failed = true;
            throw new ApiError({ status: 429, retryAfter: 7 });
          }
          return demo.departures.create(body);
        },
      },
    };
    const say = vi.fn();
    const result = await executePlan(plan, limited, emptyResult(), { say, sleep: async (ms) => void sleeps.push(ms) });
    expect(sleeps).toEqual([7000]);
    expect(say).toHaveBeenCalledWith(expect.stringContaining('esperando 7 s'));
    expect(result.done).toBe(true);
  });

  it('un 422 (regla de negocio) detiene la creación y dice qué paso falló, sin el detail técnico', async () => {
    const { demo, plan } = await setup();
    const bad = { ...plan, departures: plan.departures.map((d) => ({ ...d, body: { ...d.body, scheduledDeparture: '2020-01-01T10:00:00Z', scheduledArrival: '2020-01-01T11:00:00Z' } })) };
    const error = await executePlan(bad, demo, emptyResult(), { say: () => undefined }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(StepError);
    const text = (error as StepError).userMessage;
    expect(text).toContain('Salida del');
    expect(text).toContain('La salida debe ser en el futuro.');
    expect(text).not.toContain('must be in the future');
  });
});
