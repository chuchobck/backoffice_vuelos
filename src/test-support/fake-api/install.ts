import { setAdminApi } from '@/shared/api';
import { createFakeAdminApi } from './FakeAdminApi';

/** Solo para las pruebas E2E (compilación con VITE_E2E): instala la API de prueba y no hace ninguna llamada de red. */
export function installFakeApi(): void {
  const api = createFakeAdminApi();
  setAdminApi(api);
  // Solo en la compilación E2E: el recorrido de la puerta de embarque necesita pases con firma válida y simular el check-in.
  Object.assign(globalThis, { __quindeFake: api.boardingControls });
}
