/**
 * Única fuente de las rutas de la aplicación. Ningún componente escribe una ruta como texto:
 * usa `paths` (patrones del router) o `routes` (enlaces ya armados).
 *
 * Este archivo no importa nada a propósito: es la única pieza de `app/` que `features`
 * puede usar (ver eslint.config.js).
 */

/** Parámetro de la URL que guarda a dónde volver después de ingresar. */
export const RETURN_TO_PARAM = 'volver';

/** Parámetro de la lista de salidas que filtra por número de vuelo (enlace "Ver en la lista"). */
export const FLIGHT_PARAM = 'vuelo';

export const paths = {
  home: '/',
  login: '/ingresar',
  dashboard: '/panel',
  createFlight: '/vuelos/crear',
  departures: '/vuelos',
  flightNumbers: '/numeros-de-vuelo',
  routes: '/rutas',
  fares: '/tarifas',
  bookings: '/reservas',
  airports: '/aeropuertos',
  airlines: '/aerolineas',
  aircraftModels: '/equipos',
  fareFamilies: '/familias-tarifarias',
  seatMaps: '/mapas-de-asientos',
  cities: '/ciudades',
  countries: '/paises',
  admins: '/administradores',
  audit: '/auditoria',
} as const;

function withReturnTo(path: string, returnTo?: string) {
  return returnTo ? `${path}?${RETURN_TO_PARAM}=${encodeURIComponent(returnTo)}` : path;
}

export const routes = {
  home: () => paths.home,
  login: (returnTo?: string) => withReturnTo(paths.login, returnTo),
  dashboard: () => paths.dashboard,
  createFlight: () => paths.createFlight,
  /** Lista de salidas; con `flightNumber` llega ya filtrada (enlace desde el asistente). */
  departures: (flightNumber?: string) => (flightNumber ? `${paths.departures}?${FLIGHT_PARAM}=${encodeURIComponent(flightNumber)}` : paths.departures),
  flightNumbers: () => paths.flightNumbers,
  routes: () => paths.routes,
  fares: () => paths.fares,
  bookings: () => paths.bookings,
  airports: () => paths.airports,
  airlines: () => paths.airlines,
  aircraftModels: () => paths.aircraftModels,
  fareFamilies: () => paths.fareFamilies,
  seatMaps: () => paths.seatMaps,
  cities: () => paths.cities,
  countries: () => paths.countries,
  admins: () => paths.admins,
  audit: () => paths.audit,
} as const;

/**
 * Valida el destino de `?volver=`: solo rutas internas de la aplicación.
 * Evita redirecciones abiertas a otros sitios (`//evil.com`, `https://…`).
 */
export function safeReturnTo(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  if (value.startsWith(paths.login)) return null;
  return value;
}
