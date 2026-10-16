import { describe, expect, it } from 'vitest';
import { ownerLabel } from './labels';

describe('dueño de una reserva', () => {
  it('muestra el correo si el core lo conoce', () => {
    expect(ownerLabel({ id: '1a5c6622-2161-4312-a2f3-ff9030bfab94', email: 'ana@example.com' })).toBe('ana@example.com');
  });
  it('sin correo (cuenta que solo existe en identity) muestra el comienzo del id', () => {
    expect(ownerLabel({ id: '1a5c6622-2161-4312-a2f3-ff9030bfab94', email: null })).toBe('Correo no disponible (1a5c6622…)');
  });
});
