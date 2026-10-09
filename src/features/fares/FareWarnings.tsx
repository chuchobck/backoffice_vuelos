import type { Departure, Fare } from '@/shared/api';

/** Avisos de cordura (no bloquean): se completan en el hito de avisos de tarifa. */
export function FareWarnings(_props: { values: Record<string, string>; fare?: Fare; departure?: Departure; familyId?: string }) {
  return null;
}
