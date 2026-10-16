/**
 * Configuración en tiempo de ejecución: `public/config.js` define `window.BACKOFFICE_CONFIG`
 * y se carga desde index.html antes de la aplicación. Cambiar las URLs es editar ese archivo en
 * el sitio publicado: no hace falta recompilar ni usar variables de entorno.
 *
 * Hay DOS bases de URL, una por servicio (todo entra por el gateway):
 * - `API_URL`      → core: catálogo, auditoría, reservas… (`https://<gateway>/flights/v1`)
 * - `IDENTITY_URL` → identity: ingreso, sesión y administradores (`https://<gateway>/identity/v1`)
 *
 * Si `IDENTITY_URL` falta, se deriva de `API_URL` cambiando el sufijo `/flights/v1` por `/identity/v1`
 * (el gateway sirve los dos servicios en el mismo origen). Si `API_URL` no termina así y no hay
 * `IDENTITY_URL`, la configuración es inválida y la aplicación no arranca: lo dice con un mensaje claro.
 */
export interface BackofficeConfig {
  API_URL?: string;
  IDENTITY_URL?: string;
}

declare global {
  interface Window {
    BACKOFFICE_CONFIG?: BackofficeConfig;
  }
}

const DEFAULT_API_URL = 'https://quinde-vuelos-api.onrender.com/flights/v1';
const CORE_SUFFIX = /\/flights\/v1$/i;
const IDENTITY_SUFFIX = '/identity/v1';

export type ConfigIssueCode = 'API_URL_INVALID' | 'IDENTITY_URL_INVALID' | 'IDENTITY_URL_UNDERIVABLE';

export interface ConfigIssue {
  code: ConfigIssueCode;
  /** El valor recibido (para mostrarlo al operador; son URLs, nunca secretos). */
  value?: string;
}

export interface ResolvedConfig {
  /** Base del core, sin barra final. */
  apiUrl: string;
  /** Base de identity, sin barra final. Vacía si la configuración es inválida. */
  identityUrl: string;
  /** `true` si `IDENTITY_URL` no estaba y se derivó de `API_URL`. */
  identityDerived: boolean;
  /** Vacío si todo está bien. Con algo aquí la aplicación no debe arrancar. */
  issues: ConfigIssue[];
}

/**
 * Una base válida es una URL absoluta http(s) sin credenciales, consulta ni fragmento, o una ruta
 * del mismo origen que empieza con una sola `/` (el proxy de desarrollo). Sin barras finales.
 */
export function normalizeBase(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().replace(/\/+$/, '');
  if (!value) return null;
  if (value.startsWith('/')) return /^\/(?!\/)[^?#\s\\]*$/.test(value) ? value : null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.username || url.password || url.search || url.hash) return null;
    return value;
  } catch {
    return null;
  }
}

/** Resuelve y valida la configuración. Pura: la prueba le pasa el objeto, la aplicación `window.BACKOFFICE_CONFIG`. */
export function resolveConfig(config: BackofficeConfig | undefined): ResolvedConfig {
  const issues: ConfigIssue[] = [];
  const rawApi = config?.API_URL;
  const hasApi = typeof rawApi === 'string' ? rawApi.trim() !== '' : rawApi !== undefined && rawApi !== null;
  const apiUrl = hasApi ? normalizeBase(rawApi) : DEFAULT_API_URL;
  if (apiUrl === null) issues.push({ code: 'API_URL_INVALID', value: String(rawApi) });

  const rawIdentity = config?.IDENTITY_URL;
  const hasIdentity = typeof rawIdentity === 'string' ? rawIdentity.trim() !== '' : rawIdentity !== undefined && rawIdentity !== null;
  let identityUrl = '';
  let identityDerived = false;
  if (hasIdentity) {
    const explicit = normalizeBase(rawIdentity);
    if (explicit === null) issues.push({ code: 'IDENTITY_URL_INVALID', value: String(rawIdentity) });
    else identityUrl = explicit;
  } else if (apiUrl !== null) {
    if (CORE_SUFFIX.test(apiUrl)) {
      identityUrl = apiUrl.replace(CORE_SUFFIX, IDENTITY_SUFFIX);
      identityDerived = true;
    } else {
      issues.push({ code: 'IDENTITY_URL_UNDERIVABLE', value: apiUrl });
    }
  }
  return { apiUrl: apiUrl ?? '', identityUrl, identityDerived, issues };
}

/** La configuración de esta página. */
export const apiConfig: ResolvedConfig = resolveConfig(typeof window === 'undefined' ? undefined : window.BACKOFFICE_CONFIG);
