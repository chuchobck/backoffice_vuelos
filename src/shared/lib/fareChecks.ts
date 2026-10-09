/**
 * Avisos de cordura para tarifas (NO bloquean): atrapan errores de digitación como una tarifa de
 * 4128.00 en un vuelo nacional. Los rangos son los de los vuelos domésticos de Ecuador en dólares
 * (continente: aprox. $15 a $250; Galápagos: aprox. $150 a $700) con un margen amplio.
 */
export interface FareRange {
  minCents: number;
  maxCents: number;
}

export const MAINLAND_RANGE: FareRange = { minCents: 1000, maxCents: 35000 };
export const GALAPAGOS_RANGE: FareRange = { minCents: 8000, maxCents: 90000 };

export type FareWarning =
  | { kind: 'zero'; name: string }
  | { kind: 'high' | 'low'; name: string; amountCents: number; range: FareRange; galapagos: boolean }
  | { kind: 'duplicate'; cabin: string; amountCents: number; names: string[] };

export interface FareCheckInput {
  /** Total del adulto (tarifa base + impuestos) en centavos; null si faltan montos válidos. */
  adultTotalCents: number | null;
  currency: string;
  /** Vuelo a o desde Galápagos (cuesta más). */
  galapagos: boolean;
  cabin: string;
  /** Nombre de esta familia (para el mensaje de duplicados). */
  name: string;
  /** Las demás familias de la MISMA cabina y la misma salida, con su total de adulto. */
  peers: { name: string; adultTotalCents: number }[];
}

export function checkFare(input: FareCheckInput): FareWarning[] {
  const out: FareWarning[] = [];
  const total = input.adultTotalCents;
  if (total === null) return out;
  if (total === 0) out.push({ kind: 'zero', name: input.name });
  // Solo en dólares: con otra moneda no hay referencia de rango.
  if (total > 0 && input.currency.toUpperCase() === 'USD') {
    const range = input.galapagos ? GALAPAGOS_RANGE : MAINLAND_RANGE;
    if (total > range.maxCents) out.push({ kind: 'high', name: input.name, amountCents: total, range, galapagos: input.galapagos });
    if (total < range.minCents) out.push({ kind: 'low', name: input.name, amountCents: total, range, galapagos: input.galapagos });
  }
  const same = input.peers.filter((p) => p.adultTotalCents === total);
  if (same.length > 0) out.push({ kind: 'duplicate', cabin: input.cabin, amountCents: total, names: [input.name, ...same.map((p) => p.name)] });
  return out;
}

/** Avisos entre varias familias de una misma cabina (el asistente las ve todas juntas). */
export function checkCabinDuplicates(cabin: string, families: { name: string; adultTotalCents: number | null }[]): FareWarning[] {
  const byTotal = new Map<number, string[]>();
  for (const f of families) {
    if (f.adultTotalCents === null) continue;
    byTotal.set(f.adultTotalCents, [...(byTotal.get(f.adultTotalCents) ?? []), f.name]);
  }
  return [...byTotal.entries()].filter(([, names]) => names.length > 1).map(([amountCents, names]) => ({ kind: 'duplicate' as const, cabin, amountCents, names }));
}
