// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { ApiError, setAdminApi, type BookingDetail } from '@/shared/api';
import { createFakeAdminApi, type FakeAdminApi } from '@/test-support/fake-api/FakeAdminApi';
import { BookingsPage } from './BookingsPage';

const PNR = 'K7M2QX';
let api: FakeAdminApi;

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <QueryProvider>
        <BookingsPage />
      </QueryProvider>
    </MemoryRouter>,
  );
}

async function openDetail(pnr = PNR) {
  renderAt(`/reservas?pnr=${pnr}`);
  const dialog = await screen.findByRole('dialog', { name: `Reserva ${pnr}` });
  const table = await within(dialog).findByRole('table', { name: 'Pasajeros' });
  return { dialog, table };
}

/** Celda de check-in del primer pasajero (la columna se identifica por su encabezado). */
function checkInCell(table: HTMLElement) {
  const headers = within(table).getAllByRole('columnheader').map((h) => h.textContent);
  const col = headers.indexOf('Check-in');
  expect(col).toBeGreaterThanOrEqual(0);
  const row = within(table).getAllByRole('row')[1]!;
  return [within(row).getByRole('rowheader'), ...within(row).getAllByRole('cell')][col]!;
}

beforeEach(() => {
  api = createFakeAdminApi({ latencyMs: 0 });
  setAdminApi(api);
});

describe('Reservas: "Ver reserva" desde la puerta de embarque (?pnr=)', () => {
  it('filtra por ese PNR y abre el detalle existente', async () => {
    const { dialog } = await openDetail();
    expect(within(dialog).getByText('Ana Prueba 1')).toBeTruthy();
    // La lista de fondo quedó filtrada por ese PNR
    expect(screen.getByText('1 reserva(s) cargada(s)')).toBeTruthy();
  });

  it('un valor que no es un PNR se ignora: lista normal y sin detalle', async () => {
    renderAt('/reservas?pnr=xx');
    expect(await screen.findByText('12 reserva(s) cargada(s)')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('un PNR válido que no existe muestra el vacío, sin romper', async () => {
    renderAt('/reservas?pnr=ZZZZZZ');
    expect(await screen.findByText('Sin reservas')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('Detalle de la reserva: columna Check-in por pasajero', () => {
  it('Sin check-in: el pasajero tiene boleto pero no hizo el check-in', async () => {
    const { table } = await openDetail();
    await waitFor(() => expect(within(checkInCell(table)).getByText('Sin check-in')).toBeTruthy());
  });

  it('Check-in hecho', async () => {
    api.boardingControls.checkIn(PNR);
    const { table } = await openDetail();
    await waitFor(() => expect(within(checkInCell(table)).getByText('Check-in hecho')).toBeTruthy());
  });

  it('Abordó, con la hora local del aeropuerto', async () => {
    api.boardingControls.checkIn(PNR);
    const summary = (await api.bookings.list({ filters: { pnr: PNR } })).items[0]!;
    const booking = await api.bookings.get(summary.bookingId);
    await api.boarding.scan(booking.itineraries[0]!.segments[0]!.segmentId, api.boardingControls.passFor(PNR));
    const { table } = await openDetail();
    // La hora va en la hora local del aeropuerto de origen, con la zona solo para lectores de pantalla
    await waitFor(() => expect(checkInCell(table).textContent).toMatch(/^Abordó · \d{2}:\d{2} \(Ecuador continental \(UTC−5\)\)$/));
  });

  it('Sin asiento: una reserva cancelada ya no tiene asientos', async () => {
    const summary = (await api.bookings.list({ filters: { pnr: 'B3N8TW' } })).items[0]!;
    await api.bookings.cancel(summary.bookingId, 'clave-sin-asiento');
    const { table } = await openDetail('B3N8TW');
    expect(within(checkInCell(table)).getByText('Sin asiento')).toBeTruthy();
  });

  it('No disponible: si el manifiesto falla, el resto del detalle sigue funcionando', async () => {
    vi.spyOn(api.boarding, 'manifest').mockRejectedValue(new ApiError({ status: 403 }));
    const { dialog, table } = await openDetail();
    await waitFor(() => expect(within(checkInCell(table)).getByText('No disponible')).toBeTruthy());
    expect(within(dialog).getByText('Ana Prueba 1')).toBeTruthy();
    expect(within(dialog).getByRole('heading', { name: 'Boletos' })).toBeTruthy();
    expect(within(dialog).getByRole('heading', { name: 'Historial' })).toBeTruthy();
    expect(within(dialog).queryByRole('alert')).toBeNull();
  });

  it('No disponible: el pasajero tiene asiento pero el manifiesto no trae su passengerId (no se adivina)', async () => {
    const real = api.bookings.get;
    api.bookings.get = async (id) => {
      const d = await real(id);
      return { ...d, passengers: d.passengers.map((p) => ({ ...p, passengerId: 'OTRO9' })) };
    };
    const { table } = await openDetail();
    await waitFor(() => expect(within(checkInCell(table)).getByText('No disponible')).toBeTruthy());
  });

  it('con varios segmentos muestra un valor por segmento y un fallo parcial solo afecta a ese segmento', async () => {
    api.boardingControls.checkIn(PNR);
    const second = (await api.departures.list({ limit: 50 })).items.find((d) => d.flightNumber === 'AV1500')!;
    const realGet = api.bookings.get;
    api.bookings.get = async (id) => {
      const d: BookingDetail = await realGet(id);
      const seg = d.itineraries[0]!.segments[0]!;
      return {
        ...d,
        itineraries: [{ ...d.itineraries[0]!, segments: [seg, { ...seg, segmentId: second.id, flightNumber: second.flightNumber }] }],
        passengers: d.passengers.map((p) => ({ ...p, assignedSeats: [...(p.assignedSeats ?? []), { segmentId: second.id, seatNumber: '11A' }] })),
      };
    };
    const realManifest = api.boarding.manifest;
    api.boarding.manifest = async (id) => {
      if (id === second.id) throw new ApiError({ status: 404 });
      return realManifest(id);
    };
    const { table } = await openDetail();
    const cell = checkInCell(table);
    await waitFor(() => expect(within(cell).getByText('LA1400: Check-in hecho')).toBeTruthy());
    expect(within(cell).getByText('AV1500: No disponible')).toBeTruthy();
    expect(within(cell).getAllByRole('listitem')).toHaveLength(2);
  });

  it('carga perezosa: sin abrir el detalle no se pide ningún manifiesto', async () => {
    const calls = vi.spyOn(api.boarding, 'manifest');
    renderAt('/reservas');
    await screen.findByText('12 reserva(s) cargada(s)');
    expect(calls).not.toHaveBeenCalled();
    await userEvent.setup().click(screen.getByRole('button', { name: `Ver detalle de la reserva ${PNR}` }));
    await screen.findByRole('dialog');
    await waitFor(() => expect(calls).toHaveBeenCalledTimes(1));
  });
});
