import { AUDIT_LOG_PATH, BOOKINGS_PATH, RESOURCE_PATHS, type AdminApi, type AuthApi, type BookingsApi, type ListQuery, type Page, type Resource } from './AdminApi';
import { authorized } from './authBridge';
import type { HttpClient } from './http/client';
import type { AdminUser, AuditEvent, BookingDetail, BookingSummary, CreateAdminUser, TokenResponseDto } from './contract';
import { ApiError } from './errors';

function listQuery(q: ListQuery = {}): Record<string, string> {
  const out: Record<string, string> = {};
  if (q.limit !== undefined) out.limit = String(q.limit);
  if (q.cursor) out.cursor = q.cursor;
  if (q.includeInactive) out.includeInactive = 'true';
  for (const [k, v] of Object.entries(q.filters ?? {})) if (v !== undefined && v !== '') out[k] = v;
  return out;
}

const enc = encodeURIComponent;

/** Recurso HTTP genérico: todas las llamadas de /admin llevan sesión (renovación única y reintento tras 401). */
function resource<T, C, U, D = T>(client: HttpClient, base: string): Resource<T, C, U, D> {
  return {
    list: (q) => authorized(() => client.request<Page<T>>('GET', base, { auth: true, retry: true, query: listQuery(q) })),
    get: (id) => authorized(() => client.request<D>('GET', `${base}/${enc(id)}`, { auth: true, retry: true })),
    create: (body) => authorized(() => client.request<D>('POST', base, { auth: true, body })),
    update: (id, body) => authorized(() => client.request<D>('PATCH', `${base}/${enc(id)}`, { auth: true, body })),
    deactivate: async (id) => {
      await authorized(() => client.request<void>('DELETE', `${base}/${enc(id)}`, { auth: true }));
    },
    reactivate: (id) => authorized(() => client.request<D>('POST', `${base}/${enc(id)}/reactivate`, { auth: true })),
  };
}

const toTokens = (t: TokenResponseDto) => ({ accessToken: t.access_token, refreshToken: t.refresh_token, expiresIn: t.expires_in, scope: t.scope });

/** Los dos servicios que habla el backoffice (los dos detrás del gateway): cada uno con su base de URL. */
export interface ServiceClients {
  /** Core: catálogo, auditoría, reservas… (`API_URL`). */
  core: HttpClient;
  /** Identity: ingreso, sesión y administradores (`IDENTITY_URL`). */
  identity: HttpClient;
}

/**
 * Una llamada a identity. Si identity no está configurada, está caída o no tiene la ruta (404 en una ruta
 * que nunca es "no existe el registro", 502/503/504 del gateway, red o tiempo agotado), el error se marca
 * `service: 'identity'` para que la interfaz diga "identity no disponible" y no "el core no tiene el endpoint".
 * Un 404 de DELETE /admin/users/{id} sí puede ser "no existe ese administrador": `notFoundIsMissing: false`.
 */
async function viaIdentity<T>(call: () => Promise<T>, { notFoundIsMissing = true } = {}): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (error instanceof ApiError && !error.service) {
      const unavailable = error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504 || (notFoundIsMissing && error.status === 404);
      if (unavailable) throw new ApiError({ status: error.status, code: error.code, title: error.title, detail: error.detail, retryAfter: error.retryAfter, service: 'identity' });
    }
    throw error;
  }
}

function authApi(identity: HttpClient): AuthApi {
  return {
    // Ingreso y renovación son públicos: nunca llevan Bearer. Van a identity ({IDENTITY_URL}/auth/*).
    login: async (c) => toTokens(await viaIdentity(() => identity.request<TokenResponseDto>('POST', '/auth/login', { body: { email: c.email, password: c.password } }))),
    refresh: async (refreshToken) => toTokens(await viaIdentity(() => identity.request<TokenResponseDto>('POST', '/auth/refresh', { body: { refresh_token: refreshToken } }))),
    logout: async (refreshToken) => {
      await viaIdentity(() => identity.request<void>('POST', '/auth/logout', { auth: true, body: { refresh_token: refreshToken } }));
    },
    me: () => viaIdentity(() => identity.request('GET', '/auth/me', { auth: true, retry: true })),
  };
}

/**
 * Un 404 en la RUTA DE LA COLECCIÓN (lista o alta) no puede ser "no existe el registro": es que la API desplegada todavía
 * no tiene ese endpoint (p. ej. producción sin el cambio de /admin/users). Se avisa con un mensaje propio, no con "no se encontró".
 */
async function ifEndpointExists<T>(path: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) throw new ApiError({ status: 404, code: 'NOT_CONNECTED', detail: path });
    throw error;
  }
}

/**
 * Administradores: viven en identity ({IDENTITY_URL}/admin/users), no en el core. La API solo lista, crea y da de baja:
 * sin detalle, edición ni reactivación (la interfaz no los ofrece).
 */
function adminsResource(identity: HttpClient): Resource<AdminUser, CreateAdminUser, never> {
  const missing = () => Promise.reject(new ApiError({ status: 0, code: 'NOT_CONNECTED' }));
  const base = resource<AdminUser, CreateAdminUser, never>(identity, '/admin/users');
  return {
    list: (q) => viaIdentity(() => base.list(q)),
    create: (body) => viaIdentity(() => base.create(body)),
    deactivate: (id) => viaIdentity(() => base.deactivate(id), { notFoundIsMissing: false }),
    get: missing,
    update: missing,
    reactivate: missing,
  };
}

function bookingsApi(client: HttpClient): BookingsApi {
  return {
    list: (q) => ifEndpointExists(BOOKINGS_PATH, () => authorized(() => client.request<Page<BookingSummary>>('GET', BOOKINGS_PATH, { auth: true, retry: true, query: listQuery(q) }))),
    get: (id) => authorized(() => client.request<BookingDetail>('GET', `${BOOKINGS_PATH}/${enc(id)}`, { auth: true, retry: true })),
    // La clave de idempotencia la decide quien llama (una por intento): aquí solo viaja en la cabecera.
    cancel: (id, idempotencyKey, reason) =>
      authorized(() =>
        client.request<BookingDetail>('POST', `${BOOKINGS_PATH}/${enc(id)}/cancel`, {
          auth: true,
          headers: { 'Idempotency-Key': idempotencyKey },
          body: reason ? { reason } : {},
        }),
      ),
  };
}

/**
 * Implementación HTTP de `AdminApi` contra la API real (única que usa el cliente `fetch`). Qué ruta va a qué servicio:
 * `auth/*` y `admin/users` → identity; todo lo demás (catálogo, auditoría, reservas…) → core.
 */
export function createRealAdminApi({ core: client, identity }: ServiceClients): AdminApi {
  return {
    auth: authApi(identity),
    countries: resource(client, RESOURCE_PATHS.countries),
    cities: resource(client, RESOURCE_PATHS.cities),
    airports: resource(client, RESOURCE_PATHS.airports),
    airlines: resource(client, RESOURCE_PATHS.airlines),
    aircraftModels: resource(client, RESOURCE_PATHS.aircraftModels),
    fareFamilies: resource(client, RESOURCE_PATHS.fareFamilies),
    seatMaps: resource(client, RESOURCE_PATHS.seatMaps),
    flightNumbers: resource(client, RESOURCE_PATHS.flightNumbers),
    departures: resource(client, RESOURCE_PATHS.departures),
    fares: resource(client, RESOURCE_PATHS.fares),
    admins: adminsResource(identity),
    auditLog: {
      list: (q) => ifEndpointExists(AUDIT_LOG_PATH, () => authorized(() => client.request<Page<AuditEvent>>('GET', AUDIT_LOG_PATH, { auth: true, retry: true, query: listQuery(q) }))),
    },
    bookings: bookingsApi(client),
  };
}
