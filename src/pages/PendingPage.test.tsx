// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { es } from '@/shared/i18n';
import { PendingPage } from './PendingPage';

function renderKind(kind: 'bookings' | 'audit' | 'admins') {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <PendingPage kind={kind} />
    </MemoryRouter>,
  );
}

describe('Pantallas pendientes en la API (no se simulan)', () => {
  it.each([
    ['bookings', 'Reservas', '/flights/v1/admin/bookings'],
    ['audit', 'Auditoría', '/flights/v1/admin/audit-log'],
    ['admins', 'Administradores', '/flights/v1/admin/users'],
  ] as const)('%s: marcada pendiente, con la explicación y la especificación del endpoint que falta', (kind, title, path) => {
    renderKind(kind);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeTruthy();
    expect(screen.getByText(es.pending.badge)).toBeTruthy();
    expect(screen.getByText(es.pending.notSimulated)).toBeTruthy();
    const table = screen.getByRole('table');
    expect(within(table).getAllByText(path).length).toBeGreaterThan(0);
    // No hay datos inventados: ni filas de ejemplo ni formularios.
    expect(screen.queryByRole('form')).toBeNull();
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
  });
});
