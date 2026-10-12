// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { setAdminApi } from '@/shared/api';
import { Toaster } from '@/shared/ui';
import { createFakeAdminApi } from '@/test-support/fake-api/FakeAdminApi';
import { FAKE_ADMIN_ID } from '@/test-support/fake-api/fake-admin';
import { AdminsScreen } from '@/features/admins';

function renderScreen(currentUserId: string = FAKE_ADMIN_ID) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <QueryProvider>
        <AdminsScreen currentUserId={currentUserId} />
        <Toaster />
      </QueryProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  setAdminApi(createFakeAdminApi({ latencyMs: 0 }));
});

describe('Administradores: lista, alta y baja', () => {
  it('lista los administradores y marca la propia cuenta', async () => {
    renderScreen();
    expect(await screen.findByText('operaciones@quinde.test')).toBeTruthy();
    expect(screen.getByRole('region', { name: /Tabla de Administradores/ })).toBeTruthy();
    const own = screen.getByRole('row', { name: /admin@quinde\.test/ });
    expect(within(own).getByText('Tu cuenta')).toBeTruthy();
  });

  it('la baja de la propia cuenta está bloqueada (sigue enfocable y explica por qué) y no abre el diálogo', async () => {
    const user = userEvent.setup();
    renderScreen();
    const button = await screen.findByRole('button', { name: 'Dar de baja administrador admin@quinde.test' });
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('aria-describedby')).toBeTruthy();
    expect(document.getElementById(button.getAttribute('aria-describedby')!)?.textContent).toMatch(/propia cuenta/);
    await user.click(button);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    // La baja de otra cuenta sí está disponible
    const other = screen.getByRole('button', { name: 'Dar de baja administrador operaciones@quinde.test' });
    expect(other.getAttribute('aria-disabled')).toBeNull();
  });

  it('crea un administrador: valida al enviar sin borrar, muestra el 409 de correo repetido y luego lo agrega', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText('operaciones@quinde.test');
    await user.click(screen.getByRole('button', { name: 'Nuevo administrador' }));
    const dialog = await screen.findByRole('dialog');

    // Vacío y contraseña corta
    await user.click(within(dialog).getByRole('button', { name: 'Crear' }));
    expect((await within(dialog).findAllByText('Este campo es obligatorio.')).length).toBeGreaterThan(0);
    await user.type(within(dialog).getByLabelText(/Correo electrónico/), 'nuevo@quinde.test');
    await user.type(within(dialog).getByLabelText(/^Contraseña/), 'corta');
    await user.click(within(dialog).getByRole('button', { name: 'Crear' }));
    expect(await within(dialog).findAllByText(/entre 12 y 128/)).not.toHaveLength(0);
    expect((within(dialog).getByLabelText(/Correo electrónico/) as HTMLInputElement).value).toBe('nuevo@quinde.test');

    // Correo que ya existe: 409 con mensaje en español, sin cerrar ni perder lo escrito
    const email = within(dialog).getByLabelText(/Correo electrónico/);
    await user.clear(email);
    await user.type(email, 'operaciones@quinde.test');
    const password = within(dialog).getByLabelText(/^Contraseña/);
    await user.clear(password);
    await user.type(password, 'una frase larga de prueba');
    await user.click(within(dialog).getByRole('button', { name: 'Crear' }));
    expect(await within(dialog).findByText('Ya existe una cuenta con ese correo.')).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();

    // Correo nuevo
    await user.clear(email);
    await user.type(email, 'nuevo@quinde.test');
    await user.click(within(dialog).getByRole('button', { name: 'Crear' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText('nuevo@quinde.test')).toBeTruthy();
  });

  it('la contraseña se puede mostrar u ocultar con un botón', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(await screen.findByRole('button', { name: 'Nuevo administrador' }));
    const dialog = await screen.findByRole('dialog');
    const password = within(dialog).getByLabelText(/^Contraseña/) as HTMLInputElement;
    expect(password.type).toBe('password');
    await user.click(within(dialog).getByRole('button', { name: /Mostrar contraseña/ }));
    expect(password.type).toBe('text');
  });

  it('da de baja a otro administrador con confirmación; no ofrece reactivar ni editar', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(await screen.findByRole('button', { name: 'Dar de baja administrador operaciones@quinde.test' }));
    const confirm = await screen.findByRole('alertdialog');
    expect(document.activeElement?.textContent).toBe('No, mantener');
    expect(within(confirm).getByText(/operaciones@quinde\.test/)).toBeTruthy();
    await user.click(within(confirm).getByRole('button', { name: 'Dar de baja' }));
    await waitFor(() => expect(screen.queryByText('operaciones@quinde.test')).toBeNull());

    await user.click(screen.getByLabelText('Mostrar dados de baja'));
    const row = await screen.findByRole('row', { name: /operaciones@quinde\.test/ });
    expect(within(row).getByText('Inactivo')).toBeTruthy();
    expect(within(row).queryByRole('button', { name: /Reactivar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Editar/ })).toBeNull();
  });

  it('si el servidor rechaza la baja (409) muestra el motivo en español y no cierra el diálogo', async () => {
    const user = userEvent.setup();
    // Si la interfaz no reconoce la cuenta como propia no bloquea nada: la regla la hace valer el servidor
    renderScreen('otra-cuenta');
    await user.click(await screen.findByRole('button', { name: 'Dar de baja administrador admin@quinde.test' }));
    const confirm = await screen.findByRole('alertdialog');
    await user.click(within(confirm).getByRole('button', { name: 'Dar de baja' }));
    expect(await within(confirm).findByText(/No puedes dar de baja tu propia cuenta/)).toBeTruthy();
    expect(screen.getByRole('alertdialog')).toBeTruthy();
  });
});
