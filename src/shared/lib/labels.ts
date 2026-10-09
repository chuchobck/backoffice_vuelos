import type { CabinClass, DepartureStatus, PassengerType, SeatPosition } from '@/shared/api';
import { es } from '@/shared/i18n';

/** Etiquetas en español de los valores en inglés del contrato. */
export const cabinLabel = (c: CabinClass | string): string => (es.enums.cabin as Record<string, string>)[c] ?? c;
export const statusLabel = (s: DepartureStatus | string): string => (es.enums.status as Record<string, string>)[s] ?? s;
export const passengerLabel = (p: PassengerType | string): string => (es.enums.passenger as Record<string, string>)[p] ?? p;
export const positionLabel = (p: SeatPosition | string): string => (es.enums.position as Record<string, string>)[p] ?? p;
