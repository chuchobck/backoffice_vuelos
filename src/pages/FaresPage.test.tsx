// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it } from 'vitest';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { setAdminApi } from '@/shared/api';
import { createFakeAdminApi } from '@/test-support/fake-api/FakeAdminApi';
import { FaresPage } from './FaresPage';

beforeAll(() => {
  setAdminApi(createFakeAdminApi({ latencyMs: 0 }));
});

async function openFirstFare() {
  const user = userEvent.setup();
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <QueryProvider>
        <FaresPage />
      </QueryProvider>
    </MemoryRouter>,
  );
  await user.click((await screen.findAllByRole('button', { name: /^Editar tarifa/ }))[0]!);
  const dialog = await screen.findByRole('dialog');
  return { user, dialog };
}

const set = async (user: ReturnType<typeof userEvent.setup>, input: HTMLElement, value: string) => {
  await user.clear(input);
  await user.type(input, value);
};

describe('Tarifas: avisos de cordura al editar (no bloquean)', () => {
  it('avisa si el total del adulto parece un error de digitación (4128.00) y deja de avisar al corregirlo', async () => {
    const { user, dialog } = await openFirstFare();
    await set(user, within(dialog).getByLabelText('Adulto: Tarifa base'), '4128.00');
    expect(await within(dialog).findByText(/parece demasiado alto para un vuelo nacional dentro del continente/)).toBeTruthy();
    // El aviso no bloquea: el botón sigue habilitado.
    expect((within(dialog).getByRole('button', { name: 'Guardar cambios' }) as HTMLButtonElement).disabled).toBe(false);
    await set(user, within(dialog).getByLabelText('Adulto: Tarifa base'), '58.00');
    await waitFor(() => expect(within(dialog).queryByText(/parece demasiado alto/)).toBeNull());
  });

  it('avisa si dos familias de la misma cabina de la misma salida cuestan lo mismo', async () => {
    const { user, dialog } = await openFirstFare();
    // La primera fila es AV1500 · BASIC; CLASSIC cuesta 69.60 + 13.92 = 83.52.
    await set(user, within(dialog).getByLabelText('Adulto: Tarifa base'), '69.60');
    await set(user, within(dialog).getByLabelText('Adulto: Impuestos'), '13.92');
    expect(await within(dialog).findByText(/Dos familias de la cabina económica cuestan lo mismo \(83\.52 USD\)/)).toBeTruthy();
  });

  it('guarda igual con un aviso y valida montos mal escritos', async () => {
    const { user, dialog } = await openFirstFare();
    await set(user, within(dialog).getByLabelText('Adulto: Tarifa base'), 'abc');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
    expect((await within(dialog).findAllByText('Escribe un monto como 94.38 (hasta 2 decimales).')).length).toBeGreaterThan(0);
    await set(user, within(dialog).getByLabelText('Adulto: Tarifa base'), '4128.00');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
