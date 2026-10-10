/**
 * Pruebas de extremo a extremo (Playwright + Chromium). La aplicación se compila con VITE_E2E=true en
 * `dist-e2e/` (nunca en `dist/`): esa compilación usa la API de prueba en memoria (src/test-support) y
 * nunca llama a la API real ni a ninguna red.
 *
 *   npm run e2e          (compila, levanta `vite preview` y corre todo)
 *
 * Cubre: login, asistente de crear vuelo completo, un CRUD, 320 / 768 / 1280 px (sin scroll horizontal
 * de página ni objetivos menores de 44 px), recorrido con teclado, modo oscuro y accesibilidad (axe).
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const AXE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const PORT = Number(process.env.E2E_PORT ?? 4175);
const BASE = `http://localhost:${PORT}`;
const OUT = new URL('./out/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const results = [];
let currentGroup = '';
async function check(name, fn) {
  const label = `${currentGroup} › ${name}`;
  try {
    await fn();
    results.push({ label, ok: true });
    console.log(`  ✔ ${name}`);
  } catch (error) {
    results.push({ label, ok: false, error });
    console.log(`  ✘ ${name}\n      ${String(error.message ?? error).split('\n').slice(0, 6).join('\n      ')}`);
  }
}
const group = (name) => {
  currentGroup = name;
  console.log(`\n${name}`);
};
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
const eq = (actual, expected, what) => assert(JSON.stringify(actual) === JSON.stringify(expected), `${what}: esperado ${JSON.stringify(expected)}, recibido ${JSON.stringify(actual)}`);

const ADMIN = { email: 'admin@quinde.test', password: 'prueba-admin-123' };
const CUSTOMER = { email: 'cliente@quinde.test', password: 'prueba-cliente-123' };
const DIST = 'dist-e2e';

function build() {
  const viteBin = new URL('../node_modules/vite/bin/vite.js', import.meta.url).pathname;
  const run = spawnSync(process.execPath, [viteBin, 'build', '--outDir', DIST, '--emptyOutDir'], {
    stdio: 'inherit',
    env: { ...process.env, VITE_E2E: 'true' },
  });
  if (run.status !== 0) throw new Error('La compilación de pruebas falló');
}

async function startServer() {
  build();
  // Se lanza el binario de vite con node (no con npx): así `server.kill()` termina el proceso real y no queda nada corriendo.
  const viteBin = new URL('../node_modules/vite/bin/vite.js', import.meta.url).pathname;
  const server = spawn(process.execPath, [viteBin, 'preview', '--outDir', DIST, '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(BASE);
      if (res.ok) return server;
    } catch {
      /* todavía no */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  server.kill();
  throw new Error('vite preview no arrancó');
}

const iso = (days) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

async function newPage(browser, viewport, externalRequests = []) {
  const context = await browser.newContext({ viewport, locale: 'es-EC', timezoneId: 'America/Guayaquil' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  // Sin red externa: cualquier recurso fuera del servidor local (fuentes de Google, la API real…) se bloquea y se anota.
  await context.route(/^https?:\/\/(?!localhost)/, (route) => {
    externalRequests.push(route.request().url());
    return route.abort();
  });
  return { context, page, errors };
}

async function loginAdmin(page, path = '/panel') {
  await page.goto(BASE + path);
  await page.getByLabel('Correo electrónico').fill(ADMIN.email);
  await page.getByLabel(/^Contraseña/).fill(ADMIN.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.locator('header').first().waitFor();
}

async function axeScan(page, label, { tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } = {}) {
  await page.addScriptTag({ content: AXE });
  const { violations } = await page.evaluate(async (runTags) => {
    // eslint-disable-next-line no-undef
    return axe.run(document, { runOnly: { type: 'tag', values: runTags } });
  }, tags);
  if (violations.length) {
    const lines = violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} nodo(s), p. ej. ${v.nodes[0].target.join(' ')} — ${v.help}`);
    throw new Error(`${label}: ${violations.length} violación(es) de accesibilidad\n${lines.join('\n')}`);
  }
}

async function main() {
  const server = await startServer();
  const browser = await chromium.launch();
  const external = [];
  try {
    /* ---------------------------------------------------------------- Login y panel */
    group('Login y sesión');
    {
      const guest = await newPage(browser, { width: 1280, height: 900 }, external);
      const page = guest.page;
      await check('una ruta protegida lleva a /ingresar con ?volver=', async () => {
        await page.goto(`${BASE}/tarifas`);
        await page.waitForURL(/\/ingresar\?volver=%2Ftarifas/);
        eq(await page.locator('h1').count(), 1, 'un solo h1');
      });
      await check('valida correo y contraseña (12 a 128) al salir del campo y al enviar, sin borrar lo escrito', async () => {
        await page.getByLabel('Correo electrónico').fill('esto-no-es-un-correo');
        await page.getByLabel(/^Contraseña/).fill('corta');
        await page.getByRole('button', { name: 'Iniciar sesión' }).click();
        const text = (await page.locator('[role=alert]').allTextContents()).join(' | ');
        assert(/correo válido/.test(text), `falta el error del correo: ${text}`);
        assert(/entre 12 y 128/.test(text), `falta el error de la contraseña: ${text}`);
        eq(await page.getByLabel('Correo electrónico').inputValue(), 'esto-no-es-un-correo', 'no borra el correo');
        await page.screenshot({ path: `${OUT}login-errores.png` });
      });
      await check('una contraseña incorrecta da un mensaje genérico (401)', async () => {
        await page.getByLabel('Correo electrónico').fill(ADMIN.email);
        await page.getByLabel(/^Contraseña/).fill('una frase larga y fácil');
        await page.getByRole('button', { name: 'Iniciar sesión' }).click();
        await page.getByText('Correo o contraseña incorrectos.').waitFor();
      });
      await check('una cuenta sin permiso de administrador es rechazada (403) y no queda sesión', async () => {
        await page.getByLabel('Correo electrónico').fill(CUSTOMER.email);
        await page.getByLabel(/^Contraseña/).fill(CUSTOMER.password);
        await page.getByRole('button', { name: 'Iniciar sesión' }).click();
        await page.getByText(/no tiene permiso de administrador/).waitFor();
        assert(/\/ingresar/.test(page.url()), 'debe seguir en el login');
      });
      await check('accesibilidad del login (axe)', () => axeScan(page, 'login'));
      await guest.context.close();

      const session = await newPage(browser, { width: 1280, height: 900 }, external);
      const dp = session.page;
      await check('un administrador entra y vuelve a la ruta pedida', async () => {
        await dp.goto(`${BASE}/tarifas`);
        await dp.waitForURL(/\/ingresar/);
        await dp.getByLabel('Correo electrónico').fill(ADMIN.email);
        await dp.getByLabel(/^Contraseña/).fill(ADMIN.password);
        await dp.getByRole('button', { name: 'Iniciar sesión' }).click();
        await dp.waitForURL('**/tarifas');
      });
      await check('el panel muestra conteos reales de todas las páginas', async () => {
        await dp.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Panel' }).click();
        await dp.getByRole('link', { name: 'Vuelos (salidas) 30 activos' }).waitFor();
        await dp.getByRole('link', { name: 'Tarifas 39 activos' }).waitFor();
        await dp.screenshot({ path: `${OUT}panel.png`, fullPage: true });
      });
      await check('recargar restaura la sesión sin pedir ingreso', async () => {
        await dp.reload();
        await dp.getByRole('heading', { level: 1, name: 'Panel' }).waitFor();
      });
      await check('cerrar sesión vuelve al login', async () => {
        await dp.getByRole('button', { name: 'Cerrar sesión' }).click();
        await dp.waitForURL(/\/ingresar/);
      });
      await check('no se hizo ninguna llamada de red externa', async () => {
        eq(external, [], 'peticiones externas');
      });
      await check('sin errores en la consola', async () => eq(session.errors, [], 'errores'));
      await session.context.close();
    }

    /* ---------------------------------------------------------------- Asistente */
    group('Asistente "Crear vuelo"');
    {
      const { page, errors } = await newPage(browser, { width: 1280, height: 1000 }, external);
      await loginAdmin(page, '/vuelos/crear');
      await check('crea el vuelo completo (5 pasos, validaciones, vista previa, creación y enlace a la lista)', async () => {
        await page.getByRole('heading', { name: 'Paso 1: Ruta' }).waitFor();
        await page.getByRole('button', { name: 'Siguiente' }).click();
        assert((await page.locator('[role=alert]').allTextContents()).join(' ').includes('obligatorio'), 'paso 1 sin errores');
        await page.getByLabel('Origen').selectOption('GYE');
        await page.getByLabel('Destino').selectOption('GPS');
        await page.getByRole('button', { name: 'Siguiente' }).click();

        await page.getByRole('heading', { name: 'Paso 2: Aerolínea y equipo' }).waitFor();
        await page.getByLabel('Aerolínea', { exact: true }).selectOption('LA');
        await page.getByLabel('Equipo (aeronave)').selectOption('320');
        await page.waitForFunction(() => document.querySelector('select[name=seatMapId]')?.value);
        await page.getByLabel(/Número nuevo/).fill('2410');
        await page.getByRole('button', { name: 'Siguiente' }).click();
        await page.getByText(/ya existe con la ruta GYE → GPS/).first().waitFor();
        await page.getByLabel(/Número nuevo/).fill('2499');
        await page.getByRole('button', { name: 'Siguiente' }).click();

        await page.getByRole('heading', { name: 'Paso 3: Horario' }).waitFor();
        await page.getByLabel('Primera fecha de salida').fill(iso(10));
        await page.getByLabel('Repetir hasta (opcional)').fill(iso(13));
        await page.getByLabel('Hora de salida').fill('08:00');
        await page.getByLabel('Hora de llegada').fill('07:00');
        await page.getByRole('button', { name: 'Siguiente' }).click();
        await page.getByText(/La llegada debe ser posterior/).first().waitFor();
        await page.getByLabel('Hora de llegada').fill('08:55');
        await page.getByText(/Se crearán 4 salidas/).waitFor();
        await page.getByRole('button', { name: 'Siguiente' }).click();

        await page.getByRole('heading', { name: 'Paso 4: Cabinas y tarifas' }).waitFor();
        await page.getByLabel(/Vender con Basic/).click();
        await page.getByLabel('Adulto: Tarifa base').first().fill('4128.00');
        await page.getByLabel('Adulto: Impuestos').first().fill('0.00');
        await page.getByText(/parece demasiado alto/).first().waitFor();
        await page.getByLabel('Adulto: Tarifa base').first().fill('190.00');
        await page.getByLabel('Adulto: Impuestos').first().fill('38.00');
        await page.getByRole('button', { name: 'Siguiente' }).click();

        await page.getByRole('heading', { name: 'Paso 5: Revisar y confirmar' }).waitFor();
        await page.screenshot({ path: `${OUT}wizard-revision.png`, fullPage: true });
        await page.getByRole('button', { name: 'Confirmar y crear vuelo' }).click();
        await page.getByRole('heading', { name: 'Vuelo LA2499 creado' }).waitFor({ timeout: 20_000 });
        eq(await page.locator('table tbody tr').count(), 4, 'filas de identificadores');
        await page.getByRole('link', { name: 'Ver en la lista' }).click();
        await page.waitForURL('**/vuelos?vuelo=LA2499');
        await page.locator('tbody tr td time').first().waitFor();
        eq(await page.locator('tbody tr').count(), 4, 'salidas en la lista filtrada');
      });
      await check('sin errores en la consola', async () => eq(errors, [], 'errores'));
      await page.context().close();
    }

    /* ---------------------------------------------------------------- CRUD */
    group('CRUD de aeropuertos');
    {
      const { page, errors } = await newPage(browser, { width: 1280, height: 900 }, external);
      await loginAdmin(page, '/aeropuertos');
      const dialog = page.getByRole('dialog');
      await check('crear (con validación), buscar, ordenar y editar', async () => {
        await page.locator('tbody tr td').first().waitFor();
        await page.getByLabel('Filas por página').selectOption('25');
        await page.getByRole('button', { name: 'Nuevo aeropuerto' }).click();
        await dialog.getByRole('button', { name: 'Crear' }).click();
        assert((await dialog.locator('[role=alert]').allTextContents()).join(' ').includes('obligatorio'), 'sin errores al enviar vacío');
        await dialog.getByLabel(/Código IATA/).fill('tpq');
        await dialog.getByLabel('Nombre').fill('Aeropuerto de Prueba');
        await dialog.getByLabel('Ciudad').selectOption({ index: 2 });
        await dialog.getByRole('button', { name: 'Crear' }).click();
        await page.getByRole('cell', { name: 'TPQ', exact: true }).waitFor();
        await page.getByLabel('Buscar', { exact: true }).fill('prueba');
        eq(await page.locator('tbody tr').count(), 1, 'filas tras buscar');
        await page.getByLabel('Buscar', { exact: true }).fill('');
        await page.getByRole('button', { name: 'Ordenar por Nombre' }).click();
        eq(await page.getByRole('columnheader', { name: /Nombre/ }).getAttribute('aria-sort'), 'ascending', 'aria-sort');
        await page.getByRole('button', { name: 'Editar aeropuerto TPQ' }).click();
        await dialog.getByLabel('Nombre').fill('Aeropuerto de Prueba 2');
        await dialog.getByRole('button', { name: 'Guardar cambios' }).click();
        await page.getByText('Aeropuerto de Prueba 2').first().waitFor();
      });
      await check('baja lógica con confirmación, 409 en uso, mostrar dados de baja y reactivar', async () => {
        await page.getByRole('button', { name: 'Dar de baja aeropuerto TPQ' }).click();
        eq(await page.evaluate(() => document.activeElement?.textContent), 'No, mantener', 'foco inicial seguro');
        await page.getByRole('alertdialog').getByRole('button', { name: 'Dar de baja' }).click();
        await page.getByRole('cell', { name: 'TPQ', exact: true }).waitFor({ state: 'detached' });
        await page.getByLabel('Mostrar dados de baja').check();
        await page.getByRole('button', { name: 'Reactivar aeropuerto TPQ' }).click();
        await page.getByRole('button', { name: 'Dar de baja aeropuerto TPQ' }).waitFor();
        await page.getByRole('button', { name: 'Dar de baja aeropuerto UIO' }).click();
        await page.getByRole('alertdialog').getByRole('button', { name: 'Dar de baja' }).click();
        await page.getByRole('alertdialog').getByText(/otros registros activos lo usan/).waitFor();
        await page.keyboard.press('Escape');
        await page.getByRole('alertdialog').waitFor({ state: 'detached' });
      });
      await check('buscar en todas las páginas recorre las páginas e indica cuántas revisó', async () => {
        await page.getByLabel('Filas por página').selectOption('10');
        await page.getByLabel('Buscar en todas las páginas').check();
        await page.getByLabel('Buscar', { exact: true }).fill('uio');
        await page.getByText(/Se revisaron los \d+ registros/).waitFor();
        eq(await page.locator('tbody tr').count(), 1, 'filas');
      });
      await check('sin errores en la consola', async () => eq(errors, [], 'errores'));
      await page.context().close();
    }

    /* ---------------------------------------------------------------- Administración */
    group('Administradores, auditoría y reservas');
    {
      const { page, errors } = await newPage(browser, { width: 1280, height: 900 }, external);
      await loginAdmin(page, '/administradores');
      await check('administradores: lista, marca la propia cuenta y bloquea su baja', async () => {
        await page.getByRole('heading', { level: 1, name: 'Administradores' }).waitFor();
        await page.getByRole('cell', { name: 'operaciones@quinde.test', exact: true }).waitFor();
        const own = page.getByRole('button', { name: 'Dar de baja administrador admin@quinde.test' });
        eq(await own.getAttribute('aria-disabled'), 'true', 'baja propia bloqueada');
        await own.click({ force: true }); // aria-disabled: Playwright no lo considera "habilitado", pero un usuario sí puede pulsarlo
        eq(await page.getByRole('alertdialog').count(), 0, 'no abre el diálogo');
        await axeScan(page, 'administradores');
      });
      await check('administradores: crear (valida, 409 de correo repetido, éxito) y dar de baja', async () => {
        await page.getByRole('button', { name: 'Nuevo administrador' }).click();
        const dialog = page.getByRole('dialog');
        await page.waitForTimeout(500); // termina la animación de entrada antes de medir el contraste
        await axeScan(page, 'diálogo crear administrador');
        await dialog.getByRole('button', { name: 'Crear' }).click();
        await dialog.getByText('Este campo es obligatorio.').first().waitFor();
        await dialog.getByLabel(/Correo electrónico/).fill('operaciones@quinde.test');
        await dialog.getByLabel(/^Contraseña/).fill('una frase larga de prueba');
        await dialog.getByRole('button', { name: 'Crear' }).click();
        await dialog.getByText('Ya existe una cuenta con ese correo.').waitFor();
        await dialog.getByLabel(/Correo electrónico/).fill('nuevo.admin@quinde.test');
        await dialog.getByRole('button', { name: 'Crear' }).click();
        await page.getByRole('cell', { name: 'nuevo.admin@quinde.test', exact: true }).waitFor();
        await page.getByRole('button', { name: 'Dar de baja administrador nuevo.admin@quinde.test' }).click();
        eq(await page.evaluate(() => document.activeElement?.textContent), 'No, mantener', 'foco inicial seguro');
        await page.getByRole('alertdialog').getByRole('button', { name: 'Dar de baja' }).click();
        await page.getByRole('cell', { name: 'nuevo.admin@quinde.test', exact: true }).waitFor({ state: 'detached' });
      });
      await check('auditoría: filtra, expande el diff con [REDACTED] y carga más', async () => {
        await page.goto(`${BASE}/auditoria`);
        await page.getByRole('heading', { level: 1, name: 'Auditoría' }).waitFor();
        await page.getByText(/\d+ evento\(s\) cargado\(s\)/).waitFor();
        await page.getByRole('button', { name: 'Cargar más' }).click();
        await page.getByText(/^(2[5-9]|[3-9]\d) evento/).waitFor();
        await page.getByRole('textbox', { name: 'Tabla' }).fill('usuario');
        await page.getByRole('button', { name: 'Aplicar filtros' }).click();
        await page.getByRole('button', { name: /\(Alta en usuario\)/ }).first().waitFor();
        await page.getByRole('button', { name: /\(Alta en usuario\)/ }).first().click();
        await page.getByText('[REDACTED]').first().waitFor();
        eq(await page.getByRole('button', { name: /Ocultar cambios/ }).first().getAttribute('aria-expanded'), 'true', 'aria-expanded');
        await axeScan(page, 'auditoría con diff');
      });
      await check('reservas: filtra, ve el detalle y cancela con confirmación explícita', async () => {
        await page.goto(`${BASE}/reservas`);
        await page.getByRole('heading', { level: 1, name: 'Reservas' }).waitFor();
        await page.getByText('12 reserva(s) cargada(s)').waitFor();
        await axeScan(page, 'reservas');
        await page.getByLabel('Estado').selectOption('CANCELLED');
        await page.getByText('2 reserva(s) cargada(s)').waitFor();
        await page.getByLabel('Estado').selectOption('');
        await page.getByText('12 reserva(s) cargada(s)').waitFor();
        await page.getByRole('button', { name: 'Ver detalle de la reserva K7M2QX' }).click();
        await page.getByRole('heading', { name: 'Pasajeros' }).waitFor();
        await page.waitForTimeout(500);
        await axeScan(page, 'detalle de reserva');
        await page.keyboard.press('Escape');
        await page.getByRole('dialog').waitFor({ state: 'detached' });
        await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Ver detalle de la reserva K7M2QX').catch(() => undefined);
        eq(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Ver detalle de la reserva K7M2QX', 'el foco vuelve al botón');
        await page.getByRole('button', { name: 'Cancelar reserva K7M2QX' }).click();
        eq(await page.evaluate(() => document.activeElement?.textContent), 'No, mantener', 'foco inicial seguro');
        await page.waitForTimeout(500); // termina la animación de entrada antes de medir el contraste
        await axeScan(page, 'confirmar cancelación');
        await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, cancelar la reserva' }).click();
        await page.getByText('La reserva K7M2QX quedó cancelada.', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Cancelar reserva K7M2QX' }).waitFor({ state: 'detached' });
      });
      await check('el menú ya no marca ninguna pantalla como pendiente', async () => {
        eq(await page.getByText('Pendiente en la API').count(), 0, 'textos de pendiente');
      });
      await check('sin errores en la consola', async () => eq(errors, [], 'errores'));
      await page.context().close();
    }

    /* ---------------------------------------------------------------- Viewports */
    group('Responsive: 320, 768 y 1280 px');
    const pages = ['/panel', '/vuelos', '/vuelos/crear', '/numeros-de-vuelo', '/rutas', '/tarifas', '/aeropuertos', '/familias-tarifarias', '/mapas-de-asientos', '/reservas', '/auditoria', '/administradores'];
    for (const width of [320, 768, 1280]) {
      const { page, errors } = await newPage(browser, { width, height: 800 }, external);
      await loginAdmin(page, '/panel');
      await check(`${width}px: ninguna pantalla tiene scroll horizontal de página`, async () => {
        const bad = [];
        for (const path of pages) {
          await page.goto(BASE + path);
          await page.locator('h1').waitFor();
          await page.waitForTimeout(250);
          const sw = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
          if (sw[0] > sw[1]) bad.push(`${path} (${sw[0]} > ${sw[1]})`);
        }
        eq(bad, [], 'pantallas con scroll horizontal');
      });
      await check(`${width}px: botones, enlaces del menú y campos miden al menos 44 px`, async () => {
        const bad = [];
        for (const path of ['/panel', '/vuelos', '/aeropuertos', '/vuelos/crear', '/reservas', '/auditoria', '/administradores']) {
          await page.goto(BASE + path);
          await page.locator('h1').waitFor();
          await page.waitForTimeout(300);
          const small = await page.evaluate(() =>
            [...document.querySelectorAll('button:not([role=checkbox]), nav a, input:not([type=checkbox]):not([type=radio]), select')]
              .filter((e) => e.getClientRects().length > 0 && !e.closest('.sr-only'))
              .map((e) => ({ r: e.getBoundingClientRect(), t: (e.textContent || e.getAttribute('aria-label') || e.name || e.tagName).trim().slice(0, 30) }))
              .filter(({ r }) => r.width > 0 && r.height > 0 && (r.height < 43.5 || r.width < 43.5))
              .map(({ r, t }) => `${t} ${Math.round(r.width)}x${Math.round(r.height)}`),
          );
          if (small.length) bad.push(`${path}: ${small.slice(0, 4).join('; ')}`);
        }
        eq(bad, [], 'objetivos pequeños');
      });
      if (width === 320) {
        await check('320px: el menú se abre con un botón, atrapa el foco y se cierra con Esc devolviendo el foco', async () => {
          await page.goto(BASE + '/panel');
          const menu = page.getByRole('button', { name: 'Abrir menú de navegación' });
          await menu.focus();
          await page.keyboard.press('Enter');
          await page.getByRole('dialog').waitFor();
          assert(await page.getByRole('dialog').getByRole('navigation', { name: 'Navegación principal' }).isVisible(), 'sin menú');
          await page.keyboard.press('Escape');
          await page.getByRole('dialog').waitFor({ state: 'detached' });
          // El foco vuelve al botón justo después de cerrar el diálogo: se espera en vez de leerlo en el mismo instante
          await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Abrir menú de navegación').catch(() => undefined);
          eq(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Abrir menú de navegación', 'foco devuelto');
          await page.screenshot({ path: `${OUT}panel-320.png`, fullPage: true });
        });
        await check('320px: el asistente se ve completo (capturas)', async () => {
          await page.goto(BASE + '/vuelos/crear');
          await page.getByRole('heading', { name: 'Paso 1: Ruta' }).waitFor();
          await page.screenshot({ path: `${OUT}wizard-320.png`, fullPage: true });
        });
      }
      await check(`${width}px: sin errores en la consola`, async () => eq(errors, [], 'errores'));
      await page.context().close();
    }

    /* ---------------------------------------------------------------- Teclado */
    group('Recorrido con teclado');
    {
      const { page } = await newPage(browser, { width: 1280, height: 900 }, external);
      await page.goto(BASE + '/ingresar');
      await check('ingresar solo con teclado', async () => {
        await page.getByLabel('Correo electrónico').focus();
        await page.keyboard.type(ADMIN.email);
        await page.keyboard.press('Tab');
        await page.keyboard.type(ADMIN.password);
        await page.keyboard.press('Enter');
        await page.waitForURL('**/panel');
      });
      await check('"Saltar al contenido" es el primer elemento y lleva el foco al contenido', async () => {
        await page.reload();
        await page.getByRole('heading', { level: 1, name: 'Panel' }).waitFor();
        await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
        await page.keyboard.press('Tab');
        eq(await page.evaluate(() => document.activeElement?.textContent), 'Saltar al contenido', 'primer Tab');
        await page.keyboard.press('Enter');
        eq(await page.evaluate(() => document.activeElement?.id), 'contenido', 'foco en el contenido');
      });
      await check('al cambiar de ruta el foco va al h1', async () => {
        await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Aerolíneas', exact: true }).focus();
        await page.keyboard.press('Enter');
        await page.getByRole('heading', { level: 1, name: 'Aerolíneas' }).waitFor();
        await page.waitForFunction(() => document.activeElement?.tagName === 'H1');
      });
      await check('todo foco es visible (contorno de 3 px) y el diálogo devuelve el foco con Esc', async () => {
        await page.getByRole('button', { name: 'Nueva aerolínea' }).focus();
        const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineWidth);
        eq(outline, '3px', 'contorno del foco');
        await page.keyboard.press('Enter');
        await page.getByRole('dialog').waitFor();
        await page.keyboard.press('Escape');
        await page.getByRole('dialog').waitFor({ state: 'detached' });
        await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Nueva aerolínea').catch(() => undefined);
        eq(await page.evaluate(() => document.activeElement?.textContent?.trim()), 'Nueva aerolínea', 'foco devuelto al botón');
      });
      await check('Tab dentro de un diálogo nunca sale de él (foco atrapado)', async () => {
        await page.getByRole('button', { name: 'Nueva aerolínea' }).click();
        await page.getByRole('dialog').waitFor();
        for (let i = 0; i < 12; i++) {
          await page.keyboard.press('Tab');
          assert(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]')), `el foco salió del diálogo en el Tab ${i + 1}`);
        }
        await page.keyboard.press('Escape');
      });
      await page.context().close();
    }

    /* ---------------------------------------------------------------- Accesibilidad (axe) */
    group('Accesibilidad (axe: WCAG 2.2 AA) en claro y oscuro');
    {
      const { page } = await newPage(browser, { width: 1280, height: 900 }, external);
      await loginAdmin(page, '/panel');
      const screens = ['/panel', '/vuelos', '/vuelos/crear', '/tarifas', '/aeropuertos', '/mapas-de-asientos', '/rutas', '/reservas', '/auditoria', '/administradores'];
      for (const dark of [false, true]) {
        await page.evaluate((d) => document.documentElement.classList.toggle('dark', d), dark);
        for (const path of screens) {
          await check(`${dark ? 'oscuro' : 'claro'} ${path}`, async () => {
            await page.goto(BASE + path);
            await page.evaluate((d) => document.documentElement.classList.toggle('dark', d), dark);
            await page.locator('h1').waitFor();
            await page.waitForTimeout(500);
            await axeScan(page, path);
          });
        }
      }
      await check('diálogos abiertos (crear aeropuerto y baja)', async () => {
        await page.evaluate(() => document.documentElement.classList.remove('dark'));
        await page.goto(BASE + '/aeropuertos');
        await page.locator('tbody tr td').first().waitFor();
        await page.getByRole('button', { name: 'Nuevo aeropuerto' }).click();
        await page.getByRole('dialog').waitFor();
        await page.getByRole('dialog').getByRole('button', { name: 'Crear' }).click();
        await axeScan(page, 'diálogo de alta con errores');
        await page.keyboard.press('Escape');
        await page.getByRole('dialog').waitFor({ state: 'detached' });
      });
      await page.context().close();
    }
  } finally {
    await browser.close();
    server.kill('SIGTERM');
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} comprobaciones correctas.`);
  if (failed.length) {
    console.log('\nFallaron:');
    for (const f of failed) console.log(` - ${f.label}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
