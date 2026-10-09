/**
 * Nombres cortos para los tipos generados desde `contracts/backend-openapi.json` (npm run api:types).
 * No se editan a mano: si la API cambia, se regeneran.
 */
import type { components } from './generated/backend';

type S = components['schemas'];

export type ProblemDetailsDto = S['ProblemDetails'];
export type ProblemCode = S['CodigoError'];

export type UserDto = S['UsuarioRespuestaDto'];
export type LoginRequestDto = S['LoginDto'];
export type TokenResponseDto = S['TokenRespuestaDto'];

export type Country = S['PaisRespuestaDto'];
export type CreateCountry = S['CrearPaisDto'];
export type UpdateCountry = S['ActualizarPaisDto'];
export type City = S['CiudadRespuestaDto'];
export type CreateCity = S['CrearCiudadDto'];
export type UpdateCity = S['ActualizarCiudadDto'];
export type Airport = S['AeropuertoRespuestaDto'];
export type CreateAirport = S['CrearAeropuertoDto'];
export type UpdateAirport = S['ActualizarAeropuertoDto'];
export type Airline = S['AerolineaRespuestaDto'];
export type CreateAirline = S['CrearAerolineaDto'];
export type UpdateAirline = S['ActualizarAerolineaDto'];
export type AircraftModel = S['ModeloAeronaveRespuestaDto'];
export type CreateAircraftModel = S['CrearModeloAeronaveDto'];
export type UpdateAircraftModel = S['ActualizarModeloAeronaveDto'];
export type FareFamily = S['FamiliaTarifaRespuestaDto'];
export type CreateFareFamily = S['CrearFamiliaTarifaDto'];
export type UpdateFareFamily = S['ActualizarFamiliaTarifaDto'];
export type SeatMapSummary = S['MapaAsientosResumenDto'];
export type SeatMap = S['MapaAsientosRespuestaDto'];
export type SeatRow = S['FilaAsientosDto'];
export type Seat = S['AsientoDto'];
export type CreateSeatMap = S['CrearMapaAsientosDto'];
export type UpdateSeatMap = S['ActualizarMapaAsientosDto'];
export type FlightNumber = S['VueloRespuestaDto'];
export type CreateFlightNumber = S['CrearVueloDto'];
export type UpdateFlightNumber = S['ActualizarVueloDto'];
export type Departure = S['VueloProgramadoRespuestaDto'];
export type CreateDeparture = S['CrearVueloProgramadoDto'];
export type UpdateDeparture = S['ActualizarVueloProgramadoDto'];
export type CabinQuota = S['CupoCabinaDto'];
export type Fare = S['TarifaRespuestaDto'];
export type CreateFare = S['CrearTarifaDto'];
export type UpdateFare = S['ActualizarTarifaDto'];
export type PassengerPrice = S['PrecioPasajeroDto'];

export type CabinClass = CabinQuota['cabinClass'];
export type PassengerType = PassengerPrice['passengerType'];
export type DepartureStatus = Departure['status'];
export type SeatPosition = Seat['position'];

export const CABIN_CLASSES: readonly CabinClass[] = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'];
export const DEPARTURE_STATUSES: readonly DepartureStatus[] = ['SCHEDULED', 'BOARDING', 'DEPARTED', 'DELAYED', 'ARRIVED', 'CANCELLED', 'DIVERTED'];
export const PASSENGER_TYPES: readonly PassengerType[] = ['ADULT', 'YOUTH', 'CHILD', 'INFANT'];
