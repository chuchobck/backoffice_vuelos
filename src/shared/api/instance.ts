import type { AdminApi } from './AdminApi';
import { apiConfig } from './config';
import { createHttpClient } from './http/client';
import { createRealAdminApi } from './RealAdminApi';
import { currentAccessToken } from './authBridge';

// Dos bases, una por servicio, y el MISMO token de acceso para las dos (lo emite identity, el core lo verifica).
const coreClient = createHttpClient({ baseUrl: apiConfig.apiUrl, getAccessToken: currentAccessToken });
const identityClient = createHttpClient({ baseUrl: apiConfig.identityUrl, getAccessToken: currentAccessToken });
let api: AdminApi = createRealAdminApi({ core: coreClient, identity: identityClient });
let replaced = false;

/** La API que usa la interfaz: siempre la real (core e identity detrás del gateway). */
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

/** Despierta en segundo plano los servicios gratuitos de Render, core e identity (con una API de prueba instalada no hay nada que despertar). */
export function warmUpServer(): void {
  if (replaced || apiConfig.issues.length > 0) return;
  void coreClient.request('GET', '/health', { silent: true }).catch(() => undefined);
  void identityClient.request('GET', '/health', { silent: true }).catch(() => undefined);
}
