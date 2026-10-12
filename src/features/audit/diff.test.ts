import { describe, expect, it } from 'vitest';
import { diffEvent, formatValue } from './diff';

describe('diff de auditoría', () => {
  it('INSERT: todo es nuevo', () => {
    const rows = diffEvent({ before: null, after: { id: 1, nombre: 'Ecuador' } });
    expect(rows.map((r) => [r.field, r.status])).toEqual([['id', 'added'], ['nombre', 'added']]);
    expect(rows.every((r) => !r.hasBefore && r.hasAfter)).toBe(true);
  });

  it('DELETE: todo es eliminado', () => {
    const rows = diffEvent({ before: { id: 1, activo: true }, after: null });
    expect(rows.map((r) => r.status)).toEqual(['removed', 'removed']);
  });

  it('UPDATE: marca lo que cambió y lo que quedó igual', () => {
    const rows = diffEvent({ before: { nombre: 'A', activo: true }, after: { nombre: 'B', activo: true } });
    expect(rows.find((r) => r.field === 'nombre')).toMatchObject({ before: 'A', after: 'B', status: 'changed' });
    expect(rows.find((r) => r.field === 'activo')?.status).toBe('same');
  });

  it('une las claves de los dos lados y no pierde las que solo están en uno', () => {
    const rows = diffEvent({ before: { a: 1 }, after: { b: 2 } });
    expect(rows.map((r) => [r.field, r.status])).toEqual([['a', 'removed'], ['b', 'added']]);
  });

  it('muestra [REDACTED] tal cual y formatea null, números y objetos', () => {
    expect(formatValue('[REDACTED]')).toBe('[REDACTED]');
    expect(formatValue(null)).toBe('null');
    expect(formatValue(12.5)).toBe('12.5');
    expect(formatValue({ a: 1 })).toBe('{"a":1}');
  });
});
