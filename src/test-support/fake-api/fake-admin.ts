/**
 * Administradores, auditoría y reservas de la API de prueba: reproducen la forma y las reglas de
 * /admin/users, /admin/audit-log y /admin/bookings del backend (409 por correo repetido, no darse de baja
 * a uno mismo ni al último administrador, censura "[REDACTED]", cancelación con Idempotency-Key).
 */
import type { AdminApi, ListQuery, Page } from '@/shared/api/AdminApi';
import type { AdminUser, AuditEvent, BookingDetail, BookingSummary, BookingTicket, CreateAdminUser } from '@/shared/api/contract';
import { ApiError } from '@/shared/api/errors';
import type { FakeState } from './seed';
import { nextUuid } from './ids';

/** El `sub` de la cuenta de administrador de prueba (el de `FAKE_ACCOUNTS.admin`). */
export const FAKE_ADMIN_ID = '00000000-0000-4000-8000-00000000ad01';

const problem = (status: number, detail: string, code: ApiError['code'] = 'VALIDATION_FAILED') => new ApiError({ status, code, detail });
const toCursor = (key: string) => btoa(key).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromCursor = (cursor: string): string | undefined => {
  try {
    return atob(cursor.replace(/-/g, '+').replace(/_/g, '/'));
  } catch {
    return undefined;
  }
};

/** Una página por cursor sobre filas ya ordenadas; el cursor es la clave de la última fila entregada. */
function paginate<T>(rows: T[], key: (r: T) => string, query: ListQuery, max: number, byDefault: number): Page<T> {
  const limit = Math.min(Math.max(query.limit ?? byDefault, 1), max);
  let start = 0;
  if (query.cursor) {
    const k = fromCursor(query.cursor);
    const i = k === undefined ? -1 : rows.findIndex((r) => key(r) === k);
    if (i < 0) throw problem(400, 'cursor is not valid');
    start = i + 1;
  }
  const page = rows.slice(start, start + limit);
  return start + limit < rows.length ? { items: page, nextCursor: toCursor(key(page[page.length - 1]!)) } : { items: page };
}

export interface FakeAccount {
  email: string;
  password: string;
  scopes: readonly string[];
  id: string;
}

interface FakeAdminRow extends AdminUser {
  password: string;
}

const HOUR = 3_600_000;

export function createFakeAdminExtras(deps: {
  now: () => Date;
  wait: () => Promise<void>;
  state: FakeState;
  /** El administrador de prueba y su contraseña, para que figure en la lista. */
  admin: { email: string; password: string };
  /** Quién está conectado: la regla "no darse de baja a uno mismo" depende de él. */
  currentId: () => string;
}): Pick<AdminApi, 'admins' | 'auditLog' | 'bookings'> & { findAdminAccount: (email: string, password: string) => FakeAccount | undefined } {
  const { now, wait, state } = deps;
  const startedAt = now().getTime();

  const audit: AuditEvent[] = [];
  let auditSeq = 0;
  const record = (e: Omit<AuditEvent, 'id' | 'occurredAt' | 'ipAddress'> & { occurredAt?: string }) => {
    audit.unshift({ id: String(++auditSeq), occurredAt: e.occurredAt ?? now().toISOString(), ipAddress: '203.0.113.7', ...e });
  };

  // --- Administradores ---------------------------------------------------------------------------------
  const admins: FakeAdminRow[] = [
    { id: FAKE_ADMIN_ID, email: deps.admin.email, password: deps.admin.password, createdAt: new Date(startedAt - 30 * 24 * HOUR).toISOString(), active: true },
    { id: nextUuid(), email: 'operaciones@quinde.test', password: 'prueba-operaciones-1', createdAt: new Date(startedAt - 10 * 24 * HOUR).toISOString(), active: true },
  ];
  const publicAdmin = ({ password: _password, ...rest }: FakeAdminRow): AdminUser => rest;

  const activeAdmins = () => admins.filter((a) => a.active);

  // --- Auditoría de ejemplo (para las pruebas de la pantalla) -------------------------------------------
  const seedAudit = (hoursAgo: number, e: Omit<AuditEvent, 'id' | 'occurredAt' | 'ipAddress'>) =>
    record({ ...e, occurredAt: new Date(startedAt - hoursAgo * HOUR).toISOString() });
  const country = state.countries[0];
  seedAudit(48, { table: 'usuario', operation: 'INSERT', recordId: admins[1]!.id, userId: FAKE_ADMIN_ID, before: null, after: { id: admins[1]!.id, correo: admins[1]!.email, hash_contrasena: '[REDACTED]', activo: true } });
  seedAudit(40, { table: 'usuario', operation: 'UPDATE', recordId: nextUuid(), userId: FAKE_ADMIN_ID, before: { activo: true }, after: { activo: false } });
  seedAudit(30, { table: 'aerolinea', operation: 'UPDATE', recordId: '1', userId: FAKE_ADMIN_ID, before: { nombre: 'Avianca Ecuador' }, after: { nombre: 'Avianca' } });
  seedAudit(24, { table: 'pais', operation: 'UPDATE', recordId: '1', userId: FAKE_ADMIN_ID, before: { nombre: country?.name ?? 'Ecuador' }, after: { nombre: 'República del Ecuador' } });
  seedAudit(12, { table: 'tarifa_cabecera', operation: 'DELETE', recordId: '9', userId: admins[1]!.id, before: { id: 9, cargo_cambio: '10.00', activo: true }, after: null });
  for (let i = 0; i < 24; i++) {
    seedAudit(11 - i * 0.4, {
      table: 'vuelo_programado',
      operation: i % 5 === 0 ? 'INSERT' : 'UPDATE',
      recordId: String(100 + i),
      userId: i % 3 === 0 ? admins[1]!.id : FAKE_ADMIN_ID,
      before: i % 5 === 0 ? null : { estado: 'PROGRAMADO' },
      after: i % 5 === 0 ? { id: 100 + i, estado: 'PROGRAMADO', terminal_salida: 'T1' } : { estado: 'DEMORADO' },
    });
  }

  const adminsResource: AdminApi['admins'] = {
    async list(q = {}) {
      await wait();
      const rows = admins
        .filter((a) => q.includeInactive || a.active)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
        .map(publicAdmin);
      return paginate(rows, (r) => r.id, q, 50, 10);
    },
    get: () => Promise.reject(new ApiError({ status: 0, code: 'NOT_CONNECTED' })),
    update: () => Promise.reject(new ApiError({ status: 0, code: 'NOT_CONNECTED' })),
    reactivate: () => Promise.reject(new ApiError({ status: 0, code: 'NOT_CONNECTED' })),
    async create(body: CreateAdminUser) {
      await wait();
      const email = body.email.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw problem(400, 'email must be an email');
      if (body.password.length < 12 || body.password.length > 128) throw problem(400, 'password must be between 12 and 128 characters');
      if (admins.some((a) => a.email === email) || email === 'cliente@quinde.test') throw problem(409, 'An account with that email already exists');
      const row: FakeAdminRow = { id: nextUuid(), email, password: body.password, createdAt: now().toISOString(), active: true };
      admins.push(row);
      record({ table: 'usuario', operation: 'INSERT', recordId: row.id, userId: deps.currentId(), before: null, after: { id: row.id, correo: email, hash_contrasena: '[REDACTED]', activo: true } });
      return publicAdmin(row);
    },
    async deactivate(id) {
      await wait();
      const row = admins.find((a) => a.id === id);
      if (!row) throw problem(404, `Administrator ${id} was not found`);
      if (!row.active) return;
      if (id === deps.currentId()) throw problem(409, 'You cannot deactivate your own account; ask another administrator');
      if (activeAdmins().filter((a) => a.id !== id).length === 0) throw problem(409, 'The last active administrator cannot be deactivated');
      row.active = false;
      record({ table: 'usuario', operation: 'UPDATE', recordId: id, userId: deps.currentId(), before: { activo: true }, after: { activo: false } });
    },
  };

  const auditLog: AdminApi['auditLog'] = {
    async list(q = {}) {
      await wait();
      const f = Object.fromEntries(Object.entries(q.filters ?? {}).filter(([, v]) => v)) as Record<string, string>;
      if (f.operation && !['INSERT', 'UPDATE', 'DELETE'].includes(f.operation.toUpperCase())) throw problem(400, 'operation must be one of: INSERT, UPDATE, DELETE');
      for (const k of ['from', 'to'] as const) if (f[k] && !/^\d{4}-\d{2}-\d{2}$/.test(f[k]!)) throw problem(400, `${k} must be a valid date`);
      if (f.from && f.to && f.to < f.from) throw problem(400, 'to must not be before from');
      const rows = audit.filter(
        (e) =>
          (!f.table || e.table === f.table) &&
          (!f.operation || e.operation === f.operation.toUpperCase()) &&
          (!f.recordId || e.recordId === f.recordId) &&
          (!f.userId || e.userId === f.userId) &&
          (!f.from || e.occurredAt.slice(0, 10) >= f.from) &&
          (!f.to || e.occurredAt.slice(0, 10) <= f.to),
      );
      return paginate(rows, (e) => e.id, q, 100, 20);
    },
  };

  // --- Reservas ----------------------------------------------------------------------------------------
  interface FakeBooking {
    detail: BookingDetail;
    summary: BookingSummary;
  }
  const owners = [
    { id: nextUuid(), email: 'ana@example.com' },
    { id: nextUuid(), email: 'beto@example.com' },
    { id: nextUuid(), email: 'carla@example.com' },
  ];
  const pnrs = ['K7M2QX', 'B3N8TW', 'H5R9ZP', 'D2F6VC', 'M4J7GY', 'P8S3KD', 'T6W2NB', 'X9C5RH', 'Z3V7LA', 'Q5G8MF', 'R2Y4JE', 'N7D9UT'];
  const bookings: FakeBooking[] = [];
  const dayOf = (offset: number) => new Date(startedAt + offset * 24 * HOUR).toISOString();
  pnrs.forEach((pnr, i) => {
    const dep = state.departures[(i * 7) % state.departures.length]!;
    const owner = owners[i % owners.length]!;
    const status: BookingDetail['status'] = i % 6 === 5 ? 'CANCELLED' : i % 6 === 3 ? 'PENDING_PAYMENT' : 'CONFIRMED';
    const id = nextUuid();
    const segmentId = dep.id;
    const total = { currency: 'USD', baseFare: (60 + i * 10).toFixed(2), taxes: (12 + i * 2).toFixed(2), total: (72 + i * 12).toFixed(2) };
    const tickets: BookingTicket[] =
      status === 'PENDING_PAYMENT'
        ? []
        : [{ ticketId: nextUuid(), bookingId: id, passengerId: 'ADU1', eTicketNumber: `1234567${String(i).padStart(6, '0')}`, status: status === 'CANCELLED' ? 'REFUNDED' : 'ISSUED', issuedAt: dayOf(-2 - i), segments: [{ segmentId, status: 'ISSUED', couponNumber: '1' }] }];
    const detail: BookingDetail = {
      bookingId: id,
      pnr,
      status,
      grandTotal: total,
      createdAt: dayOf(-3 - i),
      updatedAt: dayOf(-3 - i),
      itineraries: [
        {
          itineraryId: nextUuid(),
          totalDurationMinutes: 55,
          stopsCount: 0,
          segments: [
            {
              segmentId,
              flightNumber: dep.flightNumber,
              departure: { iataCode: dep.origin, at: dep.scheduledDeparture },
              arrival: { iataCode: dep.destination, at: dep.scheduledArrival },
              marketingCarrier: dep.flightNumber.slice(0, 2),
              operatingCarrier: dep.flightNumber.slice(0, 2),
              aircraft: dep.aircraftModel,
              durationMinutes: 55,
              status: 'SCHEDULED',
            },
          ],
          pricingOptions: [],
        },
      ],
      passengers: [
        {
          passengerId: 'ADU1',
          passengerType: 'ADULT',
          firstName: 'Ana',
          lastName: `Prueba ${i + 1}`,
          documentType: 'NATIONAL_ID',
          documentNumber: `17100340${String(60 + i).padStart(2, '0')}`,
          nationality: 'EC',
          birthDate: '1990-01-01',
          gender: 'F',
          contact: { email: owner.email, phone: '+593991234567' },
          assignedSeats: [{ segmentId, seatNumber: `${10 + i}A` }],
          extraBaggage: [],
        },
      ],
      tickets,
      changes: [{ changedAt: dayOf(-3 - i), description: 'Booking created from hold' }],
      owner,
    };
    bookings.push({
      detail,
      summary: { bookingId: id, pnr, status, origin: dep.origin, destination: dep.destination, departureDate: dep.departureDate, grandTotal: total, owner },
    });
  });

  /** Reintentos de una cancelación: la misma clave devuelve el mismo resultado (la API real manda Idempotent-Replayed). */
  const cancellations = new Map<string, { bookingId: string; reason: string | undefined }>();

  const find = (id: string) => {
    const b = bookings.find((x) => x.detail.bookingId === id);
    if (!b) throw problem(404, `Booking ${id} was not found`);
    return b;
  };

  const bookingsApi: AdminApi['bookings'] = {
    async list(q = {}) {
      await wait();
      const f = Object.fromEntries(Object.entries(q.filters ?? {}).filter(([, v]) => v)) as Record<string, string>;
      if (f.pnr && !/^[A-Za-z0-9]{6}$/.test(f.pnr)) throw problem(400, 'pnr must be 6 letters or digits');
      if (f.createdFrom && f.createdTo && f.createdTo < f.createdFrom) throw problem(400, 'createdTo must not be before createdFrom');
      const rows = bookings
        .map((b) => b.summary)
        .filter(
          (s) =>
            (!f.pnr || s.pnr === f.pnr.toUpperCase()) &&
            (!f.status || s.status === f.status) &&
            (!f.ownerEmail || s.owner.email === f.ownerEmail.toLowerCase()) &&
            (!f.flightNumber || find(s.bookingId).detail.itineraries.some((it) => it.segments.some((g) => g.flightNumber === f.flightNumber!.toUpperCase()))) &&
            (!f.createdFrom || find(s.bookingId).detail.createdAt.slice(0, 10) >= f.createdFrom) &&
            (!f.createdTo || find(s.bookingId).detail.createdAt.slice(0, 10) <= f.createdTo),
        )
        .sort((a, b) => find(b.bookingId).detail.createdAt.localeCompare(find(a.bookingId).detail.createdAt) || b.bookingId.localeCompare(a.bookingId));
      return paginate(rows, (r) => r.bookingId, q, 50, 10);
    },
    async get(id) {
      await wait();
      return structuredClone(find(id).detail);
    },
    async cancel(id, key, reason) {
      await wait();
      const b = find(id);
      const previous = cancellations.get(key);
      if (previous) {
        if (previous.bookingId !== id || previous.reason !== reason) throw problem(422, 'This Idempotency-Key was already used with a different request body');
        return structuredClone(b.detail);
      }
      if (b.detail.status === 'CANCELLED') throw problem(409, `Booking ${id} is already cancelled`, 'ALREADY_CANCELLED');
      if (b.detail.status !== 'CONFIRMED') throw problem(409, `Booking ${id} must be CONFIRMED for a cancellation`, 'BOOKING_NOT_CONFIRMED');
      const before = b.detail.status;
      b.detail.status = 'CANCELLED';
      b.summary.status = 'CANCELLED';
      b.detail.tickets = b.detail.tickets.map((t) => ({ ...t, status: 'REFUNDED' }));
      b.detail.passengers = b.detail.passengers.map((p) => ({ ...p, assignedSeats: [] }));
      b.detail.updatedAt = now().toISOString();
      b.detail.changes.push(
        { changedAt: now().toISOString(), description: 'Cancellation accepted; refund of 60.00 USD in progress' },
        { changedAt: now().toISOString(), description: 'Booking cancelled; 60.00 refunded' },
      );
      cancellations.set(key, { bookingId: id, reason });
      record({ table: 'reserva_cabecera', operation: 'UPDATE', recordId: id, userId: deps.currentId(), before: { estado: before }, after: { estado: 'CANCELADA' } });
      return structuredClone(b.detail);
    },
  };

  return {
    admins: adminsResource,
    auditLog,
    bookings: bookingsApi,
    findAdminAccount: (email, password) => {
      const row = admins.find((a) => a.email === email && a.password === password);
      return row && row.active ? { email: row.email, password: row.password, scopes: ['flights:admin'], id: row.id } : undefined;
    },
  };
}
