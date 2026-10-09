import { describe, expect, it, vi } from 'vitest';
import { ApiError, type AuthApi, type AuthTokens, type User } from '@/shared/api';
import { createLocalLock, type ChannelLike, type SessionMessage } from './crossTab';
import { REFRESH_SKEW_MS, SessionManager } from './session';
import { createTokenStore, type StorageLike } from './tokenStore';

const USER: User = { id: 'u1', email: 'ana@example.test', roles: ['administrador'], scopes: ['flights:admin'], createdAt: '2026-10-07T00:00:00Z' };
const T0 = Date.parse('2026-10-07T12:00:00Z');

function memoryStorage(): StorageLike & { dump: () => Record<string, string> } {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    dump: () => Object.fromEntries(data),
  };
}

/** JWT sin firma con el `exp` pedido (la sesión solo lee el payload). */
function jwt(expSeconds: number, n: number): string {
  const enc = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '');
  return `${enc({ alg: 'none' })}.${enc({ sub: 'u1', exp: expSeconds, n })}.x`;
}

/**
 * API falsa con las reglas de la real: cada refresh token sirve UNA vez; reusar uno ya rotado
 * revoca la familia (401) y anota la reutilización para que la prueba la detecte.
 */
function fakeApi(clock: () => number) {
  let counter = 0;
  const live = new Set<string>();
  const used = new Set<string>();
  const stats = { refreshCalls: 0, reuseDetected: 0, revoked: false, meCalls: 0, logoutCalls: [] as string[] };
  const issue = (): AuthTokens => {
    counter++;
    const refreshToken = `rt-${counter}`.padEnd(43, 'x');
    live.add(refreshToken);
    return { accessToken: jwt(Math.floor(clock() / 1000) + 900, counter), refreshToken, expiresIn: 900, scope: 'flights:admin' };
  };
  const api: AuthApi & { stats: typeof stats; issue: () => AuthTokens } = {
    stats,
    issue,
    login: async () => issue(),
    refresh: async (token) => {
      stats.refreshCalls++;
      await Promise.resolve();
      if (used.has(token)) {
        stats.reuseDetected++;
        stats.revoked = true;
        live.clear();
      }
      if (stats.revoked || !live.has(token)) throw new ApiError({ status: 401, code: 'VALIDATION_FAILED' });
      live.delete(token);
      used.add(token);
      return issue();
    },
    logout: async (token) => {
      stats.logoutCalls.push(token);
    },
    me: async () => {
      stats.meCalls++;
      return USER;
    },
  };
  return api;
}

/** Bus de mensajes compartido entre "pestañas" (entrega síncrona, como un BroadcastChannel inmediato). */
function fakeBus() {
  const handlers = new Set<(m: SessionMessage) => void>();
  const channel = (): ChannelLike => ({
    post: (m) => handlers.forEach((h) => h(m)),
    listen: (h) => {
      handlers.add(h);
      return () => handlers.delete(h);
    },
  });
  return { channel };
}

function tab(opts: {
  api: AuthApi;
  session?: StorageLike;
  local?: StorageLike;
  lock?: ReturnType<typeof createLocalLock>;
  channel?: ChannelLike;
  clock?: () => number;
}) {
  const scheduled: number[] = [];
  const manager = new SessionManager({
    api: opts.api,
    store: createTokenStore(opts.session ?? memoryStorage(), opts.local ?? memoryStorage(), opts.clock ?? (() => T0)),
    lock: opts.lock ?? createLocalLock(),
    channel: opts.channel ?? { post: () => undefined, listen: () => () => undefined },
    now: opts.clock ?? (() => T0),
    schedule: (_fn, ms) => {
      scheduled.push(ms);
      return () => undefined;
    },
    sleep: async () => undefined,
  });
  return { manager, scheduled };
}

const unauthorized = () => new ApiError({ status: 401, code: 'VALIDATION_FAILED' });

describe('almacén del refresh token', () => {
  it('el refresh token va a sessionStorage; el access token a ningún almacén', async () => {
    const session = memoryStorage();
    const local = memoryStorage();
    const { manager } = tab({ api: fakeApi(() => T0), session, local });
    await manager.login({ email: 'ana@example.test', password: 'una frase larga' });
    expect(Object.keys(session.dump())).toEqual(['backoffice.auth.refresh']);
    expect(local.dump()['backoffice.auth.refresh']).toBeUndefined();
    expect(JSON.stringify([session.dump(), local.dump()])).not.toContain(manager.getAccessToken());
    expect(manager.getState()).toMatchObject({ status: 'authenticated', user: USER });
  });

  it('una cuenta sin el permiso flights:admin no entra: error 403 y la sesión se cierra', async () => {
    const api = fakeApi(() => T0);
    api.me = async () => ({ ...USER, roles: ['cliente'], scopes: ['flights:read'] });
    const session = memoryStorage();
    const { manager } = tab({ api, session });
    await expect(manager.login({ email: 'ana@example.test', password: 'una frase larga' })).rejects.toMatchObject({ status: 403 });
    expect(manager.getState()).toMatchObject({ status: 'anonymous', user: null });
    expect(session.dump()['backoffice.auth.refresh']).toBeUndefined();
    expect(api.stats.logoutCalls).toHaveLength(1);
  });

  it('al restaurar, una cuenta sin flights:admin tampoco queda con sesión', async () => {
    const api = fakeApi(() => T0);
    const session = memoryStorage();
    await tab({ api, session }).manager.login({ email: 'a@b.cc', password: 'x'.repeat(12) });
    api.me = async () => ({ ...USER, scopes: ['flights:read'] });
    const reloaded = tab({ api, session }).manager;
    await reloaded.restore();
    expect(reloaded.getState().status).toBe('anonymous');
  });
});

describe('renovación', () => {
  it('single-flight: 10 renovaciones simultáneas = 1 petición', async () => {
    const api = fakeApi(() => T0);
    const { manager } = tab({ api });
    await manager.login({ email: 'a@b.cc', password: 'x'.repeat(12) });
    await Promise.all(Array.from({ length: 10 }, () => manager.refresh()));
    expect(api.stats.refreshCalls).toBe(1);
    expect(api.stats.reuseDetected).toBe(0);
  });

  it('proactiva: con el token por vencer, 5 peticiones a la vez renuevan UNA vez y todas responden', async () => {
    let now = T0;
    const api = fakeApi(() => now);
    const { manager } = tab({ api, clock: () => now });
    await manager.login({ email: 'a@b.cc', password: 'x'.repeat(12) });
    now += 900_000 - REFRESH_SKEW_MS + 1_000; // dentro del margen de vencimiento
    const results = await Promise.all(Array.from({ length: 5 }, () => manager.authorized(() => api.me())));
    expect(results).toHaveLength(5);
    expect(api.stats.refreshCalls).toBe(1);
  });

  it('programa la renovación proactiva poco antes de exp', async () => {
    const { manager, scheduled } = tab({ api: fakeApi(() => T0) });
    await manager.login({ email: 'a@b.cc', password: 'x'.repeat(12) });
    expect(scheduled.at(-1)).toBe(900_000 - REFRESH_SKEW_MS - 5_000);
  });

  it('un reloj local adelantado no provoca renovaciones en bucle (usa expires_in, no el exp del JWT)', async () => {
    // El servidor emite con su hora; el equipo va 16 minutos adelante: el `exp` ya "pasó" localmente.
    const api = fakeApi(() => T0);
    const { manager, scheduled } = tab({ api, clock: () => T0 + 16 * 60_000 });
    await manager.login({ email: 'a@b.cc', password: 'x'.repeat(12) });
    expect(scheduled.at(-1)).toBe(900_000 - REFRESH_SKEW_MS - 5_000);
    await manager.authorized(async () => 'ok');
    expect(api.stats.refreshCalls).toBe(0);
  });

  it('reactiva: ante un 401 renueva una vez y reintenta la petición una vez', async () => {
    const api = fakeApi(() => T0);
    const { manager } = tab({ api });
    await manager.login({ email: 'a@b.cc', password: 'x'.repeat(12) });
    const call = vi.fn().mockRejectedValueOnce(unauthorized()).mockResolvedValueOnce('ok');
    await expect(manager.authorized(call)).resolves.toBe('ok');
    expect(call).toHaveBeenCalledTimes(2);
    expect(api.stats.refreshCalls).toBe(1);
  });

  it('un segundo 401 cierra la sesión (sin un tercer intento)', async () => {
    const api = fakeApi(() => T0);
    const { manager } = tab({ api });
    await manager.login({ email: 'a@b.cc', password: 'x'.repeat(12) });
    const call = vi.fn().mockRejectedValue(unauthorized());
    await expect(manager.authorized(call)).rejects.toMatchObject({ status: 401 });
    expect(call).toHaveBeenCalledTimes(2);
    expect(manager.getState()).toMatchObject({ status: 'anonymous', ended: 'security' });
  });

  it('5 peticiones que reciben 401 a la vez comparten UNA renovación', async () => {
    const api = fakeApi(() => T0);
    const { manager } = tab({ api });
    await manager.login({ email: 'a@b.cc', password: 'x'.repeat(12) });
    const stale = manager.getAccessToken();
    const call = () => (manager.getAccessToken() === stale ? Promise.reject(unauthorized()) : Promise.resolve('ok'));
    await expect(Promise.all(Array.from({ length: 5 }, () => manager.authorized(call)))).resolves.toEqual(Array(5).fill('ok'));
    expect(api.stats.refreshCalls).toBe(1);
  });

  it('si la renovación es rechazada (vencida o reutilizada) limpia todo y avisa "por seguridad"', async () => {
    const session = memoryStorage();
    const api = fakeApi(() => T0);
    const { manager } = tab({ api, session });
    await manager.login({ email: 'a@b.cc', password: 'x'.repeat(12) });
    api.stats.revoked = true;
    await expect(manager.refresh()).rejects.toThrow();
    expect(manager.getState()).toMatchObject({ status: 'anonymous', user: null, ended: 'security' });
    expect(manager.getAccessToken()).toBeUndefined();
    expect(session.dump()['backoffice.auth.refresh']).toBeUndefined();
  });

  it('un error de red al renovar NO cierra la sesión', async () => {
    const api = fakeApi(() => T0);
    const { manager } = tab({ api });
    await manager.login({ email: 'a@b.cc', password: 'x'.repeat(12) });
    api.refresh = async () => {
      throw new ApiError({ status: 0, code: 'NETWORK' });
    };
    await expect(manager.refresh()).rejects.toMatchObject({ code: 'NETWORK' });
    expect(manager.getState().status).toBe('authenticated');
  });
});

describe('entre pestañas', () => {
  it('dos pestañas con la sesión compartida (pestaña duplicada) nunca usan el mismo refresh token', async () => {
    const api = fakeApi(() => T0);
    const session = memoryStorage();
    const lock = createLocalLock(); // el mismo candado para ambas, como navigator.locks
    const bus = fakeBus();
    const a = tab({ api, session, lock, channel: bus.channel() }).manager;
    const b = tab({ api, session, lock, channel: bus.channel() }).manager;
    await a.login({ email: 'a@b.cc', password: 'x'.repeat(12) });
    await b.restore();
    // Las dos renuevan "a la vez".
    await Promise.all([a.refresh(), b.refresh(), a.refresh(), b.refresh()]);
    expect(api.stats.reuseDetected).toBe(0);
    expect(a.getState().status).toBe('authenticated');
    expect(b.getState().status).toBe('authenticated');
  });

  it('una pestaña duplicada (copia vieja en su sessionStorage) recibe el token nuevo y no lo reusa', async () => {
    const api = fakeApi(() => T0);
    const local = memoryStorage();
    const lock = createLocalLock();
    const bus = fakeBus();
    const sessionA = memoryStorage();
    const a = tab({ api, session: sessionA, local, lock, channel: bus.channel() }).manager;
    await a.login({ email: 'a@b.cc', password: 'x'.repeat(12) });
    // "Duplicar pestaña" copia el sessionStorage.
    const sessionB = memoryStorage();
    sessionB.setItem('backoffice.auth.refresh', sessionA.getItem('backoffice.auth.refresh')!);
    const b = tab({ api, session: sessionB, local, lock, channel: bus.channel() }).manager;
    await a.refresh();
    await b.restore();
    expect(api.stats.reuseDetected).toBe(0);
    expect(b.getState().status).toBe('authenticated');
  });

  it('si la copia vieja no recibe el aviso, la pestaña NO la envía (evita revocar la sesión de todas)', async () => {
    const api = fakeApi(() => T0);
    const local = memoryStorage();
    const sessionA = memoryStorage();
    const a = tab({ api, session: sessionA, local }).manager; // sin canal compartido
    await a.login({ email: 'a@b.cc', password: 'x'.repeat(12) });
    const sessionB = memoryStorage();
    sessionB.setItem('backoffice.auth.refresh', sessionA.getItem('backoffice.auth.refresh')!);
    await a.refresh(); // rota y marca la huella del token viejo en localStorage
    const b = tab({ api, session: sessionB, local }).manager;
    await b.restore();
    expect(api.stats.reuseDetected).toBe(0);
    expect(b.getState().status).toBe('anonymous');
    expect(a.getState().status).toBe('authenticated');
  });

  it('cerrar sesión en una pestaña la cierra en las demás del mismo usuario', async () => {
    const api = fakeApi(() => T0);
    const session = memoryStorage();
    const bus = fakeBus();
    const lock = createLocalLock();
    const a = tab({ api, session, lock, channel: bus.channel() }).manager;
    const b = tab({ api, session, lock, channel: bus.channel() }).manager;
    await a.login({ email: 'a@b.cc', password: 'x'.repeat(12) });
    await b.restore();
    await a.logout();
    expect(api.stats.logoutCalls).toHaveLength(1);
    expect(b.getState()).toMatchObject({ status: 'anonymous', ended: 'elsewhere' });
    expect(session.dump()['backoffice.auth.refresh']).toBeUndefined();
  });
});

describe('cierre de sesión y restauración', () => {
  it('si POST /auth/logout falla, la sesión local se cierra igual', async () => {
    const session = memoryStorage();
    const api = fakeApi(() => T0);
    const { manager } = tab({ api, session });
    await manager.login({ email: 'a@b.cc', password: 'x'.repeat(12) });
    api.logout = async () => {
      throw new ApiError({ status: 0, code: 'NETWORK' });
    };
    await manager.logout();
    expect(manager.getState()).toMatchObject({ status: 'anonymous', ended: null });
    expect(session.dump()['backoffice.auth.refresh']).toBeUndefined();
  });

  it('sin token guardado, restaurar termina en "anónimo" sin llamar a la API', async () => {
    const api = fakeApi(() => T0);
    const { manager } = tab({ api });
    expect(manager.getState().status).toBe('restoring');
    await manager.restore();
    expect(manager.getState().status).toBe('anonymous');
    expect(api.stats.refreshCalls).toBe(0);
  });

  it('sin conexión al restaurar: "no disponible" (no anónimo), el token sigue guardado y reintentar funciona', async () => {
    const api = fakeApi(() => T0);
    const session = memoryStorage();
    await tab({ api, session }).manager.login({ email: 'a@b.cc', password: 'x'.repeat(12) });
    const realMe = api.me;
    api.me = async () => {
      throw new ApiError({ status: 0, code: 'NETWORK' });
    };
    const reloaded = tab({ api, session }).manager;
    await reloaded.restore();
    expect(reloaded.getState()).toMatchObject({ status: 'unavailable', user: null, ended: null, restoreError: { code: 'NETWORK' } });
    expect(session.dump()['backoffice.auth.refresh']).toBeDefined();
    api.me = realMe;
    const refreshes = api.stats.refreshCalls;
    await reloaded.retryRestore();
    expect(reloaded.getState()).toMatchObject({ status: 'authenticated', user: USER });
    // El access token de la renovación anterior sigue vigente: el reintento no renueva otra vez.
    expect(api.stats.refreshCalls).toBe(refreshes);
  });

  it('restaurar dos veces (StrictMode) hace una sola renovación', async () => {
    const api = fakeApi(() => T0);
    const session = memoryStorage();
    const first = tab({ api, session }).manager;
    await first.login({ email: 'a@b.cc', password: 'x'.repeat(12) });
    const reloaded = tab({ api, session }).manager;
    await Promise.all([reloaded.restore(), reloaded.restore()]);
    expect(api.stats.refreshCalls).toBe(1);
    expect(reloaded.getState()).toMatchObject({ status: 'authenticated', user: USER });
  });

});
