import { describe, expect, it } from 'vitest';
import type { BoardingManifest } from '@/shared/api';
import { checkInState } from './checkIn';

const seat = (status: BoardingManifest['seats'][number]['status'], extra: Partial<BoardingManifest['seats'][number]> = {}): BoardingManifest['seats'][number] => ({
  seat: '10A', cabinClass: 'ECONOMY', pnr: 'K7M2QX', passengerId: 'ADU1', status, boardingGroup: null, boardedAt: null, ...extra,
});
const manifest = (...seats: BoardingManifest['seats']) => ({ isPending: false, isError: false, data: { seats } as BoardingManifest });
const ask = (m: Parameters<typeof checkInState>[0]['manifest'], over: Partial<Parameters<typeof checkInState>[0]> = {}) =>
  checkInState({ hasSeat: true, manifest: m, pnr: 'K7M2QX', passengerId: 'ADU1', ...over });

describe('check-in de un pasajero según el manifiesto', () => {
  it('BOARDED → abordó (con la hora), CHECKED_IN → check-in hecho, BOOKED y TICKETED → sin check-in', () => {
    expect(ask(manifest(seat('BOARDED', { boardedAt: '2026-10-20T13:05:00Z' })))).toEqual({ kind: 'boarded', at: '2026-10-20T13:05:00Z' });
    expect(ask(manifest(seat('CHECKED_IN')))).toEqual({ kind: 'checkedIn' });
    expect(ask(manifest(seat('BOOKED')))).toEqual({ kind: 'notCheckedIn' });
    expect(ask(manifest(seat('TICKETED')))).toEqual({ kind: 'notCheckedIn' });
  });

  it('sin asiento asignado no consulta el manifiesto', () => {
    expect(ask(undefined, { hasSeat: false })).toEqual({ kind: 'noSeat' });
  });

  it('busca por PNR y por passengerId a la vez', () => {
    const m = manifest(seat('BOARDED', { pnr: 'OTRO12' }), seat('CHECKED_IN', { passengerId: 'ADU2' }));
    expect(ask(m)).toEqual({ kind: 'unavailable' });
    expect(ask(m, { passengerId: 'ADU2' })).toEqual({ kind: 'checkedIn' });
  });

  it('si la consulta falla, o el pasajero tiene asiento pero el manifiesto no trae su fila, no se adivina: no disponible', () => {
    expect(ask({ isPending: false, isError: true })).toEqual({ kind: 'unavailable' });
    expect(ask(undefined)).toEqual({ kind: 'unavailable' });
    expect(ask(manifest())).toEqual({ kind: 'unavailable' });
  });

  it('mientras carga, cargando', () => {
    expect(ask({ isPending: true, isError: false })).toEqual({ kind: 'loading' });
  });
});
