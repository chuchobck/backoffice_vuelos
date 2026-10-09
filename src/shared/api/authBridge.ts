/**
 * Punto de unión entre la capa de datos y el módulo de sesión (features/auth), sin que `shared`
 * dependa de `features`: la sesión registra aquí cómo obtener el token de acceso vigente y cómo
 * ejecutar una petición con sesión (renovación única y reintento tras un 401).
 */
interface Bridge {
  getAccessToken: () => string | undefined;
  authorized: <T>(call: () => Promise<T>) => Promise<T>;
}

let bridge: Bridge = {
  getAccessToken: () => undefined,
  authorized: (call) => call(),
};

export function setAuthBridge(next: Bridge): void {
  bridge = next;
}

export const currentAccessToken = () => bridge.getAccessToken();
export const authorized = <T>(call: () => Promise<T>): Promise<T> => bridge.authorized(call);
