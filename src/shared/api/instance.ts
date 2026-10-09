import type { AdminApi } from './AdminApi';
import { apiConfig } from './config';
import { createHttpClient } from './http/client';
import { createRealAdminApi } from './RealAdminApi';
import { currentAccessToken } from './authBridge';

const httpClient = createHttpClient({ baseUrl: apiConfig.apiUrl, getAccessToken: currentAccessToken });
let api: AdminApi = createRealAdminApi(httpClient);
let replaced = false;

/** La API que usa la interfaz: siempre la real (HTTP contra /flights/v1). */
export const adminApi: AdminApi = new Proxy({} as AdminApi, {
  get: (_target, key) => api[key as keyof AdminApi],
});

/**
 * Punto de inyección para pruebas: reemplaza la implementación por una de prueba. Devuelve una función
 * que restaura la real. La aplicación en producción nunca la llama.
 */
export function setAdminApi(replacement: AdminApi): () => void {
  const previous = api;
  api = replacement;
  replaced = true;
  return () => {
    api = previous;
    replaced = false;
  };
}

/** Despierta el servidor gratuito de Render en segundo plano (con una API de prueba instalada no hay nada que despertar). */
export function warmUpServer(): void {
  if (replaced) return;
  void httpClient.request('GET', '/health', { silent: true }).catch(() => undefined);
}
