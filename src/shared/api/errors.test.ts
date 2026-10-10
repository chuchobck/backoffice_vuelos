import { describe, expect, it } from 'vitest';
import { es, fmt } from '@/shared/i18n';
import { ApiError, errorMessage, fieldLabel, loginErrorMessage } from './errors';

const e = es.errors;
const err = (status: number, extra: Partial<ConstructorParameters<typeof ApiError>[0]> = {}) => new ApiError({ status, ...extra });

describe('mensajes de error por status (qué pasó y qué hacer)', () => {
  it.each([
    [400, e.badRequest400],
    [401, e.unauthorized401],
    [403, e.forbidden403],
    [404, e.notFound404],
    [409, e.conflict409],
    [413, e.payload413],
    [415, e.media415],
    [422, e.validation422],
    [503, e.unavailable503],
    [500, e.server5xx],
    [502, e.server5xx],
  ])('%i', (status, message) => {
    expect(errorMessage(err(status))).toBe(message);
  });

  it('429 dice cuánto esperar si viene Retry-After', () => {
    expect(errorMessage(err(429, { retryAfter: 17 }))).toBe(fmt(e.rateLimited, { seconds: 17 }));
    expect(errorMessage(err(429))).toBe(e.rateLimitedNoTime);
  });

  it('503 con Retry-After también dice cuánto esperar', () => {
    expect(errorMessage(err(503, { retryAfter: 5 }))).toBe(fmt(e.unavailable503Wait, { seconds: 5 }));
  });

  it('red caída, tiempo agotado y operación no conectada', () => {
    expect(errorMessage(err(0, { code: 'NETWORK' }))).toBe(e.network);
    expect(errorMessage(err(0, { code: 'TIMEOUT' }))).toBe(e.timeout);
    expect(errorMessage(err(0, { code: 'NOT_CONNECTED' }))).toBe(e.notConnected);
  });

  it('nunca muestra el detail técnico de la API', () => {
    const technical = 'scheduledArrival: must be after something unmapped';
    const shown = [400, 401, 403, 404, 409, 422, 500].map((s) => errorMessage(err(s, { code: 'VALIDATION_FAILED', detail: technical })));
    for (const m of shown) expect(m).not.toContain('unmapped');
  });

  it('un error que no es de la API da el mensaje genérico', () => {
    expect(errorMessage(new Error('x'))).toBe(e.unknown);
  });
});

describe('400 y 422 con invalidParams', () => {
  it('lista los campos en español, sin repetir', () => {
    const bad = err(400, {
      fieldErrors: [
        { field: 'cabins[0].totalSeats', message: 'must not be greater than 999' },
        { field: 'cabins[1].cabinClass', message: 'repeated' },
        { field: 'scheduledArrival', message: 'x' },
      ],
    });
    expect(errorMessage(bad)).toBe(`${e.badRequest400} ${fmt(e.reviewFields, { fields: 'Cabinas, Llegada' })}`);
  });

  it('un campo desconocido muestra su nombre tal cual (es un nombre, no el detail)', () => {
    expect(fieldLabel('rows[3].seats[0].letter')).toBe('Filas');
    expect(fieldLabel('algoNuevo')).toBe('algoNuevo');
  });

  it('422 traduce las reglas conocidas del backend y conserva el resto como mensaje genérico', () => {
    expect(errorMessage(err(422, { detail: 'The departure must be in the future' }))).toBe(e.business.departureFuture);
    expect(errorMessage(err(422, { detail: 'Airline XX does not exist or is inactive' }))).toBe(e.business.referenceInactive);
    expect(errorMessage(err(422, { detail: 'The cabin has 150 seats; the quota cannot exceed them' }))).toBe(e.business.quotaExceeds);
    expect(errorMessage(err(422, { detail: 'algo nuevo' }))).toBe(e.validation422);
  });

  it('409 distingue "ya existe" de "está en uso"', () => {
    expect(errorMessage(err(409, { detail: 'Airport UIO is still used by active flights' }))).toBe(e.conflictInUse);
    expect(errorMessage(err(409, { detail: 'Seat map already exists' }))).toBe(e.business.duplicate);
    expect(errorMessage(err(409, { detail: 'otra cosa' }))).toBe(e.conflict409);
  });
});

describe('errores de ingreso', () => {
  it('401 es genérico: no revela si el correo existe', () => {
    expect(loginErrorMessage(err(401, { code: 'VALIDATION_FAILED' }))).toBe(es.auth.invalidCredentials);
  });

  it('403 = cuenta sin permiso de administrador', () => {
    expect(loginErrorMessage(err(403))).toBe(es.auth.notAdmin);
  });

  it('429 con el tiempo de espera de Retry-After', () => {
    expect(loginErrorMessage(err(429, { retryAfter: 42 }))).toBe(fmt(es.auth.tooManyAttempts, { seconds: 42 }));
    expect(loginErrorMessage(err(429))).toBe(es.auth.tooManyAttemptsNoTime);
  });

  it('servidor caído y red, con los mensajes generales', () => {
    expect(loginErrorMessage(err(503))).toBe(e.unavailable503);
    expect(loginErrorMessage(err(0, { code: 'NETWORK' }))).toBe(e.network);
  });
});

describe('mensajes de administradores y reservas de administración', () => {
  it.each([
    [409, 'You cannot deactivate your own account; ask another administrator', undefined, e.business.ownAccount],
    [409, 'The last active administrator cannot be deactivated', undefined, e.business.lastAdmin],
    [409, 'An account with that email already exists', undefined, e.business.accountExists],
    [409, 'Booking x is already cancelled', 'ALREADY_CANCELLED', e.business.alreadyCancelled],
    [409, 'Booking x must be CONFIRMED for a cancellation', 'BOOKING_NOT_CONFIRMED', e.business.notConfirmed],
    [409, 'Booking x has a payment pending in the Payment API; cancel when it is resolved', undefined, e.business.paymentPending],
    [422, 'This Idempotency-Key was already used with a different request body', undefined, e.business.keyReused],
  ] as const)('%i %s', (status, detail, code, message) => {
    expect(errorMessage(new ApiError({ status, detail, code }))).toBe(message);
  });

  it('nunca muestra el detail técnico', () => {
    expect(errorMessage(new ApiError({ status: 409, detail: 'uq_secret_internal_constraint' }))).not.toContain('uq_');
  });
});
