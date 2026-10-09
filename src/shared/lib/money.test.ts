import { describe, expect, it } from 'vitest';
import { addMoney, formatMoney, fromCents, isValidMoney, toCents } from './money';

describe('dinero como texto', () => {
  it('valida montos como "94.38" (hasta 10 enteros y 2 decimales)', () => {
    for (const ok of ['94.38', '0', '35', '35.5', '1234567890.99']) expect(isValidMoney(ok)).toBe(true);
    for (const bad of ['', '-1', '1,5', '94.388', '.5', 'abc', '12345678901', '1e3']) expect(isValidMoney(bad)).toBe(false);
  });

  it('convierte a centavos y de vuelta sin errores de coma flotante', () => {
    expect(toCents('94.38')).toBe(9438);
    expect(toCents('35.5')).toBe(3550);
    expect(toCents('0.1')).toBe(10);
    expect(toCents('x')).toBeNull();
    expect(fromCents(9438)).toBe('94.38');
    expect(fromCents(5)).toBe('0.05');
  });

  it('suma en centavos: 0.1 + 0.2 = 0.30 (no 0.30000000000000004)', () => {
    expect(addMoney('0.1', '0.2')).toBe('0.30');
    expect(addMoney('61.60', '12.32')).toBe('73.92');
    expect(addMoney('1', 'x')).toBeNull();
  });

  it('formatea dólares con $ y otras monedas con su código', () => {
    expect(formatMoney('94.38')).toBe('$94.38');
    expect(formatMoney('94.38', 'EUR')).toBe('94.38 EUR');
  });
});
