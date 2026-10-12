// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { ApiError, setAdminApi } from '@/shared/api';
import { Toaster } from '@/shared/ui';
import { createFakeAdminApi } from '@/test-support/fake-api/FakeAdminApi';
import { BookingsScreen } from '@/features/bookings';

function renderScreen() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <QueryProvider>
        <BookingsScreen />
        <Toaster />
      </QueryProvider>
    </MemoryRouter>,
  );
}

const keys: string[] = [];
let failFirst = false;

beforeEach(() => {
  keys.length = 0;
  failFirst = false;
  const api = createFakeAdminApi({ latencyMs: 0 });
  const cancel = api.bookings.cancel;
  // Registra las Idempotency-Key y, si se pide, falla el primer intento por red (antes de que el servidor lo vea)
  api.bookings.cancel = async (id, key, reason) => {
    keys.push(key);
    if (failFirst && keys.length === 1) throw new ApiError({ status: 0, code: 'NETWORK' });
    return cancel(id, key, reason);
  };
  setAdminApi(api);
});

describe('Reservas de administración', () => {
  it('lista las reservas de todos los clientes con su dueño y estado', async () => {
    renderScreen();
    expect(await screen.findByRole('region', { name: /Tabla de Reservas de los clientes/ })).toBeTruthy();
    expect(await screen.findByText('12 reserva(s) cargada(s)')).toBeTruthy();
    for (const email of ['ana@example.com', 'beto@example.com', 'carla@example.com']) {
      expect(screen.getAllByText(email).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText('Confirmada').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cancelada').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pago pendiente').length).toBeGreaterThan(0);
  });

  it('filtra por estado, por correo del cliente y por PNR; valida antes de pedir', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('12 reserva(s) cargada(s)');

    await user.selectOptions(screen.getByLabelText('Estado'), 'CANCELLED');
    expect(await screen.findByText('2 reserva(s) cargada(s)')).toBeTruthy();
    await user.selectOptions(screen.getByLabelText('Estado'), '');
    await screen.findByText('12 reserva(s) cargada(s)');

    await user.type(screen.getByLabelText(/Correo del cliente/), 'ana@example.com');
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
    expect(await screen.findByText('4 reserva(s) cargada(s)')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Quitar filtros' }));
    await screen.findByText('12 reserva(s) cargada(s)');
    await user.type(screen.getByLabelText('PNR'), 'abc');
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
    expect(await screen.findByText('El PNR tiene 6 letras o dígitos.')).toBeTruthy();
    expect(screen.getByText('12 reserva(s) cargada(s)')).toBeTruthy();
  });

  it('filtra por número de vuelo y avisa cuando no hay coincidencias', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('12 reserva(s) cargada(s)');
    await user.type(screen.getByLabelText(/Número de vuelo/), 'zz9999');
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
    expect(await screen.findByText('Sin reservas')).toBeTruthy();
  });

  it('el detalle muestra itinerarios, pasajeros, boletos e historial', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('12 reserva(s) cargada(s)');
    await user.click(screen.getByRole('button', { name: 'Ver detalle de la reserva K7M2QX' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reserva K7M2QX' });
    expect(await within(dialog).findByRole('heading', { name: 'Itinerarios' })).toBeTruthy();
    for (const section of ['Resumen', 'Pasajeros', 'Boletos', 'Historial']) expect(within(dialog).getByRole('heading', { name: section })).toBeTruthy();
    expect(within(dialog).getByRole('rowheader', { name: /Ana Prueba 1/ })).toBeTruthy();
    expect(within(dialog).getByText(/Booking created from hold/)).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('solo una reserva confirmada se puede cancelar', async () => {
    renderScreen();
    await screen.findByText('12 reserva(s) cargada(s)');
    // N7D9UT y la primera cancelada: i = 5 → P8S3KD; la pendiente de pago: i = 3 → D2F6VC
    expect(screen.queryByRole('button', { name: 'Cancelar reserva P8S3KD' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cancelar reserva D2F6VC' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Cancelar reserva K7M2QX' })).toBeTruthy();
  });

  it('cancelar pide confirmación explícita (foco en la opción segura), cancela y actualiza la lista', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('12 reserva(s) cargada(s)');
    await user.click(screen.getByRole('button', { name: 'Cancelar reserva K7M2QX' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(document.activeElement?.textContent).toBe('No, mantener');
    expect(within(dialog).getByText('¿Cancelar la reserva K7M2QX?')).toBeTruthy();

    // "No, mantener" no cancela nada
    await user.click(within(dialog).getByRole('button', { name: 'No, mantener' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(keys).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Cancelar reserva K7M2QX' }));
    const again = await screen.findByRole('alertdialog');
    await user.type(within(again).getByLabelText(/Motivo/), 'Pedido del cliente');
    await user.click(within(again).getByRole('button', { name: 'Sí, cancelar la reserva' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(await screen.findByText('La reserva K7M2QX quedó cancelada.')).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Cancelar reserva K7M2QX' })).toBeNull());
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('un reintento tras un fallo de red reusa la Idempotency-Key; un intento nuevo usa otra', async () => {
    failFirst = true;
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('12 reserva(s) cargada(s)');
    await user.click(screen.getByRole('button', { name: 'Cancelar reserva K7M2QX' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Sí, cancelar la reserva' }));
    expect(await within(dialog).findByText(/No se pudo conectar con la API/)).toBeTruthy();
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'Sí, cancelar la reserva' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);

    // Otra reserva = otro intento = otra clave
    await user.click(await screen.findByRole('button', { name: 'Cancelar reserva H5R9ZP' }));
    const next = await screen.findByRole('alertdialog');
    await user.click(within(next).getByRole('button', { name: 'Sí, cancelar la reserva' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(keys).toHaveLength(3);
    expect(keys[2]).not.toBe(keys[0]);
  });

  it('cerrar y volver a abrir el diálogo es un intento nuevo con otra clave', async () => {
    failFirst = true;
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('12 reserva(s) cargada(s)');
    await user.click(screen.getByRole('button', { name: 'Cancelar reserva K7M2QX' }));
    let dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Sí, cancelar la reserva' }));
    await within(dialog).findByText(/No se pudo conectar/);
    await user.click(within(dialog).getByRole('button', { name: 'No, mantener' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());

    await user.click(screen.getByRole('button', { name: 'Cancelar reserva K7M2QX' }));
    dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).queryByText(/No se pudo conectar/)).toBeNull();
    await user.click(within(dialog).getByRole('button', { name: 'Sí, cancelar la reserva' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(keys).toHaveLength(2);
    expect(keys[1]).not.toBe(keys[0]);
  });
});
