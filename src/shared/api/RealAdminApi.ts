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

function authApi(client: HttpClient): AuthApi {
  return {
    // Ingreso y renovación son públicos: nunca llevan Bearer.
    login: async (c) => toTokens(await client.request<TokenResponseDto>('POST', '/auth/login', { body: { email: c.email, password: c.password } })),
    refresh: async (refreshToken) => toTokens(await client.request<TokenResponseDto>('POST', '/auth/refresh', { body: { refresh_token: refreshToken } })),
    logout: async (refreshToken) => {
      await client.request<void>('POST', '/auth/logout', { auth: true, body: { refresh_token: refreshToken } });
    },
    me: () => client.request('GET', '/auth/me', { auth: true, retry: true }),
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

/** Administradores: el backend no tiene detalle, edición ni reactivación; la interfaz no los ofrece. */
function adminsResource(client: HttpClient): Resource<AdminUser, CreateAdminUser, never> {
  const missing = () => Promise.reject(new ApiError({ status: 0, code: 'NOT_CONNECTED' }));
  const base = resource<AdminUser, CreateAdminUser, never>(client, RESOURCE_PATHS.admins);
  return {
    ...base,
    list: (q) => ifEndpointExists(RESOURCE_PATHS.admins, () => base.list(q)),
    create: (body) => ifEndpointExists(RESOURCE_PATHS.admins, () => base.create(body)),
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

/** Implementación HTTP de `AdminApi` contra la API real (única que usa el cliente `fetch`). */
export function createRealAdminApi(client: HttpClient): AdminApi {
  return {
    auth: authApi(client),
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
    admins: adminsResource(client),
    auditLog: {
      list: (q) => ifEndpointExists(AUDIT_LOG_PATH, () => authorized(() => client.request<Page<AuditEvent>>('GET', AUDIT_LOG_PATH, { auth: true, retry: true, query: listQuery(q) }))),
    },
    bookings: bookingsApi(client),
  };
}
