import type { Fare, PassengerPrice, PassengerType } from '@/shared/api';
import { addMoney } from '@/shared/lib/money';

/** Tipos de pasajero en el orden del formulario. El adulto es obligatorio; los demás, opcionales. */
export const PRICE_KINDS: { type: PassengerType; key: 'adult' | 'youth' | 'child' | 'infant'; required: boolean }[] = [
  { type: 'ADULT', key: 'adult', required: true },
  { type: 'YOUTH', key: 'youth', required: false },
  { type: 'CHILD', key: 'child', required: false },
  { type: 'INFANT', key: 'infant', required: false },
];

export type PriceValues = {
  adultBase: string; adultTaxes: string;
  youthBase: string; youthTaxes: string;
  childBase: string; childTaxes: string;
  infantBase: string; infantTaxes: string;
};

export const EMPTY_PRICES: PriceValues = {
  adultBase: '', adultTaxes: '', youthBase: '', youthTaxes: '', childBase: '', childTaxes: '', infantBase: '', infantTaxes: '',
};

/** Precios del formulario → lista de la API (solo los pares completos). */
export function valuesToPrices(v: PriceValues): PassengerPrice[] {
  const out: PassengerPrice[] = [];
  for (const { type, key } of PRICE_KINDS) {
    const baseFare = v[`${key}Base`].trim();
    const taxes = v[`${key}Taxes`].trim();
    if (baseFare !== '' && taxes !== '') out.push({ passengerType: type, baseFare, taxes });
  }
  return out;
}

/** Precios de una tarifa de la API → valores del formulario. */
export function pricesToValues(fare?: Fare): PriceValues {
  const values = { ...EMPTY_PRICES };
  for (const p of fare?.prices ?? []) {
    const key = PRICE_KINDS.find((k) => k.type === p.passengerType)?.key;
    if (!key) continue;
    values[`${key}Base`] = p.baseFare;
    values[`${key}Taxes`] = p.taxes;
  }
  return values;
}

/** Total del adulto ("94.38") o null si faltan montos válidos. */
export function adultTotal(prices: Pick<PriceValues, 'adultBase' | 'adultTaxes'>): string | null {
  return addMoney(prices.adultBase.trim(), prices.adultTaxes.trim());
}

/** ¿Cambiaron los precios respecto a la tarifa guardada? (comparación en centavos, no en texto). */
export function pricesChanged(next: PassengerPrice[], fare: Fare): boolean {
  const key = (p: { passengerType: string; baseFare: string; taxes: string }) => `${p.passengerType}:${Number(p.baseFare).toFixed(2)}:${Number(p.taxes).toFixed(2)}`;
  const a = next.map(key).sort().join('|');
  const b = fare.prices.map(key).sort().join('|');
  return a !== b;
}
