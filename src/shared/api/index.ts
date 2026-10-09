import type { AdminApi } from './AdminApi';
import { apiConfig } from './config';
import { createDemoAdminApi } from './demo/DemoAdminApi';
import { resetIds } from './demo/ids';
import { createHttpClient } from './http/client';
import { getApiMode, subscribeApiMode } from './mode';
import { createRealAdminApi } from './RealAdminApi';
import { currentAccessToken } from './authBridge';

export * from './AdminApi';
export * from './contract';
export { ApiError, errorMessage, fieldLabel, isApiError, loginErrorMessage } from './errors';
export { apiConfig, readApiUrl } from './config';
export { getApiMode, setApiMode, useApiMode, useIsDemo, type ApiMode } from './mode';
export { setAuthBridge, authorized } from './authBridge';
export { useServerWaking } from './http/useServerWaking';
export { createHttpClient } from './http/client';
export { createDemoAdminApi } from './demo/DemoAdminApi';
export { createRealAdminApi } from './RealAdminApi';

const httpClient = createHttpClient({ baseUrl: apiConfig.apiUrl, getAccessToken: currentAccessToken });
const real = createRealAdminApi(httpClient);
let demo: AdminApi | null = null;

// Cada vez que se entra al modo demo se parte de datos de ejemplo nuevos.
subscribeApiMode(() => {
  demo = null;
});

function current(): AdminApi {
  if (getApiMode() === 'demo') {
    if (!demo) {
      resetIds();
      demo = createDemoAdminApi();
    }
    return demo;
  }
  return real;
}

/** La API que usa la interfaz: delega en la real o en la demo según el modo vigente. */
export const adminApi: AdminApi = new Proxy({} as AdminApi, {
  get: (_target, key) => current()[key as keyof AdminApi],
});

/** Despierta el servidor gratuito de Render en segundo plano (solo con la API real; nunca en demo). */
export function warmUpServer(): void {
  if (getApiMode() === 'demo') return;
  void httpClient.request('GET', '/health', { silent: true }).catch(() => undefined);
}
