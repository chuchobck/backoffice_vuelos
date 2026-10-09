// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it } from 'vitest';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { setAdminApi } from '@/shared/api';
import { createFakeAdminApi } from '@/test-support/fake-api/FakeAdminApi';
import { DashboardPage } from './DashboardPage';

beforeAll(() => {
  setAdminApi(createFakeAdminApi({ latencyMs: 0 }));
});

describe('Panel inicial', () => {
  it('muestra el conteo real de cada recurso (recorre todas las páginas, no solo la primera)', async () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <QueryProvider>
          <DashboardPage />
        </QueryProvider>
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    // Los datos de ejemplo tienen 30 salidas y 39 tarifas: más que una página de 10, y no hay "50+" porque no pasan el tope.
    await waitFor(() => expect(screen.getByRole('link', { name: 'Vuelos (salidas) 30 activos' })).toBeTruthy());
    expect(screen.getByRole('link', { name: 'Tarifas 39 activos' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Aeropuertos 10 activos' })).toBeTruthy();
    // Ninguna tarjeta muestra "N+": ninguna pasa el tope.
    for (const link of screen.getAllByRole('link', { name: /activos$/ })) expect(link.textContent).not.toMatch(/\+/);
  });
});
