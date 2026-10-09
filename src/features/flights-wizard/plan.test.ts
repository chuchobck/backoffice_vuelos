import { describe, expect, it } from 'vitest';
import { ECUADOR_ZONE, GALAPAGOS_ZONE } from '@/shared/lib/dates';
import { EMPTY_PRICES } from '@/shared/lib/farePrices';
import { buildPlan, flightNumberOf, wizardDates } from './plan';
import { initialWizardState, type WizardState } from './types';

const zoneOf = (code: string) => (code === 'GPS' || code === 'SCY' ? GALAPAGOS_ZONE : ECUADOR_ZONE);

function state(extra: Partial<WizardState> = {}): WizardState {
  return {
    ...initialWizardState(),
    origin: 'GYE',
    destination: 'GPS',
    airline: 'LA',
    model: '320',
    seatMap: { id: 'sm-1', name: 'LATAM A320', cabins: [{ cabinClass: 'ECONOMY', seats: 150 }, { cabinClass: 'BUSINESS', seats: 12 }] },
    number: '2499',
    startDate: '2026-11-02',
    depTime: '08:00',
    arrTime: '08:55',
    cabins: { ECONOMY: { on: true, seats: '120' }, BUSINESS: { on: false, seats: '12' } },
    families: {
      'fam-basic': { ...EMPTY_PRICES, adultBase: '190.00', adultTaxes: '38.00', childBase: '150.00', childTaxes: '30.00', on: true, extraBag: '25.00', changeFee: '' },
      'fam-biz': { ...EMPTY_PRICES, adultBase: '500.00', adultTaxes: '100.00', on: true, extraBag: '25.00', changeFee: '60.00' },
      'fam-off': { ...EMPTY_PRICES, on: false, extraBag: '25.00', changeFee: '' },
    },
    familyMeta: {
      'fam-basic': { name: 'Basic', code: 'BASIC', cabinClass: 'ECONOMY', changeable: false, checkedBags: 0 },
      'fam-biz': { name: 'Business Flex', code: 'BUSINESS_FLEX', cabinClass: 'BUSINESS', changeable: true, checkedBags: 2 },
      'fam-off': { name: 'Flex', code: 'FLEX', cabinClass: 'ECONOMY', changeable: true, checkedBags: 2 },
    },
    ...extra,
  };
}

describe('fechas de salida', () => {
  it('sin fecha final es una sola salida', () => {
    expect(wizardDates({ startDate: '2026-11-02', endDate: '', days: [true, true, true, true, true, true, true] })).toEqual(['2026-11-02']);
  });

  it('con fecha final repite solo los días marcados (lunes y miércoles)', () => {
    const days = [false, true, false, true, false, false, false];
    expect(wizardDates({ startDate: '2026-11-02', endDate: '2026-11-15', days })).toEqual(['2026-11-02', '2026-11-04', '2026-11-09', '2026-11-11']);
  });

  it('sin fecha de inicio no hay salidas', () => {
    expect(wizardDates({ startDate: '', endDate: '', days: [] })).toEqual([]);
  });
});

describe('plan de creación', () => {
  it('el número de vuelo es aerolínea + número, o el existente elegido', () => {
    expect(flightNumberOf(state())).toBe('LA2499');
    expect(flightNumberOf(state({ flightMode: 'existing', existingFlight: 'LA2410' }))).toBe('LA2410');
  });

  it('crea el número de vuelo solo si es nuevo', () => {
    expect(buildPlan(state(), zoneOf).flightToCreate).toEqual({ marketingCarrier: 'LA', number: '2499', origin: 'GYE', destination: 'GPS' });
    expect(buildPlan(state({ flightMode: 'existing', existingFlight: 'LA2410' }), zoneOf).flightToCreate).toBeNull();
  });

  it('manda las horas en UTC: salida con la zona del origen y llegada con la del destino (Galápagos UTC−6)', () => {
    const plan = buildPlan(state(), zoneOf);
    expect(plan.departures).toHaveLength(1);
    expect(plan.departures[0]!.body).toMatchObject({
      flightNumber: 'LA2499',
      seatMapId: 'sm-1',
      scheduledDeparture: '2026-11-02T13:00:00Z',
      scheduledArrival: '2026-11-02T14:55:00Z',
    });
  });

  it('una llegada "+1 día" cae el día siguiente en el destino', () => {
    const plan = buildPlan(state({ depTime: '23:30', arrTime: '00:40', arrPlus: '1', destination: 'UIO' }), zoneOf);
    expect(plan.departures[0]!.body.scheduledDeparture).toBe('2026-11-03T04:30:00Z');
    expect(plan.departures[0]!.body.scheduledArrival).toBe('2026-11-03T05:40:00Z');
  });

  it('solo incluye las cabinas activas y las familias activas de cabinas activas', () => {
    const plan = buildPlan(state(), zoneOf);
    expect(plan.cabins).toEqual([{ cabinClass: 'ECONOMY', totalSeats: 120 }]);
    expect(plan.fares.map((f) => f.code)).toEqual(['BASIC']);
  });

  it('arma los precios con los pares completos y omite changeFee vacío', () => {
    const [fare] = buildPlan(state(), zoneOf).fares;
    expect(fare!.body).toEqual({
      fareFamilyId: 'fam-basic',
      currency: 'USD',
      extraBagPrice: '25.00',
      prices: [
        { passengerType: 'ADULT', baseFare: '190.00', taxes: '38.00' },
        { passengerType: 'CHILD', baseFare: '150.00', taxes: '30.00' },
      ],
    });
  });

  it('una terminal opcional vacía no se manda', () => {
    expect(buildPlan(state(), zoneOf).departures[0]!.body).not.toHaveProperty('departureTerminal');
    expect(buildPlan(state({ depTerminal: 'B' }), zoneOf).departures[0]!.body.departureTerminal).toBe('B');
  });
});
