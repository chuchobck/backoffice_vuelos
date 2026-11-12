# F5 · Puerta de embarque y check-in por pasajero: notas

Decisiones tomadas sin consultar y lo que no se pudo verificar. El detalle funcional está en el [README](../README.md#puerta-de-embarque-y-check-in-por-pasajero-f5).

## Base de la rama

- La rama base del repo es `feat/backoffice-react` (`main` no trae la aplicación): `feat/puerta-embarque` sale de ahí y el PR apunta ahí.
- `fix/config-azure`: no tiene commits sin fusionar respecto a la base (el PR #4 ya está dentro de `feat/backoffice-react`). No se mezcló nada.
- `public/config.js` no se tocó.

## Contrato

- `contracts/backend-openapi.json` no traía las rutas de embarque ni `departureGate`. Se refrescó desde el backend de la rama `main`
  (commit `942b619`, PR 14), pero **no se pudo bajar de la API desplegada**: el gateway de Azure no publica `/api/docs-json` sin
  token (404 en `/api/docs-json`, 401 en `/flights/v1/docs-json`). Se hizo así: se compiló `main` en una copia temporal, se
  arrancó con una base de datos inexistente y secretos desechables y se guardó su `GET /api/docs-json` (mismo procedimiento que
  documenta `contracts/PROCEDENCIA.md`: copiar el documento del backend). Los tipos se generaron con `npm run api:types`; ninguno se
  escribió a mano.
- El refresco trae 67 rutas (eran 61): las 2 de embarque de `admin`, 3 de `kiosk` y `airports/{iataCode}/departures`. El backoffice solo
  usa las 2 de embarque. El diff del JSON es grande (~3300 líneas) porque `main` del backend cambió más cosas desde la copia anterior.
- **No verificado**: que el backend desplegado en Azure ya sea `main` (el prompt lo da por hecho). Si fuera anterior, `scan`/`manifest`
  responderían 404 y la pantalla diría "La salida no existe" (el 404 de un escaneo es genérico).

## Decisiones

1. **"Ver reserva" navega, no importa.** Un módulo de `features` no puede importar de otro, así que `embarque` no puede usar
   `BookingDetailDialog`. El botón es un enlace a `/reservas?pnr=K7M2QX` (`routes.bookings(pnr)` y `PNR_PARAM` en `routes.ts`);
   `BookingsPage` valida el parámetro (6 letras o dígitos, si no se ignora) y `BookingsScreen` filtra por ese PNR y abre el detalle una
   sola vez. No se duplicó nada.
2. **Elegir la salida**: fecha (hoy en hora de Ecuador por defecto) + lista de las salidas de ese día, con la lista de salidas existente
   (`useAllItems('departures')` con `dateFrom`/`dateTo`). Las canceladas no salen (la lista oculta las dadas de baja). No se
   autoselecciona aunque haya una sola: el agente elige a propósito.
3. **Validación local mínima**: se recorta el texto y se exige que empiece con `BP1|` y traiga algo más. Si no, se muestra el mismo
   mensaje de "formato inválido" sin llamar a la API. Un Enter con el campo vacío no hace nada.
4. **El nombre vive solo en la mutación**: `useScanBoarding` usa `gcTime: 0`; `BoardingGate` hace `reset()` a los 8 s (el temporizador
   se reinicia con cada resultado), al siguiente escaneo y al desmontar. El escaneo no se reintenta solo (`retry` no se pasa; una lectura
   sí). El manifiesto sí se cachea (no trae nombres).
5. **El campo no se bloquea mientras responde el servidor** ni el botón usa `loading`: `Button` con `loading` cancela el envío, y un
   lector rápido perdería pases.
6. **Conteos**: barras con `role="progressbar"` y el valor en texto. Se muestran "con check-in" y "abordados" sobre los vendidos; las de
   infantes solo si hay infantes. "Vendidos" es un número grande, no una barra (no tiene total contra qué medir).
7. **Hora de abordaje** solo con la hora ("08:05"), en la zona del aeropuerto de **origen** de la salida (la tabla es de una sola salida
   y un solo día). Se agregó `formatLocalTime` a `shared/lib/dates.ts` y la opción `timeOnly` a `ZonedTime`.
8. **Check-in por pasajero**: solo se pide el manifiesto de las salidas donde alguien de la reserva tiene asiento (no hay llamada si no
   hay asientos: "Sin asiento"). Cada salida es su propia consulta (misma clave que la de la puerta, sin refresco periódico).
   *Tono de las etiquetas*: Abordó (éxito), Check-in hecho (info), Sin check-in (aviso), Sin asiento y No disponible (neutro): siempre
   icono + texto. Un infante en brazos no tiene asiento: sale "Sin asiento".
9. **Puerta en el asistente "Crear vuelo": no se agregó.** El prompt pide el campo en el formulario de alta/edición de la salida; el
   formulario de la lista es solo de edición (las salidas se crean con el asistente). La puerta se asigna al editar. Si se quiere en
   el paso de horario del asistente, es un cambio pequeño (`StepSchedule`, `plan.ts`).
10. **Estado de la salida**: `DepartureStatusBadge` se movió de `features/departures` a `shared/ui` porque lo usan dos módulos.
11. La pantalla no impide escanear si la salida está cancelada o despegó: lo decide el backend y la pantalla muestra su mensaje.
12. En la API de prueba (`src/test-support/`) se agregó `boarding` con las reglas del backend y `boardingControls` (check-in, infantes, pases
    con firma de prueba). En la compilación E2E se expone como `globalThis.__quindeFake` para poder armar el recorrido; la compilación
    de producción no lo incluye (se comprobó en `dist/`).
13. Historial: el texto "Check-in for flight …" viene del backend en inglés y se dejó tal cual.

## No verificado / límites

- **Nada contra la API real.** No se hizo ningún escaneo (ni ninguna llamada) contra el despliegue; todo está probado con `FakeAdminApi`,
  que reproduce las respuestas del OpenAPI y los `code` documentados. Falta probar con un lector de código de barras físico (el
  comportamiento "escribe y manda Enter" se probó con teclado simulado).
- **`passengerId` del manifiesto vs. el de la reserva**: en el OpenAPI de ambos los ejemplos son del mismo tipo (`ADU1`) y la API
  de prueba los hace coincidir, pero **no se pudo confirmar contra datos reales** que sean los mismos identificadores. Si no
  coinciden, la columna muestra "No disponible" (nunca adivina): hay una prueba de ese caso. Conviene revisarlo con una reserva real con
  check-in hecho.
- **Reservas con asiento y sin fila en el manifiesto** (p. ej. un asiento apartado sin pago) también salen "No disponible".
- Límite de 120 escaneos por minuto: el mensaje es genérico (no se usa `Retry-After`).
- `npm test`: **2 pruebas de `src/app/RequireAuth.test.tsx` fallan, y fallan igual en el commit base `2cbe287`** (sin estos cambios):
  `TypeError: RequestInit: Expected signal ("AbortSignal {}") to be an instance of AbortSignal` (jsdom/undici). Se corre con Node
  v24.20.0 y el proyecto pide Node 22 (`.nvmrc`); no se investigó más. Las otras 262 pasan.
- `npm run e2e`: Playwright pedía el navegador revisión 1194 y la máquina tenía la 1208. Se corrió con `PLAYWRIGHT_BROWSERS_PATH`
  apuntando a una carpeta temporal con un enlace al navegador instalado (sin tocar la caché del usuario ni instalar nada). 67/67.

## Pendiente (fuera de F5)

- **Rol de agente de puerta**: hoy usa `flights:admin`, que también da acceso a todo el catálogo, administradores y reservas. Hace falta un
  rol/scope propio (solo embarque) en el backend e identity.
- **Deshacer un abordaje**: no hay endpoint; no se ofrece.
- **Check-in desde el backoffice**: el backend lo exige al dueño de la reserva; no se ofrece.
- Los mensajes de error del escaneo no muestran cuánto esperar con un 429.
