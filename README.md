# Backoffice de Vuelos

Sistema de administración del módulo de vuelos del **Booking Prototipo** (proyecto Quinde). Es una aplicación React
(Vite + TypeScript) que consume la API de vuelos [`backend_vuelos`](https://github.com/chuchobck/backend_vuelos) con una
cuenta de **administrador** (scope `flights:admin`), en español de Ecuador. Reemplaza al backoffice de un solo
`index.html`, que se conserva como referencia en [`legacy/`](legacy/).

Qué permite hacer:

- **Crear un vuelo** con un asistente de 5 pasos: ruta, aerolínea/equipo/mapa/número de vuelo, horario (fechas
  repetibles hasta 31), cabinas y tarifas, y revisión. Crea el número de vuelo, una salida por fecha y las tarifas de
  cada salida; si algo falla a medias, reintenta solo lo pendiente.
- **Administrar el catálogo** con CRUD completo y baja lógica: salidas, números de vuelo, rutas, tarifas, aeropuertos,
  aerolíneas, equipos, familias tarifarias, mapas de asientos (con alta), ciudades y países.
- **Panel** con conteos reales, **búsqueda en todas las páginas**, orden por columna, detalle de cada registro y **avisos de
  cordura** al editar tarifas (por ejemplo, un total de 4128.00 en un vuelo nacional).

- **Administradores**: lista, crear (correo y contraseña de 12 a 128, con aviso si el correo ya existe) y dar de baja con
  confirmación; la baja de la propia cuenta está bloqueada y, si el servidor rechaza la del último administrador, se muestra el motivo.
- **Reservas** de todos los clientes: filtros (PNR, estado, fechas, correo del cliente, número de vuelo), "Cargar más", detalle
  (itinerarios, pasajeros, boletos, historial) y **cancelación administrativa** con confirmación explícita y una `Idempotency-Key`
  por intento.
- **Auditoría** (solo lectura): filtros (tabla, operación, usuario, id del registro, fechas), "Cargar más" y fila expandible con el
  diff antes/después; los valores sensibles llegan censurados como `[REDACTED]` y se muestran tal cual.

> Estas tres pantallas usan los endpoints `/admin/users`, `/admin/audit-log` y `/admin/bookings` del backend
> ([PR 2 de `backend_vuelos`](https://github.com/chuchobck/backend_vuelos/pull/2)). **Hasta que ese cambio esté desplegado en
> la API de producción, responderán 404** ("la API no tiene ese endpoint"). Ver [Probar las pantallas de administración](#probar-las-pantallas-de-administración-contra-tu-backend-local).

## Contenido

1. [Arquitectura](#arquitectura)
2. [Cómo correr en local](#cómo-correr-en-local)
3. [Configuración de la URL de la API (`config.js`)](#configuración-de-la-url-de-la-api-configjs)
4. [Despliegue en Render (paso a paso)](#despliegue-en-render-paso-a-paso)
5. [Endpoints que usa](#endpoints-que-usa)
6. [Endpoints que faltan en el backend](#endpoints-que-faltan-en-el-backend)
7. [Sesión y seguridad](#sesión-y-seguridad)
8. [Horas y dinero](#horas-y-dinero)
9. [Pruebas](#pruebas)
10. [Decisiones y diferencias con el contrato](#decisiones-y-diferencias-con-el-contrato)

## Arquitectura

```text
src/
  app/        rutas (routes.ts, routeTable.tsx), layout (barra superior, barra lateral, migas, menú móvil), proveedores
  pages/      una página por ruta; SOLO arma piezas (Page + la pantalla de un módulo)
  features/   un módulo funcional por carpeta (ver abajo); un módulo no importa de otro
  shared/
    api/      cliente HTTP (único fetch), AdminApi + RealAdminApi, errores, TanStack Query, tipos generados
    crud/     pantalla genérica de un recurso (tabla, filtros, formularios, detalle, baja/reactivación)
    i18n/     TODOS los textos (es.ts)
    lib/      dinero, fechas y zonas, validadores zod, avisos de tarifa, utilidades
    ui/       componentes base (estilo shadcn escritos a mano sobre Radix)
```

Módulos de `features/`: `auth`, `dashboard`, `flights-wizard`, `departures`, `fares`, `flight-numbers`, `routes`, `airports`,
`airlines`, `aircraft-models`, `fare-families`, `seat-maps`, `cities`, `countries`, `admins`, `audit`, `bookings`.

Reglas (las revisa `npm run lint`, ver `eslint.config.js`):

- `pages` usa `app`, `features` y `shared`. `features` usa `shared` y solo `app/routes.ts`. `shared` no importa de nadie.
- Un módulo de `features` no importa de otro; lo común sube a `shared`. Desde fuera se importa por su `index.ts`.
- Solo `shared/api` hace red. El único `fetch` está en `shared/api/http/client.ts` (`fetch`, `XMLHttpRequest` y `axios`
  están prohibidos fuera de `shared/api`).
- Todos los textos en `shared/i18n/es.ts`; los colores solo con tokens (`tailwind.config.ts` reemplaza la paleta);
  un componente por archivo; las rutas nunca como texto suelto (`src/app/routes.ts`).
- La interfaz conoce solo la interfaz `AdminApi`; hay dos implementaciones con la misma forma de respuestas:
  `RealAdminApi` (HTTP contra `/flights/v1`). Las pruebas la sustituyen por `FakeAdminApi` (`src/test-support/`, en memoria), que nunca se incluye en la compilación de producción.
- Los tipos salen del OpenAPI del backend (`contracts/backend-openapi.json` → `npm run api:types` →
  `src/shared/api/generated/backend.ts`, no se edita a mano). Procedencia en [`contracts/PROCEDENCIA.md`](contracts/PROCEDENCIA.md).

El patrón de cada listado: `features/<módulo>` solo declara una **configuración** (`ResourceConfig`: columnas, filtros,
formulario con zod, detalle, textos de la baja) y `shared/crud/ResourceScreen` pone la tabla accesible, la paginación
por cursor, la búsqueda, el orden, los esqueletos de carga, el vacío y el error, los diálogos y las mutaciones.
Cuando el formulario genérico no alcanza (tarifas con precios por pasajero, alta de mapas de asientos) el módulo aporta su
propio diálogo.

## Cómo correr en local

Requisitos: Node 22 (`.nvmrc`) y npm.

```bash
npm ci
npm run dev        # http://localhost:5173
```

### Contra tu backend local (sin CORS)

En desarrollo (`npm run dev`) el navegador llama a su propio origen (`/flights/v1`) y el servidor de Vite reenvía `/flights` al
backend indicado por `BACKEND_URL` (por defecto `http://localhost:3000`, el puerto por defecto del backend). `public/config.js`
(con la URL de producción) **no se usa** en desarrollo, así que no hay CORS ni hace falta tocar `CORS_ORIGINS`.

Si tu backend corre en otro puerto, copia `.env.example` a `.env.local` (ignorado por git) y ajusta:

```bash
BACKEND_URL=http://localhost:4000
```

Ingresa con tu cuenta de administrador (el backend la siembra con `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`; **nunca** pongas
credenciales en el código, el README ni los commits). Para apuntar el desarrollo a otro servidor (por ejemplo el de Render) basta
con poner esa URL en `BACKEND_URL`.

### Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo (proxy `/flights` → `BACKEND_URL`) |
| `npm run build` | `tsc -b` + `vite build` → `dist/` |
| `npm run typecheck` | TypeScript estricto |
| `npm run lint` | ESLint 9 (typescript-eslint, react-hooks, jsx-a11y, import-x con las reglas de arquitectura) |
| `npm test` | Vitest + Testing Library |
| `npm run e2e` | Compila una versión de pruebas en `dist-e2e/`, levanta `vite preview` y corre Playwright/Chromium (ver [Pruebas](#pruebas)) |
| `npm run api:types` | Regenera los tipos desde `contracts/backend-openapi.json` |

## Configuración de la URL de la API (`config.js`)

La URL de la API se lee **en tiempo de ejecución** de `public/config.js` (se copia a `dist/config.js` y se carga desde
`index.html` antes de la aplicación):

```js
window.BACKOFFICE_CONFIG = {
  API_URL: "https://quinde-vuelos-api.onrender.com/flights/v1"
};
```

- Para cambiarla en el sitio publicado basta editar ese archivo: **no hay que recompilar ni usar variables de entorno**
  en Render. (Se sirve con `Cache-Control: no-cache` en `render.yaml`.)
- Si el archivo falta o `API_URL` está vacía, se usa la URL de producción de arriba.
- En desarrollo, `"/flights/v1"` usa el proxy de Vite (ver arriba).

## Despliegue en Render (paso a paso)

> ### ⚠️ Antes de fusionar a `main`
> El sitio actual en Render es un **Static Site que publica `.` (la raíz) sin comando de build**: sirve el `index.html` de
> un solo archivo. Al fusionar esta rama, la raíz pasa a ser un proyecto Vite (su `index.html` necesita compilarse) y
> `npm ci` necesita un `package.json`. **Hay que cambiar la configuración de Render ANTES de fusionar**, o el sitio en vivo se
> rompe con el primer despliegue de `main`.

### Opción A (la más segura): probar en un sitio nuevo y luego cambiar el actual

1. En Render: **New → Static Site** → repositorio `chuchobck/backoffice_vuelos`, **rama `feat/backoffice-react`**.
2. Configura (ver la tabla de abajo) y crea el sitio. Se despliega sin tocar el sitio en vivo.
3. Agrega su URL a `CORS_ORIGINS` del backend y prueba el flujo completo con tu cuenta de administrador.
4. Cuando todo esté bien, cambia la configuración del sitio **actual** (siguiente sección) y fusiona a `main` en seguida.
5. Borra el sitio de prueba.

### Opción B: cambiar el sitio actual y fusionar

1. Render → tu Static Site → **Settings** y cambia:

   | Campo | Valor |
   | --- | --- |
   | Branch | `main` (o `feat/backoffice-react` para probar antes) |
   | Build Command | `npm ci && npm run build` |
   | Publish Directory | `dist` |
   | Environment → `NODE_VERSION` | `22` |
   | Redirects/Rewrites → Add Rule | Source `/*` · Destination `/index.html` · Action **Rewrite** |

2. (Opcional) Headers: `/config.js` → `Cache-Control: no-cache`; seguridad básica (`X-Content-Type-Options: nosniff`, etc.).
3. **Fusiona la rama a `main` justo después**: entre el cambio de configuración y la fusión no debe haber otro push a `main`
   (fallaría `npm ci`, porque `main` todavía no tiene `package.json`).
4. Comprueba que `https://<tu-sitio>/` carga, que recargar en `/aeropuertos` no da 404 (la regla de rewrite) y que
   `https://<tu-sitio>/config.js` muestra la URL correcta.
5. Agrega la URL del sitio a `CORS_ORIGINS` del backend, junto a la del marketplace, **separadas por coma y sin espacios ni
   barra final**:

   ```text
   CORS_ORIGINS=https://marketplace.onrender.com,https://backoffice-vuelos.onrender.com
   ```

### Con `render.yaml` (opcional)

El archivo [`render.yaml`](render.yaml) deja todo lo anterior como código (build, publish `dist`, `NODE_VERSION=22`, la regla
de rewrite y los encabezados). Úsalo con **New → Blueprint** para crear el sitio, o como referencia para configurarlo a mano.

### Volver atrás

Revierte la fusión en `main` y devuelve en Render Build Command vacío y Publish Directory `.`: el `index.html` anterior
sigue intacto (también en `legacy/`).

## Endpoints que usa

Todos bajo `API_URL` (`…/flights/v1`). Los de `/admin` exigen el scope `flights:admin`. Las escrituras del catálogo
**no piden `Idempotency-Key`** en el backend, por eso la interfaz no la envía; la **cancelación de una reserva sí la exige**: se
genera una por intento (al abrir el diálogo de confirmación) y se reusa si hay que reintentar por un fallo de red.

| Área | Endpoints |
| --- | --- |
| Sesión | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` (comprueba `flights:admin`), `GET /health` (despertar el servidor) |
| Países | `GET`, `POST /admin/countries` · `GET`, `PATCH`, `DELETE /admin/countries/{code}` · `POST /admin/countries/{code}/reactivate` |
| Ciudades | `/admin/cities` y `/admin/cities/{id}` (+ `/reactivate`) |
| Aeropuertos | `/admin/airports` y `/admin/airports/{code}` (+ `/reactivate`) |
| Aerolíneas | `/admin/airlines` y `/admin/airlines/{code}` (+ `/reactivate`) |
| Equipos | `/admin/aircraft-models` y `/admin/aircraft-models/{code}` (+ `/reactivate`) |
| Familias tarifarias | `/admin/fare-families` y `/admin/fare-families/{id}` (+ `/reactivate`) |
| Mapas de asientos | `/admin/seat-maps` y `/admin/seat-maps/{id}` (+ `/reactivate`); el detalle trae filas y asientos; `POST` crea el mapa con sus filas |
| Números de vuelo | `/admin/flights` y `/admin/flights/{flightNumber}` (+ `/reactivate`) |
| Salidas | `/admin/departures` y `/admin/departures/{id}` (+ `/reactivate`); `DELETE` = cancelar (`CANCELLED`) |
| Tarifas | `/admin/fares` y `/admin/fares/{id}` (+ `/reactivate`) |
| Administradores | `GET`, `POST /admin/users` · `DELETE /admin/users/{id}` (baja lógica; sin detalle, edición ni reactivación) |
| Auditoría | `GET /admin/audit-log` (`table`, `operation`, `recordId`, `userId`, `from`, `to`, `limit` hasta 100, `cursor`) |
| Reservas | `GET /admin/bookings` (`pnr`, `status`, `createdFrom`, `createdTo`, `ownerEmail`, `flightNumber`) · `GET /admin/bookings/{bookingId}` · `POST /admin/bookings/{bookingId}/cancel` (con `Idempotency-Key`) |

Cada recurso de `/admin` usa `GET` (lista con `limit` 1–50, `cursor`, `includeInactive` y sus filtros: país, ciudad, aerolínea,
cabina, equipo, origen, destino, número de vuelo, fechas, estado, familia), `GET /{id}`, `POST` (201), `PATCH /{id}` (parcial),
`DELETE /{id}` (baja lógica, 204) y `POST /{id}/reactivate`. Las listas paginan por **cursor** (`{ items, nextCursor }`) y la
API **no** filtra por texto: "Buscar en todas las páginas" recorre las páginas (hasta 1000 registros) y filtra en el navegador.

Errores: se leen como `application/problem+json` y se traducen a mensajes en español para 400, 401, 403, 404, 409, 422 y
429 (con `Retry-After`); nunca se muestra el `detail` técnico.

## Probar las pantallas de administración contra tu backend local

Los tres endpoints nuevos están en la rama `feat/admin-auditoria-usuarios-reservas` de `backend_vuelos`. Pasos exactos:

1. En el backend, con su PostgreSQL arriba y esa rama: pon en su `.env` `PORT=3010`, `JWT_SECRET`, `WEBHOOK_SECRET_KEY` y
   `SEED_ADMIN_PASSWORD` (12 a 128 caracteres), carga la base con `./db/reset.sh` (**solo en tu base local**) y corre `npm run start:dev`.
2. En este repo, crea `.env.local` con `BACKEND_URL=http://localhost:3010` y corre `npm run dev`.
3. Ingresa con `admin@quinde.example` (o `SEED_ADMIN_EMAIL`) y tu `SEED_ADMIN_PASSWORD`, y revisa en este orden:
   **Administradores** (crea uno, intenta crear el mismo correo, dalo de baja; intenta dar de baja tu propia cuenta) →
   **Auditoría** (filtra por la tabla `usuario` y expande el alta: el hash sale `[REDACTED]`) →
   **Reservas** (crea una con un cliente de prueba, ábrela, cancélala y mira el historial).

Con la API de producción (sin ese cambio desplegado) las tres pantallas muestran "la API no tiene ese endpoint".

## Lo que la API todavía no tiene

No hay endpoint de **monedas** (la moneda se escribe, `USD` por defecto), ni de **conteo** (el panel cuenta recorriendo las
páginas) ni de **texto** (la búsqueda se hace en el navegador). Los administradores no se pueden editar ni reactivar (solo crear y
dar de baja), y un administrador dado de baja conserva su token de acceso hasta 15 minutos (se revoca la renovación, no el JWT).

## Sesión y seguridad

- Login con correo y contraseña (12 a 128 caracteres, como el backend); **sin credenciales en el código**. Tras ingresar se
  llama a `/auth/me`: sin `flights:admin` se muestra "tu cuenta no tiene permiso de administrador", se cierra la sesión recién
  abierta y no queda nada guardado. La interfaz **nunca envía un rol**.
- El **access token vive solo en memoria**; el **refresh token, en `sessionStorage`**. Nunca cookies propias, ni el token en la
  URL ni en logs.
- **Una sola renovación a la vez** (`features/auth/session.ts`): promesa compartida, **Web Locks** y **BroadcastChannel** entre
  pestañas, huellas de refresh tokens ya rotados (reusar uno revoca la sesión en el backend). Ante un 401 renueva y reintenta
  **una** vez; si falla, cierra la sesión por seguridad y vuelve al login conservando a dónde se iba (`?volver=`, solo rutas internas).
- Cerrar sesión se propaga a las demás pestañas. Las rutas protegidas esperan a que termine la restauración (no redirigen ni
  muestran contenido mientras tanto) y, si no hay conexión al restaurar, lo explican en vez de cerrar la sesión.
- React escapa todo el texto; no se usa `dangerouslySetInnerHTML`.

## Horas y dinero

- **Horas**: la API usa UTC; la pantalla usa la **hora local de cada aeropuerto** (zona IANA de su ciudad): Ecuador continental
  UTC−5 y **Galápagos UTC−6** (sin horario de verano). La salida se escribe en la hora del aeropuerto de origen y la llegada en la
  del destino; el resumen del asistente muestra además el instante UTC que se guardará. (`src/shared/lib/dates.ts`, con pruebas.)
- **Dinero**: texto con dos decimales (`"94.38"`), moneda `USD` por defecto. Para sumar o comparar se usan **centavos enteros**
  (`src/shared/lib/money.ts`), nunca flotantes.
- **Avisos de tarifa** (no bloquean): total del adulto fuera de rango para un vuelo nacional (continente ≈ $10–$350; Galápagos
  ≈ $80–$900, solo en USD) o dos familias de la misma cabina con el mismo precio (`src/shared/lib/fareChecks.ts`).

## Pruebas

- **Vitest** (`npm test`, ~175 pruebas): validadores y dinero, fechas y zonas, avisos de tarifa, mapeo de errores (ProblemDetails,
  Retry-After), cliente HTTP (reintento solo de lecturas, deduplicación, tiempo agotado), `SessionManager` (renovación única, entre
  pestañas, cierre), integración cliente + sesión (401 → una renovación → reintento), generación de filas de mapas, plan y ejecución
  del asistente (reintento de lo pendiente, 429), y componentes: asistente completo, tabla con baja y reactivación, avisos de tarifa,
  ruta protegida y panel, además de los administradores (alta con 409, baja, baja propia bloqueada), la auditoría (filtros, diff, `[REDACTED]`, "Cargar más") y las reservas (filtros, detalle, cancelación con `Idempotency-Key` estable entre reintentos).
- **E2E** (`npm run e2e`, Playwright + Chromium contra una API de prueba en memoria, sin red externa): login, asistente completo, un CRUD, las tres pantallas de administración, 320/768/1280 px (sin
  scroll horizontal de página y objetivos de 44 px), recorrido con teclado (saltar al contenido, foco al h1, diálogos con foco atrapado y
  Esc) y **axe** (WCAG 2.2 AA) en claro y oscuro. Las capturas quedan en `e2e/out/` (ignorado por git). El script usa el Chromium que
  tenga Playwright; en entornos con `PLAYWRIGHT_BROWSERS_PATH` apunta ahí.
- **Contra la API real no hay pruebas automáticas**: requerirían credenciales de administrador, que no deben vivir en el repositorio.

## Decisiones y diferencias con el contrato

- **Un solo contrato**: los tipos salen del OpenAPI del backend; las reglas que ese documento no declara se tomaron de los servicios
  del backend y están cubiertas por la API de prueba (que las reproduce) y por las pruebas.
- **Búsqueda**: la API no filtra por texto. "Buscar" filtra las filas de la página; "Buscar en todas las páginas" recorre hasta 1000
  registros e indica cuántos revisó (y si hay más sin revisar). El mismo tope usan los conteos del panel: solo se muestra "1000+" si
  se pasa del tope.
- **Orden por columna**: la API no ordena; se ordena lo que ya está cargado (la página, o todo con "buscar en todas las páginas").
- **Rutas**: no existe un recurso "ruta" en la API. `Rutas` es una vista de solo lectura calculada con los números de vuelo
  (cada par origen → destino con sus números, enlazados a sus salidas).
- **Salidas**: se crean con el asistente; el formulario de la lista edita horario, terminales y estado, y "Cancelar salida" es la baja lógica.
- **Tarifas**: se crean y editan con precios por tipo de pasajero (adulto obligatorio) con avisos de cordura; el asistente las crea junto con las salidas.
- **Reintento a medias**: el asistente guarda lo ya creado (número de vuelo, salidas, tarifas) y "Reintentar lo pendiente" crea solo
  lo que falta; ante un 429 espera el `Retry-After` (máx. 65 s) y reintenta hasta 3 veces.
- **Zona horaria por aeropuerto** (mejora sobre el HTML anterior, que fijaba UTC−5): una llegada a Galápagos se escribe en hora de Galápagos.
- **Sin fuentes externas**: tipografía del sistema (sin Google Fonts), así que el sitio no depende de terceros ni de la red.
- **API de prueba solo en pruebas**: `FakeAdminApi` vive en `src/test-support/`; la compilación de producción no la incluye (el E2E la activa con `VITE_E2E=true` y una carpeta de salida aparte).
- **`legacy/`** conserva el `index.html` y el `config.js` anteriores como referencia; no se publican.
