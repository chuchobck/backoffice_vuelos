import { describe, expect, it, vi } from 'vitest';
import { ApiError, errorMessage } from './errors';
import { createHttpClient } from './http/client';
import { createRealAdminApi } from './RealAdminApi';

function api(status = 200, body: unknown = { items: [] }) {
  const fetchImpl = vi.fn(async () =>
    status === 204 ? new Response(null, { status }) : new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
  const make = (baseUrl: string) => createHttpClient({ baseUrl, fetchImpl: fetchImpl as unknown as typeof fetch });
  const real = createRealAdminApi({ core: make('https://gw.test/flights/v1'), identity: make('https://gw.test/identity/v1') });
  const call = () => fetchImpl.mock.calls[0] as unknown as [URL, RequestInit & { headers: Record<string, string> }];
  return { real, call, fetchImpl };
}

describe('RealAdminApi: auditoría, administradores y reservas', () => {
  it('auditoría: GET /admin/audit-log con filtros y cursor', async () => {
    const { real, call } = api();
    await real.auditLog.list({ limit: 20, cursor: 'abc', filters: { table: 'pais', operation: 'UPDATE', userId: '' } });
    const [url, init] = call();
    expect(init.method).toBe('GET');
    expect(url.pathname).toBe('/flights/v1/admin/audit-log');
    expect(Object.fromEntries(url.searchParams)).toEqual({ limit: '20', cursor: 'abc', table: 'pais', operation: 'UPDATE' });
  });

  it('administradores: crear y dar de baja usan /admin/users', async () => {
    const created = api(201, { id: 'u1', email: 'a@b.ec', createdAt: '2026-01-01T00:00:00Z', active: true });
    await created.real.admins.create({ email: 'a@b.ec', password: 'una frase larga de prueba' });
    expect(created.call()[0].pathname).toBe('/identity/v1/admin/users');
    expect(created.call()[1].method).toBe('POST');
    expect(JSON.parse(String(created.call()[1].body))).toEqual({ email: 'a@b.ec', password: 'una frase larga de prueba' });

    const removed = api(204, undefined);
    await removed.real.admins.deactivate('u1');
    expect(removed.call()[0].pathname).toBe('/identity/v1/admin/users/u1');
    expect(removed.call()[1].method).toBe('DELETE');
  });

  it('administradores: detalle, edición y reactivación no existen en la API y no llaman a la red', async () => {
    const { real, fetchImpl } = api();
    await expect(real.admins.get('u1')).rejects.toMatchObject({ code: 'NOT_CONNECTED' });
    await expect(real.admins.reactivate('u1')).rejects.toMatchObject({ code: 'NOT_CONNECTED' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('un 404 en una colección del CORE avisa que la API desplegada no tiene el endpoint (no "no se encontró")', async () => {
    for (const [call, path] of [
      [(r: ReturnType<typeof api>['real']) => r.auditLog.list(), '/admin/audit-log'],
      [(r: ReturnType<typeof api>['real']) => r.bookings.list(), '/admin/bookings'],
    ] as const) {
      const { real } = api(404, { title: 'Not Found', status: 404 });
      const error = await call(real).catch((e: unknown) => e);
      expect(error).toMatchObject({ code: 'NOT_CONNECTED', detail: path });
      expect(error).not.toHaveProperty('service', 'identity');
      expect(errorMessage(error)).toBe(`La API desplegada no tiene todavía el endpoint /flights/v1${path}. Hay que agregarlo en el backend.`);
    }
  });

  it('identity sin configurar o caída (404 en la colección, 502, 503, 504, sin red) se distingue del core', async () => {
    const identityDown = errorMessage(new ApiError({ status: 502, service: 'identity' }));
    expect(identityDown).toContain('IDENTITY_URL');
    for (const status of [404, 502, 503, 504]) {
      for (const call of [
        (r: ReturnType<typeof api>['real']) => r.admins.list(),
        (r: ReturnType<typeof api>['real']) => r.admins.create({ email: 'a@b.ec', password: 'una frase larga de prueba' }),
        (r: ReturnType<typeof api>['real']) => r.auth.login({ email: 'a@b.ec', password: 'una frase larga de prueba' }),
        (r: ReturnType<typeof api>['real']) => r.auth.me(),
      ]) {
        const { real } = api(status, { title: 'x', status });
        const error = await call(real).catch((e: unknown) => e);
        expect(error).toMatchObject({ status, service: 'identity' });
        expect(errorMessage(error)).toBe(identityDown);
      }
    }
    // El core caído NO se atribuye a identity
    const core = await api(502, { title: 'x', status: 502 }).real.airports.list().catch((e: unknown) => e);
    expect(core).not.toHaveProperty('service', 'identity');
    expect(errorMessage(core)).not.toContain('IDENTITY_URL');
  });

  it('sin red hacia identity también se avisa de identity', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const make = (baseUrl: string) => createHttpClient({ baseUrl, fetchImpl: fetchImpl as unknown as typeof fetch });
    const real = createRealAdminApi({ core: make('https://gw.test/flights/v1'), identity: make('https://gw.test/identity/v1') });
    const error = await real.auth.login({ email: 'a@b.ec', password: 'una frase larga de prueba' }).catch((e: unknown) => e);
    expect(error).toMatchObject({ code: 'NETWORK', service: 'identity' });
    expect(errorMessage(error)).toContain('IDENTITY_URL');
  });

  it('un 401, 403, 409 o 429 de identity conserva su significado (no es "identity no disponible")', async () => {
    for (const status of [400, 401, 403, 409, 429]) {
      const { real } = api(status, { title: 'x', status });
      const error = await real.admins.create({ email: 'a@b.ec', password: 'una frase larga de prueba' }).catch((e: unknown) => e);
      expect(error).toMatchObject({ status });
      expect(error).not.toHaveProperty('service', 'identity');
    }
  });

  it('el 404 de DELETE /admin/users/{id} sigue siendo "no existe ese administrador" (no "identity no disponible")', async () => {
    const { real } = api(404, { title: 'Not Found', status: 404, detail: 'Administrator x was not found' });
    const error = await real.admins.deactivate('x').catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 404 });
    expect(error).not.toHaveProperty('service', 'identity');
  });

  it('reservas: lista con filtros, detalle y cancelación con Idempotency-Key en la cabecera', async () => {
    const list = api();
    await list.real.bookings.list({ filters: { ownerEmail: 'ana@example.com', status: 'CONFIRMED' } });
    expect(list.call()[0].pathname).toBe('/flights/v1/admin/bookings');
    expect(list.call()[0].searchParams.get('ownerEmail')).toBe('ana@example.com');

    const detail = api(200, {});
    await detail.real.bookings.get('b1');
    expect(detail.call()[0].pathname).toBe('/flights/v1/admin/bookings/b1');

    const cancel = api(200, { status: 'CANCELLED' });
    await cancel.real.bookings.cancel('b1', '11111111-1111-4111-8111-111111111111', 'Cambio de planes');
    const [url, init] = cancel.call();
    expect(url.pathname).toBe('/flights/v1/admin/bookings/b1/cancel');
    expect(init.method).toBe('POST');
    expect(init.headers['Idempotency-Key']).toBe('11111111-1111-4111-8111-111111111111');
    expect(JSON.parse(String(init.body))).toEqual({ reason: 'Cambio de planes' });

    const noReason = api(200, { status: 'CANCELLED' });
    await noReason.real.bookings.cancel('b1', '22222222-2222-4222-8222-222222222222');
    expect(JSON.parse(String(noReason.call()[1].body))).toEqual({});
  });
});
