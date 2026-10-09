/**
 * Contrato de datos de la interfaz: la UI solo conoce `AdminApi`. Tiene dos implementaciones con la
 * misma forma de respuestas: `RealAdminApi` (HTTP contra /flights/v1) y `FakeAdminApi` (solo pruebas, en memoria,
 * sin ninguna llamada de red).
 */
import type {
  AircraftModel, Airline, Airport, City, Country, CreateAircraftModel, CreateAirline, CreateAirport, CreateCity, CreateCountry,
  CreateDeparture, CreateFare, CreateFareFamily, CreateFlightNumber, CreateSeatMap, Departure, Fare, FareFamily, FlightNumber,
  SeatMap, SeatMapSummary, UpdateAircraftModel, UpdateAirline, UpdateAirport, UpdateCity, UpdateCountry, UpdateDeparture,
  UpdateFare, UpdateFareFamily, UpdateFlightNumber, UpdateSeatMap, UserDto,
} from './contract';

export interface Page<T> {
  items: T[];
  /** Sin `nextCursor` no hay más páginas. */
  nextCursor?: string;
}

export interface ListQuery {
  /** De 1 a 50 (10 por defecto en la API). */
  limit?: number;
  cursor?: string;
  includeInactive?: boolean;
  /** Filtros propios de cada recurso (país, aerolínea, fechas…). Los vacíos se ignoran. */
  filters?: Record<string, string | undefined>;
}

/** CRUD de un recurso de `/admin`. Eliminar es siempre una baja lógica (`deactivate`). */
export interface Resource<T, C, U, D = T> {
  list(query?: ListQuery): Promise<Page<T>>;
  get(id: string): Promise<D>;
  create(body: C): Promise<D>;
  update(id: string, body: U): Promise<D>;
  /** Baja lógica (204). En una salida es cancelarla. */
  deactivate(id: string): Promise<void>;
  reactivate(id: string): Promise<D>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Segundos de vida del token de acceso. */
  expiresIn: number;
  scope: string;
}

export type User = UserDto;

export interface Credentials {
  email: string;
  password: string;
}

export interface AuthApi {
  login(credentials: Credentials): Promise<AuthTokens>;
  refresh(refreshToken: string): Promise<AuthTokens>;
  logout(refreshToken: string): Promise<void>;
  me(): Promise<User>;
}

export type ResourceName =
  | 'countries' | 'cities' | 'airports' | 'airlines' | 'aircraftModels' | 'fareFamilies'
  | 'seatMaps' | 'flightNumbers' | 'departures' | 'fares';

export interface AdminApi {
  auth: AuthApi;
  countries: Resource<Country, CreateCountry, UpdateCountry>;
  cities: Resource<City, CreateCity, UpdateCity>;
  airports: Resource<Airport, CreateAirport, UpdateAirport>;
  airlines: Resource<Airline, CreateAirline, UpdateAirline>;
  aircraftModels: Resource<AircraftModel, CreateAircraftModel, UpdateAircraftModel>;
  fareFamilies: Resource<FareFamily, CreateFareFamily, UpdateFareFamily>;
  /** La lista trae resúmenes; el detalle trae además las filas y los asientos. */
  seatMaps: Resource<SeatMapSummary, CreateSeatMap, UpdateSeatMap, SeatMap>;
  flightNumbers: Resource<FlightNumber, CreateFlightNumber, UpdateFlightNumber>;
  departures: Resource<Departure, CreateDeparture, UpdateDeparture>;
  fares: Resource<Fare, CreateFare, UpdateFare>;
}

/** Ruta de cada recurso bajo /flights/v1/admin. */
export const RESOURCE_PATHS: Record<ResourceName, string> = {
  countries: '/admin/countries',
  cities: '/admin/cities',
  airports: '/admin/airports',
  airlines: '/admin/airlines',
  aircraftModels: '/admin/aircraft-models',
  fareFamilies: '/admin/fare-families',
  seatMaps: '/admin/seat-maps',
  flightNumbers: '/admin/flights',
  departures: '/admin/departures',
  fares: '/admin/fares',
};
