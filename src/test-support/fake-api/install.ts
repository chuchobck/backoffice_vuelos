import { setAdminApi } from '@/shared/api';
import { createFakeAdminApi } from './FakeAdminApi';

/** Solo para las pruebas E2E (compilación con VITE_E2E): instala la API de prueba y no hace ninguna llamada de red. */
export function installFakeApi(): void {
  setAdminApi(createFakeAdminApi());
}
