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
| Rutas | 61, incluidas `/flights/v1/auth/*`, las 10 entidades de `/flights/v1/admin/*` y `audit-log`, `users` y `bookings` |
| Copiado | 2026-10-10 |

`npm run api:types` genera `src/shared/api/generated/backend.ts` (versionado, no se edita a mano) y
`src/shared/api/contract.ts` solo les pone nombre corto (`Airport`, `CreateAirport`, `Departure`…).

Las formas de `/admin` salen de ese documento. Contrastadas con los DTO de `chuchobck/backend_vuelos`
(`src/modules/vuelos/catalogo/**/dto`), coinciden; las reglas de negocio que el OpenAPI no declara (origen ≠ destino,
cupo ≤ asientos del mapa, salida en el futuro, etc.) se tomaron de sus servicios y de `docs/DISCREPANCIAS-CONTRATO.md`.

Para actualizarlo: copiar de nuevo el archivo, actualizar esta tabla y correr `npm run api:types`.
