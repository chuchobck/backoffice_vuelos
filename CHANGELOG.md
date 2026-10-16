# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Sin publicar]

### Cambiado (Reto 2, fase 6b: identity detrás del gateway)

- **Dos bases de URL**: `API_URL` (core) e `IDENTITY_URL` (identity) en `public/config.js`. `IDENTITY_URL` se deriva de `API_URL`
  (`/flights/v1` → `/identity/v1`) si falta; una configuración inválida detiene la aplicación con la pantalla "Configuración inválida".
- El ingreso, la renovación, el cierre de sesión y `me`, y los administradores (`/admin/users`), pasan del core a **identity**. El
  catálogo, la auditoría y las reservas siguen en el core. Las pantallas no cambian: las formas de respuesta de identity son las mismas.
- Mensajes de error: "el servicio de identidad no responde" (identity sin configurar, caída o sin esa ruta) se distingue de "la API
  desplegada no tiene todavía el endpoint" (core).
- El calentamiento de los servicios gratuitos despierta core e identity.
- Desarrollo: el proxy de Vite reenvía `/flights`, `/identity` y `/graphql` al gateway (`GATEWAY_URL`, por defecto
  `http://localhost:8080`; `BACKEND_URL` queda como alias). El `/config.js` de desarrollo trae las dos URLs relativas.
- La lista y el detalle de reservas muestran el id del dueño ("Correo no disponible (id…)") cuando el core no conoce su correo (las
  cuentas viven en identity). El filtro `ownerEmail` del core no encuentra esas cuentas.

### Añadido

- Pantallas reales de Administradores, Auditoría y Reservas (PR 1), con `/admin/users`, `/admin/audit-log` y `/admin/bookings`.
- Pruebas: derivación y validación de las URLs, enrutado core/identity, un solo refresh ante un 401 del core, y que ningún token ni
  contraseña llegue a la consola.
