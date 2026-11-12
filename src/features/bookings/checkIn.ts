import type { BoardingManifest } from '@/shared/api';

export type CheckInState =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'noSeat' }
  | { kind: 'notCheckedIn' }
  | { kind: 'checkedIn' }
  | { kind: 'boarded'; at: string | null };

interface ManifestQuery {
  isPending: boolean;
  isError: boolean;
  data?: BoardingManifest;
}

/**
 * Check-in de un pasajero en UNA salida de su reserva. El admin no tiene un endpoint de pases por reserva: se busca en el
 * manifiesto de la salida la fila con el mismo `pnr` y `passengerId`. No se adivina: si la consulta falla, o si el pasajero
 * tiene asiento en esa salida pero el manifiesto no trae su fila (p. ej. los `passengerId` no coinciden), es "No disponible".
 */
export function checkInState(input: { hasSeat: boolean; manifest: ManifestQuery | undefined; pnr: string; passengerId: string }): CheckInState {
  if (!input.hasSeat) return { kind: 'noSeat' };
  const { manifest } = input;
  if (!manifest || manifest.isError) return { kind: 'unavailable' };
  if (manifest.isPending || !manifest.data) return { kind: 'loading' };
  const row = manifest.data.seats.find((s) => s.pnr === input.pnr && s.passengerId === input.passengerId);
  if (!row) return { kind: 'unavailable' };
  switch (row.status) {
    case 'BOARDED':
      return { kind: 'boarded', at: row.boardedAt };
    case 'CHECKED_IN':
      return { kind: 'checkedIn' };
    default:
      return { kind: 'notCheckedIn' };
  }
}
