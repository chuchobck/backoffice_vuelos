/**
 * Dinero: la API lo manda y recibe como TEXTO ("94.38"). Para comparar o sumar se usan centavos
 * enteros; nunca flotantes.
 */
export const MONEY_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;

export function isValidMoney(value: string): boolean {
  return MONEY_PATTERN.test(value);
}

/** "94.38" → 9438. Devuelve null si no es un monto válido. */
export function toCents(value: string): number | null {
  if (!isValidMoney(value)) return null;
  const [whole = '0', frac = ''] = value.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
}

/** 9438 → "94.38". */
export function fromCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** Suma dos montos en texto sin errores de coma flotante. Null si alguno no es válido. */
export function addMoney(a: string, b: string): string | null {
  const x = toCents(a);
  const y = toCents(b);
  return x === null || y === null ? null : fromCents(x + y);
}

/** Presentación: "USD 94.38" o "$94.38" para dólares. */
export function formatMoney(amount: string, currency = 'USD'): string {
  return currency === 'USD' ? `$${amount}` : `${amount} ${currency}`;
}
