# Procedencia del contrato

`backend-openapi.json` es el OpenAPI que publica el propio backend (`GET /api/docs-json`, NestJS/Swagger),
sin cambios de contenido (solo reformateado con sangría de 2 espacios). La versión anterior (55 rutas) era la copia del
repositorio del marketplace ([`chuchobck/e-commerce_vuelos`](https://github.com/chuchobck/e-commerce_vuelos)).
La actual sale de la rama `feat/admin-auditoria-usuarios-reservas` de
[`chuchobck/backend_vuelos`](https://github.com/chuchobck/backend_vuelos) (PR 2), que agrega `/admin/audit-log`,
`/admin/users` y `/admin/bookings`: **hasta que ese PR se publique en producción, esas tres pantallas
responderán 404 contra la API desplegada**.

| Dato | Valor |
| --- | --- |
| Título | Quinde · API de Vuelos |
| Versión (`info.version`) | 1.0.0 |
| Rutas | 67, incluidas `/flights/v1/auth/*`, las 10 entidades de `/flights/v1/admin/*`, `audit-log`, `users`, `bookings` y, desde F5, `admin/departures/{departureId}/boarding/scan` y `.../boarding/manifest` |
| Copiado | 2026-11-12 (F5) |

**Actualización F5 (2026-11-12).** Salió de la rama `main` de `backend_vuelos` (commit `942b619`, PR 14, fase F1: embarque, kiosko y
salidas públicas), no de la API desplegada: el gateway de Azure no publica `/api/docs-json` sin autenticación. Se compiló `main` en
una copia temporal, se arrancó con una base inexistente y credenciales desechables (`AUTH_MODE=local`) y se guardó el
`GET /api/docs-json`, reformateado con sangría de 2 espacios. Trae `departureGate` en las salidas y las 6 rutas nuevas (2 de embarque
de `admin`, 3 de `kiosk` y `airports/{iataCode}/departures`; el backoffice solo usa las dos de embarque).

`npm run api:types` genera `src/shared/api/generated/backend.ts` (versionado, no se edita a mano) y
`src/shared/api/contract.ts` solo les pone nombre corto (`Airport`, `CreateAirport`, `Departure`…).

Las formas de `/admin` salen de ese documento. Contrastadas con los DTO de `chuchobck/backend_vuelos`
(`src/modules/vuelos/catalogo/**/dto`), coinciden; las reglas de negocio que el OpenAPI no declara (origen ≠ destino,
cupo ≤ asientos del mapa, salida en el futuro, etc.) se tomaron de sus servicios y de `docs/DISCREPANCIAS-CONTRATO.md`.

Para actualizarlo: copiar de nuevo el archivo, actualizar esta tabla y correr `npm run api:types`.
