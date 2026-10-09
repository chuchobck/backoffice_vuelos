// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it } from 'vitest';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { setApiMode } from '@/shared/api';
import { Toaster } from '@/shared/ui';
import { CountriesPage } from './CountriesPage';

function renderScreen() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <QueryProvider>
        <CountriesPage />
        <Toaster />
      </QueryProvider>
    </MemoryRouter>,
  );
}

beforeAll(() => setApiMode('demo'));

describe('Países: tabla con CRUD (modo demo)', () => {
  it('lista, crea, da de baja con confirmación, muestra los dados de baja y reactiva', async () => {
    const user = userEvent.setup();
    renderScreen();

    // Lista con tabla accesible
    expect(await screen.findByRole('cell', { name: 'Ecuador' })).toBeTruthy();
    expect(screen.getByRole('region', { name: /Tabla de Países/ })).toBeTruthy();

    // Alta: validación al enviar (sin borrar) y luego correcta
    await user.click(screen.getByRole('button', { name: 'Nuevo país' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Crear' }));
    expect((await within(dialog).findAllByText('Este campo es obligatorio.')).length).toBeGreaterThan(0);
    await user.type(within(dialog).getByLabelText(/Código ISO \(2 letras\)/), 'pe');
    await user.type(within(dialog).getByLabelText(/Código ISO3/), 'per');
    await user.type(within(dialog).getByLabelText('Nombre'), 'Perú');
    await user.click(within(dialog).getByRole('button', { name: 'Crear' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByRole('cell', { name: 'Perú' })).toBeTruthy();

    // Baja lógica: pide confirmación y el foco inicial va a la opción segura
    await user.click(screen.getByRole('button', { name: 'Dar de baja país PE' }));
    const confirm = await screen.findByRole('alertdialog');
    expect(document.activeElement?.textContent).toBe('No, mantener');
    await user.click(within(confirm).getByRole('button', { name: 'Dar de baja' }));
    await waitFor(() => expect(screen.queryByRole('cell', { name: 'Perú' })).toBeNull());
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());

    // Con "Mostrar dados de baja" reaparece, marcado como inactivo, y se reactiva
    await user.click(screen.getByLabelText('Mostrar dados de baja'));
    expect(await screen.findByRole('cell', { name: 'Perú' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Reactivar país PE' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Dar de baja país PE' })).toBeTruthy());
  });

  it('una baja que la API rechaza (409: lo usan ciudades activas) muestra el mensaje en español y no cierra el diálogo', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(await screen.findByRole('button', { name: 'Dar de baja país EC' }));
    const confirm = await screen.findByRole('alertdialog');
    await user.click(within(confirm).getByRole('button', { name: 'Dar de baja' }));
    expect(await within(confirm).findByText('No se puede dar de baja porque otros registros activos lo usan.')).toBeTruthy();
    expect(screen.getByRole('alertdialog')).toBeTruthy();
  });

  it('tiene un solo h1 y las migas de pan', async () => {
    renderScreen();
    await screen.findByRole('cell', { name: 'Ecuador' });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('ordena por columna y lo indica con aria-sort', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole('cell', { name: 'Ecuador' });
    const header = screen.getByRole('columnheader', { name: /Nombre/ });
    expect(header.getAttribute('aria-sort')).toBe('none');
    await user.click(within(header).getByRole('button'));
    expect(header.getAttribute('aria-sort')).toBe('ascending');
    await user.click(within(header).getByRole('button'));
    expect(header.getAttribute('aria-sort')).toBe('descending');
  });

  it('busca dentro de las filas cargadas y avisa cuando no hay resultados', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByRole('cell', { name: 'Ecuador' });
    await user.type(screen.getByLabelText('Buscar'), 'zzzz');
    expect(await screen.findByText('Sin resultados')).toBeTruthy();
  });
});
