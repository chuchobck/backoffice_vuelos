import { describe, expect, it } from 'vitest';
import {
  addDaysToDate, datetimeLocalToUtc, ECUADOR_ZONE, formatLocal, GALAPAGOS_ZONE, localToUtcIso, todayIn, utcToDatetimeLocal, utcToLocal, weekdayOf, zoneLabel, zoneOffsetMinutes,
} from './dates';

describe('horas: UTC en la API, hora local en pantalla', () => {
  it('Ecuador continental es UTC−5 y Galápagos UTC−6', () => {
    const t = Date.parse('2026-11-02T13:00:00Z');
    expect(zoneOffsetMinutes(t, ECUADOR_ZONE)).toBe(-300);
    expect(zoneOffsetMinutes(t, GALAPAGOS_ZONE)).toBe(-360);
  });

  it('hora local → UTC (y de vuelta)', () => {
    expect(localToUtcIso({ date: '2026-11-02', time: '08:00' }, ECUADOR_ZONE)).toBe('2026-11-02T13:00:00Z');
    expect(localToUtcIso({ date: '2026-11-02', time: '08:55' }, GALAPAGOS_ZONE)).toBe('2026-11-02T14:55:00Z');
    expect(utcToLocal('2026-11-02T13:00:00Z', ECUADOR_ZONE)).toEqual({ date: '2026-11-02', time: '08:00' });
    expect(utcToLocal('2026-11-02T14:55:00Z', GALAPAGOS_ZONE)).toEqual({ date: '2026-11-02', time: '08:55' });
  });

  it('una llegada "+1 día" suma un día de calendario local', () => {
    expect(localToUtcIso({ date: '2026-11-02', time: '01:30' }, ECUADOR_ZONE, 1)).toBe('2026-11-03T06:30:00Z');
  });

  it('cruza la medianoche UTC: 20:00 en Ecuador ya es el día siguiente en UTC', () => {
    expect(localToUtcIso({ date: '2026-11-02', time: '20:00' }, ECUADOR_ZONE)).toBe('2026-11-03T01:00:00Z');
    expect(utcToLocal('2026-11-03T01:00:00Z', ECUADOR_ZONE)).toEqual({ date: '2026-11-02', time: '20:00' });
  });

  it('datetime-local ↔ UTC', () => {
    expect(utcToDatetimeLocal('2026-11-02T13:00:00Z', ECUADOR_ZONE)).toBe('2026-11-02T08:00');
    expect(datetimeLocalToUtc('2026-11-02T08:00', ECUADOR_ZONE)).toBe('2026-11-02T13:00:00Z');
  });

  it('formatea en la zona pedida', () => {
    expect(formatLocal('2026-11-02T13:00:00Z', ECUADOR_ZONE)).toMatch(/2 nov 2026/);
    expect(formatLocal(null, ECUADOR_ZONE)).toBe('—');
    expect(formatLocal('basura', ECUADOR_ZONE)).toBe('—');
  });

  it('etiquetas de zona', () => {
    expect(zoneLabel(GALAPAGOS_ZONE)).toBe('Galápagos (UTC−6)');
    expect(zoneLabel('America/Bogota')).toBe('America/Bogota');
  });

  it('hoy en la zona (a las 02:00 UTC todavía es "ayer" en Ecuador)', () => {
    expect(todayIn(ECUADOR_ZONE, new Date('2026-11-02T02:00:00Z'))).toBe('2026-11-01');
    expect(todayIn(ECUADOR_ZONE, new Date('2026-11-02T06:00:00Z'))).toBe('2026-11-02');
  });

  it('aritmética de calendario', () => {
    expect(addDaysToDate('2026-02-27', 3)).toBe('2026-03-02');
    expect(weekdayOf('2026-11-02')).toBe(1);
  });
});
