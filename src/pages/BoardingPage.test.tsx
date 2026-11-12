// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { QueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeQueryClient, QueryProvider } from '@/app/providers/QueryProvider';
import { ApiError, setAdminApi, type BoardingManifest, type Departure } from '@/shared/api';
import { createFakeAdminApi, type FakeAdminApi } from '@/test-support/fake-api/FakeAdminApi';
import { BoardingPage } from './BoardingPage';

const PNR = 'K7M2QX';
const NAME = { first: 'Ana', last: 'Prueba 1' };

let api: FakeAdminApi;
let client: QueryClient;
let dep: Departure;
let user: ReturnType<typeof userEvent.setup>;

function renderPage() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <QueryProvider client={client}>
        <BoardingPage />
      </QueryProvider>
    </MemoryRouter>,
  );
}

/** La salida de la reserva K7M2QX (la semilla no tiene salidas "hoy": se elige su fecha). */
async function seededDeparture(): Promise<Departure> {
  const summary = (await api.bookings.list({ filters: { pnr: PNR } })).items[0]!;
  const booking = await api.bookings.get(summary.bookingId);
  return api.departures.get(booking.itineraries[0]!.segments[0]!.segmentId);
}

async function openGate(target: Departure = dep) {
  fireEvent.change(screen.getByLabelText(/Fecha de salida/), { target: { value: target.departureDate } });
  const select = screen.getByLabelText(/^Salida/);
  await waitFor(() => expect(within(select).queryByRole('option', { name: new RegExp(target.flightNumber) })).toBeTruthy());
  const option = within(select).getByRole('option', { name: new RegExp(`^${target.flightNumber} `) }) as HTMLOptionElement;
  await user.selectOptions(select, option.value);
  await screen.findByLabelText(/Código del pase/);
}

const field = () => screen.getByLabelText(/Código del pase/) as HTMLInputElement;
async function scan(text: string) {
  await user.type(field(), `${text}{Enter}`);
}
const result = () => screen.getByRole('status', { name: 'Resultado del escaneo' });

beforeEach(async () => {
  api = createFakeAdminApi({ latencyMs: 0 });
  setAdminApi(api);
  client = makeQueryClient();
  user = userEvent.setup();
  dep = await seededDeparture();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Puerta de embarque: elegir la salida y ver el manifiesto', () => {
  it('pide elegir una salida; por defecto el día es hoy y sin salidas lo dice', async () => {
    renderPage();
    expect(screen.getByText('Elige una salida para empezar a embarcar.')).toBeTruthy();
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date());
    expect((screen.getByLabelText(/Fecha de salida/) as HTMLInputElement).value).toBe(today);
    expect(await screen.findByText('No hay salidas programadas ese día.')).toBeTruthy();
    expect(screen.queryByLabelText(/Código del pase/)).toBeNull();
  });

  it('con la salida elegida muestra estado, puerta y los conteos con barras que también dicen el valor en texto', async () => {
    await api.departures.update(dep.id, { departureGate: 'A3' });
    api.boardingControls.checkIn(PNR);
    api.boardingControls.attachInfant(PNR, 'ADU1', { passengerId: 'INF1', firstName: 'Bebé', lastName: 'Prueba' });
    renderPage();
    await openGate();

    const summary = await screen.findByRole('region', { name: new RegExp(`Salida ${dep.flightNumber}`) });
    expect(within(summary).getByText('Programado')).toBeTruthy();
    expect(within(summary).getByText('A3')).toBeTruthy();
    expect(within(summary).getByText(/^Vendidos: 1/)).toBeTruthy();

    const checkedIn = within(summary).getByRole('progressbar', { name: 'Con check-in' });
    expect(checkedIn.getAttribute('aria-valuenow')).toBe('1');
    expect(checkedIn.getAttribute('aria-valuemax')).toBe('1');
    expect(checkedIn.getAttribute('aria-valuetext')).toBe('1 de 1 (100 %)');
    expect(within(summary).getByRole('progressbar', { name: 'Abordados' }).getAttribute('aria-valuetext')).toBe('0 de 1 (0 %)');
    expect(within(summary).getByRole('progressbar', { name: 'Infantes con check-in' }).getAttribute('aria-valuetext')).toBe('1 de 1 (100 %)');
  });

  it('sin puerta asignada lo dice con texto', async () => {
    renderPage();
    await openGate();
    expect(await screen.findByText('Sin puerta asignada')).toBeTruthy();
  });

  it('la tabla del manifiesto tiene caption, no trae nombres ni documentos, y filtra por estado', async () => {
    api.boardingControls.checkIn(PNR);
    const real = api.boarding.manifest;
    const extra: BoardingManifest['seats'] = [
      { seat: '11B', cabinClass: 'ECONOMY', pnr: 'AAAAAA', passengerId: 'ADU1', status: 'CHECKED_IN', boardingGroup: '2', boardedAt: null },
      { seat: '12C', cabinClass: 'BUSINESS', pnr: 'BBBBBB', passengerId: 'ADU1', status: 'BOARDED', boardingGroup: '1', boardedAt: '2026-10-20T13:05:00Z' },
      { seat: '14D', cabinClass: 'ECONOMY', pnr: 'CCCCCC', passengerId: 'ADU1', status: 'BOOKED', boardingGroup: null, boardedAt: null },
      { seat: '15E', cabinClass: 'ECONOMY', pnr: 'DDDDDD', passengerId: 'ADU1', status: 'TICKETED', boardingGroup: null, boardedAt: null },
    ];
    api.boarding.manifest = async (id) => {
      const m = await real(id);
      return { ...m, seats: [...m.seats, ...extra] };
    };
    renderPage();
    await openGate();

    const table = await screen.findByRole('table', { name: `Manifiesto de la salida ${dep.flightNumber}` });
    expect(table.closest('[role=region]')?.className).toMatch(/\brelative\b/);
    expect(within(table).getAllByRole('row')).toHaveLength(6);
    const text = table.textContent ?? '';
    expect(text).not.toContain(NAME.first);
    expect(text).not.toContain('Prueba 1');
    for (const label of ['Vendido', 'Con boleto', 'Con check-in', 'Abordó']) expect(within(table).getAllByText(label).length).toBeGreaterThan(0);
    // Hora de abordaje en la hora local del aeropuerto de origen (UIO: UTC−5): 13:05Z → 08:05
    expect(within(within(table).getByText('12C').closest('tr')!).getByText('08:05')).toBeTruthy();

    await user.selectOptions(screen.getByLabelText(/Filtrar por estado/), 'BOARDED');
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(screen.getByText('1 de 5 asientos')).toBeTruthy();
    await user.selectOptions(screen.getByLabelText(/Filtrar por estado/), 'CHECKED_IN');
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    await user.selectOptions(screen.getByLabelText(/Filtrar por estado/), '');
    expect(within(table).getAllByRole('row')).toHaveLength(6);
  });

  it('"Ver reserva" lleva a la reserva con ese PNR (abre el detalle existente, sin duplicarlo)', async () => {
    renderPage();
    await openGate();
    const link = await screen.findByRole('link', { name: `Ver reserva ${PNR}, asiento 10A` });
    expect(link.textContent).toBe('Ver reserva');
    expect(link.getAttribute('href')).toBe(`/reservas?pnr=${PNR}`);
  });

  it('se refresca cada 10 segundos', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const calls = vi.spyOn(api.boarding, 'manifest');
    renderPage();
    await openGate();
    await screen.findByRole('table');
    const before = calls.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_500);
    });
    expect(calls.mock.calls.length).toBeGreaterThan(before);
    api.boardingControls.checkIn(PNR);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_500);
    });
    expect(await screen.findAllByText('Con check-in')).toBeTruthy();
  });
});

describe('Puerta de embarque: escaneo', () => {
  it('el campo tiene etiqueta visible y foco automático', async () => {
    renderPage();
    await openGate();
    expect(document.activeElement).toBe(field());
    expect(screen.getByText('Código del pase')).toBeTruthy();
  });

  it('un abordaje exitoso muestra ABORDÓ con nombre, asiento, grupo y posición; limpia el campo y devuelve el foco', async () => {
    api.boardingControls.checkIn(PNR, 'ADU1', '4');
    api.boardingControls.attachInfant(PNR, 'ADU1', { passengerId: 'INF1', firstName: 'Luz', lastName: 'Menor' });
    renderPage();
    await openGate();
    await scan(api.boardingControls.passFor(PNR));

    const status = result();
    expect(await within(status).findByText('ABORDÓ')).toBeTruthy();
    expect(within(status).getByText(`${NAME.first} ${NAME.last}`)).toBeTruthy();
    expect(within(status).getByText('Luz Menor')).toBeTruthy();
    expect(within(status).getByText('10A')).toBeTruthy();
    expect(within(status).getByText('4')).toBeTruthy();
    expect(within(status).getByText('001')).toBeTruthy();
    expect(field().value).toBe('');
    expect(document.activeElement).toBe(field());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('pegar el texto y presionar Enter funciona igual, y el botón también envía', async () => {
    api.boardingControls.checkIn(PNR);
    renderPage();
    await openGate();
    await user.click(field());
    await user.paste(api.boardingControls.passFor(PNR));
    await user.click(screen.getByRole('button', { name: 'Registrar abordaje' }));
    expect(await within(result()).findByText('ABORDÓ')).toBeTruthy();
  });

  it('tras abordar, el manifiesto se refresca solo: el asiento pasa a Abordó y el conteo sube', async () => {
    api.boardingControls.checkIn(PNR);
    renderPage();
    await openGate();
    await screen.findByRole('progressbar', { name: 'Abordados' });
    expect(screen.getByRole('progressbar', { name: 'Abordados' }).getAttribute('aria-valuenow')).toBe('0');
    await scan(api.boardingControls.passFor(PNR));
    await waitFor(() => expect(screen.getByRole('progressbar', { name: 'Abordados' }).getAttribute('aria-valuenow')).toBe('1'));
    const row = within(screen.getByRole('table')).getByText('10A').closest('tr')!;
    expect(within(row).getByText('Abordó')).toBeTruthy();
  });

  it('el nombre se borra a los 8 segundos: ni en pantalla, ni en el caché, ni en el almacenamiento, ni en consola', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => undefined));
    api.boardingControls.checkIn(PNR);
    renderPage();
    await openGate();
    await scan(api.boardingControls.passFor(PNR));
    expect(await within(result()).findByText(`${NAME.first} ${NAME.last}`)).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(7_000);
    });
    expect(screen.queryByText(`${NAME.first} ${NAME.last}`)).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_100);
    });
    expect(screen.queryByText(`${NAME.first} ${NAME.last}`)).toBeNull();
    expect(screen.queryByText('ABORDÓ')).toBeNull();
    expect(document.body.textContent).not.toContain(NAME.last);

    const everything = JSON.stringify([
      client.getMutationCache().getAll().map((m) => m.state),
      client.getQueryCache().getAll().map((q) => q.state.data),
      { ...localStorage },
      { ...sessionStorage },
      spies.map((s) => s.mock.calls),
    ]);
    expect(everything).not.toContain('Prueba 1');
    expect(everything).not.toContain('"Ana"');
    expect(client.getMutationCache().getAll()).toHaveLength(0);
  });

  it('un escaneo nuevo borra el nombre anterior de inmediato', async () => {
    api.boardingControls.checkIn(PNR);
    renderPage();
    await openGate();
    await scan(api.boardingControls.passFor(PNR));
    expect(await within(result()).findByText(`${NAME.first} ${NAME.last}`)).toBeTruthy();
    await scan(api.boardingControls.passFor(PNR)); // ya abordó
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText(`${NAME.first} ${NAME.last}`)).toBeNull();
    expect(client.getMutationCache().getAll().every((m) => !JSON.stringify(m.state).includes('Prueba 1'))).toBe(true);
  });

  it('un texto que no empieza con BP1| se rechaza en pantalla sin llamar a la API', async () => {
    const scanCall = vi.spyOn(api.boarding, 'scan');
    renderPage();
    await openGate();
    await scan('K7M2QX');
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('No puede abordar');
    expect(alert.textContent).toContain('no tiene el formato de un pase');
    expect(scanCall).not.toHaveBeenCalled();
    expect(field().value).toBe('');
    expect(document.activeElement).toBe(field());
  });

  it('una entrada vacía (solo Enter) no hace nada', async () => {
    const scanCall = vi.spyOn(api.boarding, 'scan');
    renderPage();
    await openGate();
    await user.type(field(), '{Enter}');
    expect(scanCall).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('Puerta de embarque: cada error con su mensaje (icono + texto, nunca el detail)', () => {
  const alertText = async () => (await screen.findByRole('alert')).textContent ?? '';

  it('BOARDING_PASS_MALFORMED (400): el backend rechaza el formato', async () => {
    renderPage();
    await openGate();
    await scan('BP1|esto-no-es-un-pase');
    expect(await alertText()).toMatch(/no tiene el formato de un pase de abordar/);
  });

  it('BOARDING_PASS_SIGNATURE_INVALID (422): posible pase falsificado', async () => {
    api.boardingControls.checkIn(PNR);
    renderPage();
    await openGate();
    const pass = api.boardingControls.passFor(PNR);
    await scan(`${pass.slice(0, -1)}${pass.endsWith('0') ? '1' : '0'}`);
    expect(await alertText()).toMatch(/firma del pase no es válida.*falsificado/);
  });

  it('PASSENGER_NOT_CHECKED_IN (409)', async () => {
    renderPage();
    await openGate();
    await scan(api.boardingControls.passFor(PNR));
    expect(await alertText()).toMatch(/todavía no hizo el check-in/);
  });

  it('ALREADY_BOARDED (409)', async () => {
    api.boardingControls.checkIn(PNR);
    renderPage();
    await openGate();
    await scan(api.boardingControls.passFor(PNR));
    await within(result()).findByText('ABORDÓ');
    await scan(api.boardingControls.passFor(PNR));
    expect(await alertText()).toMatch(/ya abordó/);
  });

  it('BOARDING_PASS_WRONG_FLIGHT (409): el pase es de otra salida', async () => {
    api.boardingControls.checkIn(PNR);
    const other = (await api.departures.list({ filters: { dateFrom: dep.departureDate, dateTo: dep.departureDate }, limit: 50 })).items.find((d) => d.id !== dep.id)!;
    renderPage();
    await openGate(other);
    await scan(api.boardingControls.passFor(PNR));
    expect(await alertText()).toMatch(/pase es de otro vuelo/);
  });

  it('BOARDING_PASS_NOT_VALID (409): la reserva se canceló después del check-in', async () => {
    api.boardingControls.checkIn(PNR);
    const summary = (await api.bookings.list({ filters: { pnr: PNR } })).items[0]!;
    const pass = api.boardingControls.passFor(PNR);
    await api.bookings.cancel(summary.bookingId, 'clave-1');
    renderPage();
    await openGate();
    await scan(pass);
    expect(await alertText()).toMatch(/pase no es válido/);
  });

  it('FLIGHT_CANCELLED (409) y FLIGHT_ALREADY_DEPARTED (409)', async () => {
    api.boardingControls.checkIn(PNR);
    renderPage();
    await openGate();
    await api.departures.update(dep.id, { status: 'DEPARTED' });
    await scan(api.boardingControls.passFor(PNR));
    expect(await alertText()).toMatch(/vuelo ya despegó/);
    await api.departures.deactivate(dep.id);
    await scan(api.boardingControls.passFor(PNR));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/vuelo está cancelado/));
  });

  it.each([
    [404, 'BOARDING_PASS_NOT_FOUND', /No se encontró el boleto de este pase/],
    [429, 'RATE_LIMIT_EXCEEDED', /Demasiados escaneos/],
    [404, undefined, /La salida no existe/],
  ] as const)('%s %s', async (status, code, expected) => {
    // El `detail` técnico nunca se muestra, ni siquiera cuando viene en la respuesta.
    vi.spyOn(api.boarding, 'scan').mockRejectedValue(new ApiError({ status, code, detail: 'Boarding pass ticket not found: SECRETO-TECNICO' }));
    renderPage();
    await openGate();
    await scan('BP1|cualquier-cosa');
    const text = await alertText();
    expect(text).toMatch(expected);
    expect(text).not.toContain('SECRETO-TECNICO');
  });

  it('un error de red usa el mensaje general y el campo queda listo para el siguiente pase', async () => {
    vi.spyOn(api.boarding, 'scan').mockRejectedValue(new ApiError({ status: 0, code: 'NETWORK' }));
    renderPage();
    await openGate();
    await scan('BP1|x');
    expect(await alertText()).toMatch(/No se pudo conectar/);
    expect(document.activeElement).toBe(field());
  });
});
