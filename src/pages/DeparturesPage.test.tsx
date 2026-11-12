// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { adminApi, setAdminApi } from '@/shared/api';
import { Toaster } from '@/shared/ui';
import { createFakeAdminApi } from '@/test-support/fake-api/FakeAdminApi';
import { DeparturesPage } from './DeparturesPage';

function renderScreen() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <QueryProvider>
        <DeparturesPage />
        <Toaster />
      </QueryProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  setAdminApi(createFakeAdminApi({ latencyMs: 0 }));
});

describe('Salidas: puerta', () => {
  it('la lista tiene la columna Puerta y muestra "—" cuando la salida no tiene puerta', async () => {
    renderScreen();
    const table = await screen.findByRole('table');
    expect(within(table).getByRole('columnheader', { name: /^Puerta/ })).toBeTruthy();
    const first = (await adminApi.departures.list({ limit: 1 })).items[0]!;
    const edit = await screen.findByRole('button', { name: `Editar salida ${first.id}` });
    const row = edit.closest('tr')!;
    expect(within(row).getAllByRole('cell').some((c) => c.textContent === '—')).toBe(true);
  });

  it('el formulario pide la puerta (opcional, 10 caracteres), la guarda y la lista la muestra', async () => {
    const user = userEvent.setup();
    renderScreen();
    const first = (await adminApi.departures.list({ limit: 1 })).items[0]!;
    await user.click(await screen.findByRole('button', { name: `Editar salida ${first.id}` }));
    const dialog = await screen.findByRole('dialog');
    const gate = within(dialog).getByLabelText(/^Puerta/) as HTMLInputElement;
    expect(gate.maxLength).toBe(10);
    expect(gate.value).toBe('');

    await user.type(gate, 'A3');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect((await adminApi.departures.get(first.id)).departureGate).toBe('A3');
    expect(await screen.findByRole('cell', { name: 'A3' })).toBeTruthy();
  });

  it('vaciar la puerta la quita (null) y los espacios sobrantes se recortan', async () => {
    const user = userEvent.setup();
    const first = (await adminApi.departures.list({ limit: 1 })).items[0]!;
    await adminApi.departures.update(first.id, { departureGate: 'B12' });
    renderScreen();
    await user.click(await screen.findByRole('button', { name: `Editar salida ${first.id}` }));
    const dialog = await screen.findByRole('dialog');
    const gate = within(dialog).getByLabelText(/^Puerta/) as HTMLInputElement;
    expect(gate.value).toBe('B12');
    await user.clear(gate);
    await user.type(gate, '  ');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect((await adminApi.departures.get(first.id)).departureGate).toBeNull();
  });
});
