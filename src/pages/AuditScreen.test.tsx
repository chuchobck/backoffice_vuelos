// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { setAdminApi } from '@/shared/api';
import { createFakeAdminApi } from '@/test-support/fake-api/FakeAdminApi';
import { AuditScreen } from '@/features/audit';

function renderScreen() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <QueryProvider>
        <AuditScreen />
      </QueryProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  setAdminApi(createFakeAdminApi({ latencyMs: 0 }));
});

describe('Auditoría', () => {
  it('lista los eventos más recientes primero y carga más con el cursor', async () => {
    const user = userEvent.setup();
    renderScreen();
    expect(await screen.findByRole('region', { name: /Tabla de Eventos de auditoría/ })).toBeTruthy();
    // 29 eventos de ejemplo, 20 por página
    expect(await screen.findByText('20 evento(s) cargado(s)')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Cargar más' }));
    expect(await screen.findByText('29 evento(s) cargado(s)')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Cargar más' })).toBeNull();
    expect(screen.getByText('No hay más eventos.')).toBeTruthy();
    // El más reciente (id mayor) va primero
    const rows = screen.getAllByRole('row').slice(1);
    const first = within(rows[0]!).getByRole('button', { name: /Ver cambios del evento/ }).getAttribute('aria-label')!;
    const last = within(rows[rows.length - 1]!).getByRole('button', { name: /Ver cambios del evento/ }).getAttribute('aria-label')!;
    expect(Number(/evento (\d+)/.exec(first)![1])).toBeGreaterThan(Number(/evento (\d+)/.exec(last)![1]));
  });

  it('filtra por tabla y operación, y avisa si no hay resultados', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('20 evento(s) cargado(s)');
    await user.type(screen.getByLabelText('Tabla'), 'usuario');
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
    expect(await screen.findByText('2 evento(s) cargado(s)')).toBeTruthy();

    await user.selectOptions(screen.getByLabelText('Operación'), 'UPDATE');
    expect(await screen.findByText('1 evento(s) cargado(s)')).toBeTruthy();

    await user.clear(screen.getByLabelText('Tabla'));
    await user.type(screen.getByLabelText('Tabla'), 'no_existe');
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
    expect(await screen.findByText('Sin eventos')).toBeTruthy();
  });

  it('valida el filtro de tabla antes de pedir nada, sin borrar lo escrito', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('20 evento(s) cargado(s)');
    await user.type(screen.getByLabelText('Tabla'), 'Pais; DROP');
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
    expect(await screen.findByText(/solo letras minúsculas y guion bajo/)).toBeTruthy();
    expect((screen.getByLabelText('Tabla') as HTMLInputElement).value).toBe('Pais; DROP');
    expect(screen.getByText('20 evento(s) cargado(s)')).toBeTruthy();
  });

  it('la fila se expande con el diff antes/después, muestra [REDACTED] tal cual y se puede contraer', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('20 evento(s) cargado(s)');
    await user.type(screen.getByLabelText('Tabla'), 'usuario');
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
    await screen.findByText('2 evento(s) cargado(s)');

    const insert = screen.getByRole('button', { name: /\(Alta en usuario\)/ });
    expect(insert.getAttribute('aria-expanded')).toBe('false');
    await user.click(insert);
    expect(insert.getAttribute('aria-expanded')).toBe('true');
    const diff = await screen.findByRole('region', { name: /Cambios del evento/ });
    expect(insert.getAttribute('aria-controls')).toBe(diff.id);
    expect(within(diff).getByText('hash_contrasena')).toBeTruthy();
    expect(within(diff).getByText('[REDACTED]')).toBeTruthy();
    expect(within(diff).getAllByText('Nuevo').length).toBeGreaterThan(0);

    // Un cambio muestra antes y después, con el campo marcado como "Cambió"
    await user.click(screen.getByRole('button', { name: /\(Cambio en usuario\)/ }));
    const regions = await screen.findAllByRole('region', { name: /Cambios del evento/ });
    expect(regions).toHaveLength(2);
    const update = regions.find((r) => within(r).queryByText('Cambió'));
    expect(update).toBeTruthy();
    expect(within(update!).getByText('activo')).toBeTruthy();

    await user.click(screen.getAllByRole('button', { name: /Ocultar cambios del evento/, expanded: true })[0]!);
    expect(screen.getAllByRole('region', { name: /Cambios del evento/ })).toHaveLength(1);
  });
});
