import { describe, expect, it } from 'vitest';
import { checkCabinDuplicates, checkFare, GALAPAGOS_RANGE, MAINLAND_RANGE, type FareCheckInput } from './fareChecks';

const base: FareCheckInput = { adultTotalCents: 7392, currency: 'USD', galapagos: false, cabin: 'ECONOMY', name: 'BASIC', peers: [] };

describe('avisos de cordura de tarifas', () => {
  it('un total normal no avisa nada', () => {
    expect(checkFare(base)).toEqual([]);
  });

  it('la tarifa de 4128.00 (error de digitación) en un vuelo nacional avisa que es demasiado alta', () => {
    const w = checkFare({ ...base, adultTotalCents: 412800 });
    expect(w).toEqual([{ kind: 'high', name: 'BASIC', amountCents: 412800, range: MAINLAND_RANGE, galapagos: false }]);
  });

  it('un monto demasiado bajo avisa y cero tiene su propio aviso', () => {
    expect(checkFare({ ...base, adultTotalCents: 50 })[0]).toMatchObject({ kind: 'low' });
    expect(checkFare({ ...base, adultTotalCents: 0 })).toEqual([{ kind: 'zero', name: 'BASIC' }]);
  });

  it('Galápagos tiene otro rango: 600 es normal allá y alto en el continente', () => {
    expect(checkFare({ ...base, adultTotalCents: 60000, galapagos: true })).toEqual([]);
    expect(checkFare({ ...base, adultTotalCents: 60000 })[0]).toMatchObject({ kind: 'high' });
    expect(checkFare({ ...base, adultTotalCents: 95000, galapagos: true })[0]).toMatchObject({ kind: 'high', range: GALAPAGOS_RANGE });
  });

  it('el rango solo aplica a dólares', () => {
    expect(checkFare({ ...base, adultTotalCents: 412800, currency: 'EUR' })).toEqual([]);
  });

  it('avisa si otra familia de la misma cabina cuesta lo mismo', () => {
    const w = checkFare({ ...base, peers: [{ name: 'CLASSIC', adultTotalCents: 7392 }, { name: 'FLEX', adultTotalCents: 9000 }] });
    expect(w).toEqual([{ kind: 'duplicate', cabin: 'ECONOMY', amountCents: 7392, names: ['BASIC', 'CLASSIC'] }]);
  });

  it('sin total válido no avisa', () => {
    expect(checkFare({ ...base, adultTotalCents: null })).toEqual([]);
  });

  it('checkCabinDuplicates agrupa las familias con el mismo precio', () => {
    expect(
      checkCabinDuplicates('ECONOMY', [
        { name: 'BASIC', adultTotalCents: 5000 },
        { name: 'CLASSIC', adultTotalCents: 5000 },
        { name: 'FLEX', adultTotalCents: 8000 },
        { name: 'X', adultTotalCents: null },
      ]),
    ).toEqual([{ kind: 'duplicate', cabin: 'ECONOMY', amountCents: 5000, names: ['BASIC', 'CLASSIC'] }]);
  });
});
