import type { AdminApi } from './AdminApi';
import { apiConfig } from './config';
import { createDemoAdminApi } from './demo/DemoAdminApi';
import { resetIds } from './demo/ids';
import { createHttpClient } from './http/client';
import { getApiMode, subscribeApiMode } from './mode';
import { createRealAdminApi } from './RealAdminApi';
import { currentAccessToken } from './authBridge';

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
export * from './queries';
