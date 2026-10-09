import { RESOURCE_PATHS, type AdminApi, type AuthApi, type ListQuery, type Page, type Resource } from './AdminApi';
import { authorized } from './authBridge';
import type { HttpClient } from './http/client';
import type { TokenResponseDto } from './contract';

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
  };
}
