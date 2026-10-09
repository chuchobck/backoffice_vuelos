import { describe, expect, it, vi } from 'vitest';
import { ApiError, createHttpClient, createRealAdminApi, setAuthBridge, type AdminApi } from '@/shared/api';
import { createLocalLock } from './crossTab';
import { SessionManager } from './session';
import { createTokenStore, type StorageLike } from './tokenStore';

function memoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

interface Call {
  method: string;
  path: string;
  auth: string | null;
  body: unknown;
}

/**
 * Backend falso con las reglas de la API real: access token válido solo el vigente; el refresh token
 * rota (un refresh token usado una vez no sirve más); cada respuesta de error es application/problem+json.
 */
function fakeBackend() {
  let n = 1;
  let validAccess = 'acc-1';
  let validRefresh = 'ref-1';
  const calls: Call[] = [];
  let meRoles = ['administrador'];
  const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'content-type': status >= 400 ? 'application/problem+json' : 'application/json', ...headers } });

  const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = new URL(String(input));
    const path = url.pathname.replace('/flights/v1', '') + url.search;
    const headers = new Headers(init?.headers);
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method: init?.method ?? 'GET', path, auth: headers.get('Authorization'), body });

    if (path === '/auth/refresh') {
      if (body.refresh_token !== validRefresh) return json(401, { status: 401, code: 'VALIDATION_FAILED', detail: 'Invalid refresh token' });
      n += 1;
      validAccess = `acc-${n}`;
      validRefresh = `ref-${n}`;
      return json(200, { access_token: validAccess, token_type: 'Bearer', expires_in: 900, refresh_token: validRefresh, scope: 'flights:admin' });
    }
    if (path === '/auth/login') {
      if (body.password !== 'una frase larga y fácil') return json(401, { status: 401, code: 'VALIDATION_FAILED', detail: 'Invalid credentials' });
      return json(200, { access_token: validAccess, token_type: 'Bearer', expires_in: 900, refresh_token: validRefresh, scope: 'flights:admin' });
    }
    if (path === '/auth/logout') return json(204, null);
    if (path === '/auth/me') return json(200, { id: 'u1', email: 'a@x.co', roles: meRoles, scopes: meRoles.includes('administrador') ? ['flights:admin'] : ['flights:read'], createdAt: '2026-01-01T00:00:00Z' });
    if (headers.get('Authorization') !== `Bearer ${validAccess}`) return json(401, { status: 401, code: 'VALIDATION_FAILED', detail: 'expired' });
    if (path.startsWith('/admin/airports?') && path.includes('limit=429')) return json(429, { status: 429, code: 'RATE_LIMIT_EXCEEDED' }, { 'Retry-After': '12' });
    if (path.startsWith('/admin/airports') && init?.method === 'POST') return json(422, { status: 422, code: 'VALIDATION_FAILED', detail: 'City X does not exist or is inactive', invalidParams: [{ name: 'cityId', reason: 'bad' }] });
    if (path.startsWith('/admin/airports/UIO') && init?.method === 'DELETE') return json(204, null);
    if (path.startsWith('/admin/airports')) return json(200, { items: [{ code: 'UIO', name: 'Mariscal Sucre', cityId: 'c1', cityName: 'Quito', country: 'EC', active: true }] });
    return json(404, { status: 404, code: 'VALIDATION_FAILED' });
  });
  return { fetchImpl, calls, expireAccess: () => (validAccess = 'rotated-elsewhere'), asCustomer: () => (meRoles = ['cliente']) };
}

function setup() {
  const backend = fakeBackend();
  const client = createHttpClient({ baseUrl: 'https://api.test/flights/v1', fetchImpl: backend.fetchImpl as never, getAccessToken: () => session.getAccessToken(), sleep: async () => undefined });
  const api: AdminApi = createRealAdminApi(client);
  const session = new SessionManager({
    api: api.auth,
    store: createTokenStore(memoryStorage(), memoryStorage()),
    lock: createLocalLock(),
    channel: { post: () => undefined, listen: () => () => undefined },
    schedule: () => () => undefined,
  });
  setAuthBridge({ getAccessToken: session.getAccessToken, authorized: (call) => session.authorized(call) });
  return { backend, api, session };
}

describe('capa real: cliente HTTP + sesión', () => {
  it('ingresar no manda Bearer; /auth/me sí, y deja la sesión abierta con el usuario administrador', async () => {
    const { backend, session } = setup();
    const user = await session.login({ email: 'a@x.co', password: 'una frase larga y fácil' });
    expect(user.scopes).toContain('flights:admin');
    expect(backend.calls.find((c) => c.path === '/auth/login')!.auth).toBeNull();
    expect(backend.calls.find((c) => c.path === '/auth/me')!.auth).toBe('Bearer acc-1');
    // El cuerpo del ingreso es solo correo y contraseña: la interfaz nunca manda un rol.
    expect(backend.calls.find((c) => c.path === '/auth/login')!.body).toEqual({ email: 'a@x.co', password: 'una frase larga y fácil' });
    expect(session.getState().status).toBe('authenticated');
  });

  it('una contraseña incorrecta es un 401 y no abre sesión', async () => {
    const { session } = setup();
    await expect(session.login({ email: 'a@x.co', password: 'otra frase larga' })).rejects.toMatchObject({ status: 401 });
    expect(session.getState().status).not.toBe('authenticated');
  });

  it('una cuenta sin flights:admin recibe un 403, se cierra la sesión (POST /auth/logout) y no queda nada guardado', async () => {
    const { backend, session } = setup();
    backend.asCustomer();
    await expect(session.login({ email: 'a@x.co', password: 'una frase larga y fácil' })).rejects.toMatchObject({ status: 403 });
    expect(session.getState()).toMatchObject({ status: 'anonymous', user: null });
    expect(backend.calls.some((c) => c.path === '/auth/logout')).toBe(true);
    expect(session.getAccessToken()).toBeUndefined();
  });

  it('ante un 401 renueva UNA vez (aunque haya varias peticiones a la vez) y reintenta cada una una vez', async () => {
    const { backend, api, session } = setup();
    // Sesión ya iniciada con tokens válidos (como tras el login).
    const tokens = { accessToken: 'acc-1', refreshToken: 'ref-1', expiresIn: 900, scope: 'flights:admin' };
    (session as unknown as { setAccess: (t: typeof tokens) => void }).setAccess(tokens);
    (session as unknown as { deps: { store: { write: (t: string) => void } } }).deps.store.write('ref-1');
    backend.expireAccess();

    const [a, b, c] = await Promise.all([api.airports.list(), api.airports.list({ limit: 5 }), api.airports.list({ limit: 6 })]);
    expect([a.items, b.items, c.items].every((i) => i[0]?.code === 'UIO')).toBe(true);
    expect(backend.calls.filter((x) => x.path === '/auth/refresh')).toHaveLength(1);
    // Cada lista: primer intento (401) + reintento (200)
    expect(backend.calls.filter((x) => x.path.startsWith('/admin/airports'))).toHaveLength(6);
    // El refresh no lleva Bearer; las llamadas de /admin sí
    expect(backend.calls.find((x) => x.path === '/auth/refresh')!.auth).toBeNull();
    expect(backend.calls.filter((x) => x.path.startsWith('/admin/airports')).every((x) => x.auth?.startsWith('Bearer '))).toBe(true);
  });

  it('si la renovación falla (401), la sesión se cierra por seguridad y la petición falla', async () => {
    const { backend, api, session } = setup();
    (session as unknown as { setAccess: (t: unknown) => void }).setAccess({ accessToken: 'acc-1', refreshToken: 'ref-1', expiresIn: 900, scope: '' });
    (session as unknown as { deps: { store: { write: (t: string) => void } } }).deps.store.write('ref-viejo');
    backend.expireAccess();
    await expect(api.airports.list()).rejects.toBeTruthy();
    expect(session.getState()).toMatchObject({ status: 'anonymous', ended: 'security' });
  });

  it('un 422 llega como ApiError con los campos (invalidParams) y sin perder el código', async () => {
    const { api, session } = setup();
    (session as unknown as { setAccess: (t: unknown) => void }).setAccess({ accessToken: 'acc-1', refreshToken: 'ref-1', expiresIn: 900, scope: '' });
    const error = await api.airports.create({ code: 'XXX', name: 'X', cityId: 'x' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422, code: 'VALIDATION_FAILED', fieldErrors: [{ field: 'cityId', message: 'bad' }] });
  });

  it('un 429 trae Retry-After en segundos y las lecturas no se reintentan por eso', async () => {
    const { backend, api, session } = setup();
    (session as unknown as { setAccess: (t: unknown) => void }).setAccess({ accessToken: 'acc-1', refreshToken: 'ref-1', expiresIn: 900, scope: '' });
    const error = await api.airports.list({ limit: 429 }).catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 429, retryAfter: 12, code: 'RATE_LIMIT_EXCEEDED' });
    expect(backend.calls.filter((x) => x.path.includes('limit=429'))).toHaveLength(1);
  });

  it('la baja es un DELETE (204) y la lista manda los filtros y includeInactive como la API los espera', async () => {
    const { backend, api, session } = setup();
    (session as unknown as { setAccess: (t: unknown) => void }).setAccess({ accessToken: 'acc-1', refreshToken: 'ref-1', expiresIn: 900, scope: '' });
    await expect(api.airports.deactivate('UIO')).resolves.toBeUndefined();
    expect(backend.calls.at(-1)).toMatchObject({ method: 'DELETE', path: '/admin/airports/UIO' });
    await api.airports.list({ limit: 25, cursor: 'abc', includeInactive: true, filters: { country: 'EC', cityId: '' } });
    const url = backend.calls.at(-1)!.path;
    expect(url).toContain('limit=25');
    expect(url).toContain('cursor=abc');
    expect(url).toContain('includeInactive=true');
    expect(url).toContain('country=EC');
    expect(url).not.toContain('cityId');
  });
});
