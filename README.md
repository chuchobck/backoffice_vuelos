# Backoffice de Vuelos

Sistema de administración del módulo de vuelos del Booking Prototipo. Es una sola página
(`index.html`, HTML + CSS + JavaScript vanilla, sin build ni npm) que consume la API
[`backend_vuelos`](https://github.com/chuchobck/backend_vuelos) con una cuenta de **administrador**
(scope `flights:admin`). Está en español de Ecuador y muestra las horas en hora de Ecuador (UTC−5);
la API las guarda en UTC.

Archivos: `index.html` (la aplicación), `config.js` (URL de la API) y este `README.md`.

## Qué incluye

- **Login** con correo y contraseña (nunca hay credenciales en el código). El access token vive solo
  en memoria; el refresh token, en `sessionStorage`. La renovación (`POST /auth/refresh`) se hace una
  sola vez a la vez, porque el refresh token rota. Ante un 401 renueva y reintenta una vez; si falla,
  vuelve al login. La interfaz nunca envía un rol: el servidor decide los permisos.
- **Crear vuelo**: asistente de 5 pasos (ruta, aerolínea y equipo, horario, cabinas y tarifas,
  revisión) que crea el número de vuelo, las salidas (una por fecha) y sus tarifas.
- **Listados con búsqueda, paginación y CRUD** (baja lógica con confirmación y reactivación):
  salidas, rutas/números de vuelo, tarifas, aeropuertos, aerolíneas, equipos, familias tarifarias,
  mapas de asientos, ciudades y países.
- **Modo demo** (interruptor en el login): datos de ejemplo locales con la misma forma que las
  respuestas reales, para ver todo el flujo sin API. Se avisa en pantalla con una insignia y un
  banner. Con el modo demo apagado se usa la API real.

## Cómo desplegarlo en Render (Static Site)

1. En Render: **New → Static Site** y elige el repositorio `chuchobck/backoffice_vuelos`.
2. **Branch**: `main`. **Build Command**: vacío. **Publish Directory**: `.`
3. Crea el sitio. Cuando tengas la URL (por ejemplo `https://backoffice-vuelos.onrender.com`),
   agrégala a `CORS_ORIGINS` del backend junto a la del marketplace, separadas por coma y sin
   espacios ni barra final:

   ```text
   CORS_ORIGINS=https://marketplace.onrender.com,https://backoffice-vuelos.onrender.com
   ```

   Sin esto, el navegador bloquea las llamadas a la API (el modo demo sigue funcionando).

Para probar en local basta cualquier servidor estático (por ejemplo `python3 -m http.server`);
`http://localhost:<puerto>` también debe estar en `CORS_ORIGINS` para usar la API real.

## Cómo cambiar la URL de la API

Edita `config.js` (no hace falta tocar el HTML):

```js
window.APP_CONFIG = {
  API_URL: "https://quinde-vuelos-api.onrender.com/flights/v1"
};
```

## Endpoints que usa

Todos bajo `API_URL`. Los de `/admin` exigen el scope `flights:admin`. Las escrituras de administración
no piden `Idempotency-Key` en el backend, por eso el panel no la envía.

| Área | Endpoints |
| --- | --- |
| Sesión | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` (comprueba que la cuenta tenga `flights:admin`) |
| Catálogo (CRUD) | `/admin/countries`, `/admin/cities`, `/admin/airports`, `/admin/airlines`, `/admin/aircraft-models`, `/admin/fare-families`, `/admin/seat-maps` |
| Vuelos | `/admin/flights` (número y ruta), `/admin/departures` (salidas con cupos por cabina), `/admin/fares` (tarifas por salida y familia) |

Cada recurso usa `GET` (lista con `limit`, `cursor`, `includeInactive` y sus filtros), `GET /{id}`,
`POST`, `PATCH /{id}`, `DELETE /{id}` (baja lógica, 204) y `POST /{id}/reactivate`. En el asistente:
`GET /admin/airports`, `/airlines`, `/aircraft-models`, `/seat-maps`, `/flights`, `/fare-families`
y luego `POST /admin/flights`, `POST /admin/departures` y `POST /admin/fares`.

Errores: se leen como `application/problem+json` y se traducen a mensajes en español (400, 401, 403,
404, 409, 422 y 429 con `Retry-After`); nunca se muestra el `detail` técnico.

## Pantallas "pendientes en la API"

Marcadas en la interfaz con la etiqueta *Pendiente*; no se inventó ningún endpoint:

- **Reservas**: la API solo tiene `GET /bookings` con las reservas del usuario autenticado; no hay un
  listado de administración con las reservas de todos los clientes.
- **Auditoría**: la base registra la auditoría de cada escritura, pero la API no expone un endpoint de
  consulta.

Otras limitaciones del backend que se notan en el panel:

- Las listas paginan por cursor y no tienen parámetro de texto: la búsqueda del panel filtra la página
  cargada; los filtros del servidor son los que el endpoint soporta (país, aerolínea, origen, destino,
  número de vuelo, fechas, estado).
- No hay endpoint de monedas: en el asistente la moneda se escribe (ISO 4217, por defecto `USD`).
- El alta de mapas de asientos (filas y asientos) existe en la API (`POST /admin/seat-maps`) pero este
  panel todavía no tiene su formulario: solo lista, renombra y da de baja.
- No existe un conteo: el panel muestra el tamaño de la primera página (`50+` si hay más).

## Seguridad

- Todo texto que llega de la API se inserta con `textContent`; no se usa `innerHTML`.
- No hay secretos ni credenciales en el repositorio.
