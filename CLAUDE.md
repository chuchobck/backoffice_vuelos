# CLAUDE.md — reglas de trabajo del backoffice de vuelos

`README.md` es la fuente de verdad (qué es, arquitectura, despliegue, endpoints). Este archivo resume cómo
trabajar en el código. Las reglas de arquitectura las revisa `npm run lint`.

## Stack

React 18 + TypeScript estricto + Vite 5, React Router 6, Tailwind 3 (tokens en `src/index.css`), Radix UI,
react-hook-form + zod, TanStack Query v5, Vitest + Testing Library, ESLint 9 (typescript-eslint, react-hooks,
jsx-a11y, import-x). E2E con Playwright (`npm run e2e`).

## Arquitectura (la verifica el lint)

- `app/` rutas, layout, proveedores. `pages/` una por ruta, **solo arma piezas**. `features/<módulo>/` un módulo
  funcional. `shared/` api, i18n, lib, ui, crud.
- `pages` usa `app`, `features` y `shared`. `features` usa `shared` y solo `app/routes.ts`. `shared` no importa de nadie.
- Un módulo de `features` no importa de otro; lo común sube a `shared`. Desde fuera se importa por su `index.ts`.
- Solo `shared/api` hace red; el único `fetch` está en `shared/api/http/client.ts`. La UI conoce solo `AdminApi`
  (implementación `RealAdminApi`; las pruebas inyectan `FakeAdminApi` de `src/test-support/` con `setAdminApi`). **Nunca se inventan endpoints.**
- Todos los textos en `shared/i18n/es.ts`. Colores solo con tokens (Tailwind los restringe). Un componente por archivo.
- Rutas: nunca como texto suelto; `paths`/`routes` de `src/app/routes.ts`.

## API y datos

- Tipos generados desde `contracts/backend-openapi.json` (`npm run api:types`); no se editan a mano.
- Eliminar es SIEMPRE baja lógica (`DELETE` = `activo=false`; una salida queda `CANCELLED`).
- Dinero: texto `"94.38"`; para sumar o comparar, centavos enteros (`shared/lib/money.ts`). Horas: UTC en la API,
  hora local del aeropuerto en pantalla (`shared/lib/dates.ts`; Galápagos UTC−6).
- Detalle técnico de un error (`detail`) nunca se muestra: se mapea a `shared/i18n` (`shared/api/errors.ts`).
- Sesión: access token solo en memoria; refresh en `sessionStorage`; una sola renovación a la vez
  (promesa compartida + Web Locks + BroadcastChannel). La interfaz nunca envía un rol.
- Desarrollo local: `npm run dev` usa el proxy `/flights` → `BACKEND_URL` (ver README). Ningún dato ni texto de ejemplo en producción.
- Reservas, Auditoría y Administradores no tienen endpoint admin: son pantallas "Pendiente en la API", no se simulan.

## Accesibilidad (WCAG 2.2 AA)

HTML semántico, un `h1` por vista con el foco movido a él al cambiar de ruta, "Saltar al contenido", foco visible,
objetivos de 44 px, contraste 4.5:1, etiquetas en todo campo, errores con `role="alert"`, todo con teclado,
320 px sin scroll horizontal de página, modo oscuro y `prefers-reduced-motion`. `npm run e2e` corre axe.
Dentro de un contenedor con scroll (`overflow-x-auto`) usa `relative`: un `sr-only` absoluto escapa y ensancha la página.

## Flujo

- Commits Conventional en español, uno por hito. Nunca subir `.env`, secretos ni archivos temporales.
- Antes de subir: `npm run lint && npm run typecheck && npm test && npm run build` (y `npm run e2e` si tocas la UI).
