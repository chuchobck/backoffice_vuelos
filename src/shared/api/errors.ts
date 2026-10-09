import { es, fmt } from '@/shared/i18n';
import type { ProblemCode } from './contract';

/** Códigos que no vienen del contrato: fallas de transporte y un endpoint que la API no tiene. */
export type LocalErrorCode = 'NETWORK' | 'TIMEOUT' | 'NOT_CONNECTED' | 'CONFLICT' | 'SERVICE_UNAVAILABLE';
export type ApiErrorCode = ProblemCode | LocalErrorCode;

export interface FieldError {
  /** Nombre del parámetro tal como lo da la API (p. ej. "cabins[0].totalSeats"). */
  field: string;
  /** Motivo técnico en inglés: nunca se muestra tal cual. */
  message: string;
}

export interface ApiErrorInit {
  /** HTTP status; 0 para errores de red o tiempo agotado. */
  status: number;
  code?: ApiErrorCode;
  title?: string;
  /** Detalle técnico de la API (en inglés). Solo para la consola de desarrollo y para mapear reglas conocidas. */
  detail?: string;
  fieldErrors?: FieldError[];
  /** Segundos de espera de la cabecera Retry-After. */
  retryAfter?: number;
}

/** Error normalizado de la capa de datos (ProblemDetails, RFC 9457). */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: ApiErrorCode;
  readonly title?: string;
  readonly detail?: string;
  readonly fieldErrors: FieldError[];
  readonly retryAfter?: number;

  constructor({ status, code, title, detail, fieldErrors = [], retryAfter }: ApiErrorInit) {
    super(detail ?? title ?? code ?? `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.title = title;
    this.detail = detail;
    this.fieldErrors = fieldErrors;
    this.retryAfter = retryAfter;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

const e = es.errors;

/** Reglas de negocio conocidas del backend (detail en inglés) → mensaje en español. Nunca se muestra el detail. */
const BUSINESS_RULES: [RegExp, string][] = [
  [/departure must be in the future/i, e.business.departureFuture],
  [/must be after scheduledDeparture/i, e.business.arrivalAfter],
  [/must be different from origin/i, e.business.destinationDifferent],
  [/seat map belongs to airline/i, e.business.seatMapAirline],
  [/seat map has no .* cabin/i, e.business.seatMapNoCabin],
  [/quota cannot exceed/i, e.business.quotaExceeds],
  [/fare family belongs to airline/i, e.business.familyAirline],
  [/departure has no .* cabin/i, e.business.familyNoCabin],
  [/must include the ADULT price/i, e.business.adultPrice],
  [/does not exist or is inactive|is inactive/i, e.business.referenceInactive],
  [/no longer on sale/i, e.business.noLongerOnSale],
  [/already departed/i, e.business.alreadyDeparted],
  [/scheduled in the past/i, e.business.inPast],
  [/reactivate it first/i, e.business.reactivateFirst],
  [/already exists|already been used|is repeated|duplicate/i, e.business.duplicate],
];

function businessMessage(error: ApiError): string | undefined {
  const text = error.detail ?? '';
  if (!text) return undefined;
  return BUSINESS_RULES.find(([re]) => re.test(text))?.[1];
}

/** Nombre de campo (de la API) en español, para listar qué revisar. */
export function fieldLabel(name: string): string {
  const root = name.split(/[.[]/)[0] ?? name;
  const labels = e.fields as Record<string, string>;
  return labels[root] ?? root;
}

/** Mensaje en lenguaje del usuario: qué pasó y qué hacer. Nunca devuelve el `detail` de la API. */
export function errorMessage(error: unknown): string {
  if (!isApiError(error)) return e.unknown;
  switch (error.code) {
    case 'NOT_CONNECTED':
      return e.notConnected;
    case 'TIMEOUT':
      return e.timeout;
    case 'NETWORK':
      return e.network;
    default:
      break;
  }
  const fields = [...new Set(error.fieldErrors.map((f) => fieldLabel(f.field)))];
  const extra = fields.length ? ` ${fmt(e.reviewFields, { fields: fields.join(', ') })}` : '';
  if (error.status === 429) return error.retryAfter ? fmt(e.rateLimited, { seconds: error.retryAfter }) : e.rateLimitedNoTime;
  if (error.status === 0) return e.network;
  if (error.status === 400) return `${e.badRequest400}${extra}`;
  if (error.status === 401) return e.unauthorized401;
  if (error.status === 403) return e.forbidden403;
  if (error.status === 404) return e.notFound404;
  if (error.status === 409) return businessMessage(error) ?? (/still used|in use|is used by|used by/i.test(error.detail ?? '') ? e.conflictInUse : e.conflict409);
  if (error.status === 413) return e.payload413;
  if (error.status === 415) return e.media415;
  if (error.status === 422) return `${businessMessage(error) ?? e.validation422}${extra}`;
  if (error.status === 503) return error.retryAfter ? fmt(e.unavailable503Wait, { seconds: error.retryAfter }) : e.unavailable503;
  if (error.status >= 500) return e.server5xx;
  return e.unknown;
}

/** Mensaje para un error de ingreso: 401 es genérico (no revela si el correo existe). */
export function loginErrorMessage(error: unknown): string {
  if (!isApiError(error)) return e.unknown;
  if (error.status === 401) return es.auth.invalidCredentials;
  if (error.status === 403) return es.auth.notAdmin;
  if (error.status === 429) {
    return error.retryAfter ? fmt(es.auth.tooManyAttempts, { seconds: error.retryAfter }) : es.auth.tooManyAttemptsNoTime;
  }
  if (error.status === 400) return es.auth.invalidData;
  return errorMessage(error);
}
