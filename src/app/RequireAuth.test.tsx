// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthProvider, createLocalLock, createTokenStore, SessionManager } from '@/features/auth';
import { ApiError, type AuthApi, type AuthTokens, type User } from '@/shared/api';
import { es } from '@/shared/i18n';
import { RequireAuth } from './RequireAuth';
import { paths, RETURN_TO_PARAM, safeReturnTo } from './routes';

const USER: User = { id: 'u1', email: 'admin@example.test', roles: ['administrador'], scopes: ['flights:admin'], createdAt: '2026-10-07T00:00:00Z' };
const TOKENS: AuthTokens = { accessToken: 'a.b.c', refreshToken: 'r'.repeat(43), expiresIn: 900, scope: 'flights:admin' };

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) };
}

/** Sesión con una API falsa cuya renovación se resuelve cuando la prueba lo decide. */
function manager({ storedToken, refresh }: { storedToken: boolean; refresh?: AuthApi['refresh'] }) {
  let finishRefresh!: () => void;
  const refreshGate = new Promise<void>((r) => (finishRefresh = r));
  const api: AuthApi = {
    login: async () => TOKENS,
    refresh:
      refresh ??
      (async () => {
        await refreshGate;
        return TOKENS;
      }),
    logout: async () => undefined,
    me: async () => USER,
  };
  const session = memoryStorage();
  if (storedToken) session.setItem('backoffice.auth.refresh', 'r'.repeat(43));
  const m = new SessionManager({
    api,
    store: createTokenStore(session, memoryStorage()),
    lock: createLocalLock(),
    channel: { post: () => undefined, listen: () => () => undefined },
    schedule: () => () => undefined,
  });
  return { m, finishRefresh };
}

function LoginProbe() {
  const { search } = useLocation();
  return <p data-testid="login">{new URLSearchParams(search).get(RETURN_TO_PARAM)}</p>;
}

function renderAt(m: SessionManager, url: string) {
  const router = createMemoryRouter(
    [
      { element: <RequireAuth />, children: [{ path: '/vuelos/*', element: <p>Privado</p> }] },
      { path: paths.login, element: <LoginProbe /> },
    ],
    { initialEntries: [url] },
  );
  render(
    <AuthProvider manager={m}>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
}

afterEach(cleanup);

describe('RequireAuth', () => {
  it('mientras se restaura la sesión no redirige ni muestra la página; luego muestra la página', async () => {
    const { m, finishRefresh } = manager({ storedToken: true });
    renderAt(m, '/vuelos');
    expect(screen.getByText(es.session.restoring)).toBeTruthy();
    expect(screen.queryByTestId('login')).toBeNull();
    expect(screen.queryByText('Privado')).toBeNull();
    await act(async () => finishRefresh());
    expect(await screen.findByText('Privado')).toBeTruthy();
  });

  it('sin sesión manda a /ingresar guardando a dónde iba (ruta, query y ancla)', async () => {
    const { m } = manager({ storedToken: false });
    renderAt(m, '/vuelos/crear?vuelo=AV1500#paso');
    const returnTo = (await screen.findByTestId('login')).textContent;
    expect(returnTo).toBe('/vuelos/crear?vuelo=AV1500#paso');
    expect(safeReturnTo(returnTo)).toBe('/vuelos/crear?vuelo=AV1500#paso');
  });

  it('sin conexión al restaurar no manda a /ingresar: lo explica y reintentar entra', async () => {
    let offline = true;
    const { m } = manager({
      storedToken: true,
      refresh: async () => {
        if (offline) throw new ApiError({ status: 0, code: 'NETWORK' });
        return TOKENS;
      },
    });
    renderAt(m, '/vuelos');
    expect(await screen.findByText(es.session.unavailable)).toBeTruthy();
    expect(screen.getByText(es.errors.network)).toBeTruthy();
    expect(screen.queryByTestId('login')).toBeNull();
    offline = false;
    fireEvent.click(screen.getByRole('button', { name: es.common.retry }));
    expect(await screen.findByText('Privado')).toBeTruthy();
  });

  it('si la renovación al restaurar es rechazada, termina en /ingresar', async () => {
    const { m } = manager({
      storedToken: true,
      refresh: async () => {
        throw new ApiError({ status: 401, code: 'VALIDATION_FAILED' });
      },
    });
    renderAt(m, '/vuelos');
    expect((await screen.findByTestId('login')).textContent).toBe('/vuelos');
  });
});

describe('safeReturnTo (sin redirecciones abiertas)', () => {
  it('acepta solo rutas internas', () => {
    expect(safeReturnTo('/tarifas')).toBe('/tarifas');
    expect(safeReturnTo('//evil.com')).toBeNull();
    expect(safeReturnTo('https://evil.com')).toBeNull();
    expect(safeReturnTo('/\\evil.com')).toBeNull();
    expect(safeReturnTo('/ingresar?volver=/x')).toBeNull();
    expect(safeReturnTo(null)).toBeNull();
  });
});
