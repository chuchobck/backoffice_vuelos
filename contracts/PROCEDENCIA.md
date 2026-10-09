# Procedencia del contrato

`backend-openapi.json` es una copia **sin cambios** del OpenAPI que publica el propio backend
(`GET /api/docs-json`, NestJS/Swagger) tal como está en el repositorio del marketplace
([`chuchobck/e-commerce_vuelos`](https://github.com/chuchobck/e-commerce_vuelos), `contracts/backend-openapi.json`).

| Dato | Valor |
| --- | --- |
| Título | Quinde · API de Vuelos |
| Versión (`info.version`) | 1.0.0 |
| Rutas | 55, incluidas `/flights/v1/auth/*` y las 10 entidades de `/flights/v1/admin/*` |
| Copiado | 2026-10-09 |

`npm run api:types` genera `src/shared/api/generated/backend.ts` (versionado, no se edita a mano) y
`src/shared/api/contract.ts` solo les pone nombre corto (`Airport`, `CreateAirport`, `Departure`…).

Las formas de `/admin` salen de ese documento. Contrastadas con los DTO de `chuchobck/backend_vuelos`
(`src/modules/vuelos/catalogo/**/dto`), coinciden; las reglas de negocio que el OpenAPI no declara (origen ≠ destino,
cupo ≤ asientos del mapa, salida en el futuro, etc.) se tomaron de sus servicios y de `docs/DISCREPANCIAS-CONTRATO.md`.

Para actualizarlo: copiar de nuevo el archivo, actualizar esta tabla y correr `npm run api:types`.
