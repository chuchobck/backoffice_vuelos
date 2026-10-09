/**
 * Configuración en tiempo de ejecución: `public/config.js` define `window.BACKOFFICE_CONFIG`
 * y se carga desde index.html antes de la aplicación. Cambiar la URL de la API es editar ese
 * archivo en el sitio publicado: no hace falta recompilar ni usar variables de entorno.
 */
export interface BackofficeConfig {
  API_URL?: string;
}

declare global {
  interface Window {
    BACKOFFICE_CONFIG?: BackofficeConfig;
  }
}

const DEFAULT_API_URL = 'https://quinde-vuelos-api.onrender.com/flights/v1';

/** URL base de la API real (sin barra final). Con `config.js` ausente, la de producción. */
export function readApiUrl(config: BackofficeConfig | undefined = typeof window === 'undefined' ? undefined : window.BACKOFFICE_CONFIG): string {
  const value = (config?.API_URL ?? '').trim();
  return (value || DEFAULT_API_URL).replace(/\/+$/, '');
}

export const apiConfig = {
  apiUrl: readApiUrl(),
};
