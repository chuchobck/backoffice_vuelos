/**
 * Fechas y horas. La API trabaja SIEMPRE en UTC ("2026-11-02T13:00:00Z"); la pantalla muestra y
 * pide la hora local del aeropuerto (zona IANA de su ciudad): Ecuador continental UTC−5 y Galápagos
 * UTC−6 (sin horario de verano). Sin librerías: solo Intl.
 */
export const ECUADOR_ZONE = 'America/Guayaquil';
export const GALAPAGOS_ZONE = 'Pacific/Galapagos';

const ZONE_LABELS: Record<string, string> = {
  [ECUADOR_ZONE]: 'Ecuador continental (UTC−5)',
  [GALAPAGOS_ZONE]: 'Galápagos (UTC−6)',
};

export function zoneLabel(zone: string): string {
  return ZONE_LABELS[zone] ?? zone;
}

/** Cuántos minutos suma la zona a UTC en el instante dado (−300 para Ecuador). */
export function zoneOffsetMinutes(utcMs: number, zone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / 60000);
}

export interface LocalParts {
  /** "2026-11-02" */
  date: string;
  /** "13:05" */
  time: string;
}

/** Fecha y hora escritas en la zona local → instante UTC en ISO sin milisegundos ("…Z"). */
export function localToUtcIso(local: LocalParts, zone: string, addDays = 0): string {
  const [y, m, d] = local.date.split('-').map(Number) as [number, number, number];
  const [hh, mm] = local.time.split(':').map(Number) as [number, number];
  const guess = Date.UTC(y, m - 1, d + addDays, hh, mm);
  let utc = guess - zoneOffsetMinutes(guess, zone) * 60000;
  const second = zoneOffsetMinutes(utc, zone);
  utc = guess - second * 60000;
  return new Date(utc).toISOString().replace('.000Z', 'Z');
}

/** Instante UTC → fecha y hora locales de la zona. */
export function utcToLocal(iso: string, zone: string): LocalParts {
  const ms = new Date(iso).getTime();
  const shifted = new Date(ms + zoneOffsetMinutes(ms, zone) * 60000).toISOString();
  return { date: shifted.slice(0, 10), time: shifted.slice(11, 16) };
}

/** Valor de <input type="datetime-local"> ("2026-11-02T13:05") para un instante UTC en la zona. */
export function utcToDatetimeLocal(iso: string, zone: string): string {
  const { date, time } = utcToLocal(iso, zone);
  return `${date}T${time}`;
}

/** Valor de <input type="datetime-local"> en la zona → instante UTC. */
export function datetimeLocalToUtc(value: string, zone: string): string {
  return localToUtcIso({ date: value.slice(0, 10), time: value.slice(11, 16) }, zone);
}

/** "12 oct 2026, 8:00" en la zona indicada. */
export function formatLocal(iso: string | null | undefined, zone: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-EC', { timeZone: zone, dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

/** Hoy en la zona dada ("2026-10-09"). */
export function todayIn(zone: string, now: Date = new Date()): string {
  return utcToLocal(now.toISOString(), zone).date;
}

/** Suma días a una fecha "YYYY-MM-DD" (calendario, sin zona). */
export function addDaysToDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Día de la semana (0 = domingo) de una fecha "YYYY-MM-DD". */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
