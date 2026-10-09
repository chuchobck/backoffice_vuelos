import { useMemo } from 'react';
import { useAirportZones, useAllItems, useDetail, type Departure, type Fare } from '@/shared/api';
import { GALAPAGOS_ZONE } from '@/shared/lib/dates';
import { addMoney, toCents } from '@/shared/lib/money';
import { checkFare } from '@/shared/lib/fareChecks';
import { FareWarningList } from '@/shared/ui';

/**
 * Avisos (no bloquean) al crear o editar una tarifa: total del adulto fuera de rango para un vuelo
 * nacional (p. ej. 4128.00 por un error de digitación) y familias de la misma cabina con el mismo precio.
 */
export function FareWarnings({ values, fare, departure }: { values: Record<string, string>; fare?: Fare; departure?: Departure; familyId?: string }) {
  const { zoneOf } = useAirportZones();
  // Al editar, la salida se pide aparte; al crear, ya viene elegida.
  const fetched = useDetail('departures', fare?.departureId);
  const dep = departure ?? fetched.data;
  const departureId = fare?.departureId ?? departure?.id;
  const siblings = useAllItems('fares', { departureId }, !!departureId);
  const families = useAllItems('fareFamilies', undefined, !fare && !!departureId);

  const warnings = useMemo(() => {
    const total = addMoney((values.adultBase ?? '').trim(), (values.adultTaxes ?? '').trim());
    const cabin = fare?.cabinClass ?? families.data?.items.find((f) => f.id === values.fareFamilyId)?.cabinClass;
    const name = fare?.fareBrand ?? families.data?.items.find((f) => f.id === values.fareFamilyId)?.code ?? '';
    if (total === null || !cabin) return [];
    const galapagos = !!dep && (zoneOf(dep.origin) === GALAPAGOS_ZONE || zoneOf(dep.destination) === GALAPAGOS_ZONE);
    const peers = (siblings.data?.items ?? [])
      .filter((f) => f.cabinClass === cabin && f.id !== fare?.id && f.active)
      .map((f) => ({ name: f.fareBrand, cents: toCents(f.prices.find((p) => p.passengerType === 'ADULT')?.total ?? '') }))
      .flatMap((p) => (p.cents === null ? [] : [{ name: p.name, adultTotalCents: p.cents }]));
    return checkFare({ adultTotalCents: toCents(total), currency: fare?.currency ?? (values.currency ?? 'USD'), galapagos, cabin, name, peers });
  }, [values, fare, dep, zoneOf, siblings.data, families.data]);

  return <FareWarningList warnings={warnings} currency={fare?.currency ?? values.currency ?? 'USD'} />;
}
