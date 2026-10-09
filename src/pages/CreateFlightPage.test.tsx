// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it } from 'vitest';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { setApiMode } from '@/shared/api';
import { addDaysToDate, todayIn } from '@/shared/lib/dates';
import { CreateFlightPage } from './CreateFlightPage';

beforeAll(() => setApiMode('demo'));

const future = (days: number) => addDaysToDate(todayIn('America/Guayaquil'), days);

function renderWizard() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <QueryProvider>
        <CreateFlightPage />
      </QueryProvider>
    </MemoryRouter>,
  );
}

const next = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: 'Siguiente' }));
const alerts = () => screen.queryAllByRole('alert').map((a) => a.textContent ?? '');

describe('Asistente "Crear vuelo" (modo demo)', () => {
  it('recorre los 5 pasos con validaciones y crea el vuelo, las salidas y las tarifas', async () => {
    const user = userEvent.setup();
    renderWizard();

    // Paso 1: ruta (origen ≠ destino)
    expect(await screen.findByRole('heading', { name: 'Paso 1: Ruta' })).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    await screen.findAllByRole('option', { name: /UIO — / });
    await next(user);
    expect(alerts().join(' ')).toContain('Este campo es obligatorio.');
    await user.selectOptions(screen.getByLabelText('Origen'), 'UIO');
    await user.selectOptions(screen.getByLabelText('Destino'), 'UIO');
    await next(user);
    expect(alerts().join(' ')).toContain('El destino debe ser distinto del origen.');
    await user.selectOptions(screen.getByLabelText('Destino'), 'GYE');
    await next(user);

    // Paso 2: aerolínea, equipo, mapa y número de vuelo (uno que ya existe se rechaza)
    expect(await screen.findByRole('heading', { name: 'Paso 2: Aerolínea y equipo' })).toBeTruthy();
    await user.selectOptions(await screen.findByLabelText('Aerolínea', { exact: true }), 'AV');
    await user.selectOptions(screen.getByLabelText('Equipo (aeronave)'), '320');
    await waitFor(() => expect((screen.getByLabelText('Mapa de asientos') as HTMLSelectElement).value).not.toBe(''));
    await user.type(screen.getByLabelText(/Número nuevo/), '1500');
    await next(user);
    expect((await screen.findAllByText(/El vuelo AV1500 ya existe/)).length).toBeGreaterThan(0);
    await user.clear(screen.getByLabelText(/Número nuevo/));
    await user.type(screen.getByLabelText(/Número nuevo/), '1777');
    await next(user);

    // Paso 3: horario (la llegada debe ser posterior; varias fechas)
    expect(await screen.findByRole('heading', { name: 'Paso 3: Horario' })).toBeTruthy();
    await screen.findByText(/Hora local de UIO/);
    fireEvent.change(screen.getByLabelText('Primera fecha de salida'), { target: { value: future(5) } });
    fireEvent.change(screen.getByLabelText('Repetir hasta (opcional)'), { target: { value: future(6) } });
    fireEvent.change(screen.getByLabelText('Hora de salida'), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText('Hora de llegada'), { target: { value: '08:00' } });
    await next(user);
    expect((await screen.findAllByText(/La llegada debe ser posterior a la salida/)).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Hora de llegada'), { target: { value: '09:55' } });
    expect(screen.getByText(/Se crearán 2 salidas/)).toBeTruthy();
    await next(user);

    // Paso 4: sin tarifa no avanza; con una, sí (y avisa de un monto absurdo sin bloquear)
    expect(await screen.findByRole('heading', { name: 'Paso 4: Cabinas y tarifas' })).toBeTruthy();
    const basic = await screen.findByLabelText(/Vender con Basic/);
    await next(user);
    expect(alerts().join(' ')).toContain('Elige al menos una familia tarifaria');
    await user.click(basic);
    await next(user);
    await waitFor(() => expect(alerts().join(' ')).toContain('Este campo es obligatorio.'));
    await user.type(screen.getByLabelText('Adulto: Tarifa base'), '4128.00');
    await user.type(screen.getByLabelText('Adulto: Impuestos'), '0.00');
    expect(await screen.findByText(/parece demasiado alto/)).toBeTruthy();
    await user.clear(screen.getByLabelText('Adulto: Tarifa base'));
    await user.type(screen.getByLabelText('Adulto: Tarifa base'), '58.00');
    await user.clear(screen.getByLabelText('Adulto: Impuestos'));
    await user.type(screen.getByLabelText('Adulto: Impuestos'), '11.60');
    await waitFor(() => expect(screen.queryByText(/parece demasiado alto/)).toBeNull());
    await next(user);

    // Paso 5: resumen y confirmación
    expect(await screen.findByRole('heading', { name: 'Paso 5: Revisar y confirmar' })).toBeTruthy();
    expect(screen.getByText('AV1777 (se creará)')).toBeTruthy();
    expect(screen.getByText(/2: /)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Confirmar y crear vuelo' }));
    const success = await screen.findByRole('heading', { name: 'Vuelo AV1777 creado' }, { timeout: 10_000 });
    expect(success).toBeTruthy();
    const table = screen.getByRole('table', { name: 'Identificadores creados' });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Ver en la lista' }).getAttribute('href')).toBe('/vuelos?vuelo=AV1777');
  }, 60_000);

  it('al volver a un paso conserva lo escrito', async () => {
    const user = userEvent.setup();
    renderWizard();
    await screen.findAllByRole('option', { name: /GYE — / });
    await user.selectOptions(screen.getByLabelText('Origen'), 'GYE');
    await user.selectOptions(screen.getByLabelText('Destino'), 'CUE');
    await next(user);
    await screen.findByRole('heading', { name: 'Paso 2: Aerolínea y equipo' });
    await user.click(screen.getByRole('button', { name: 'Atrás' }));
    await screen.findByRole('heading', { name: 'Paso 1: Ruta' });
    expect((screen.getByLabelText('Origen') as HTMLSelectElement).value).toBe('GYE');
    expect((screen.getByLabelText('Destino') as HTMLSelectElement).value).toBe('CUE');
  });
});
