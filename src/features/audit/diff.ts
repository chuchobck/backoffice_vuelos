import type { AuditEvent } from '@/shared/api';

export type DiffStatus = 'changed' | 'added' | 'removed' | 'same';

export interface DiffRow {
  field: string;
  before: unknown;
  after: unknown;
  hasBefore: boolean;
  hasAfter: boolean;
  status: DiffStatus;
}

/** Texto legible de un valor del JSON de auditoría. `[REDACTED]` llega censurado de la API y se muestra tal cual. */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Compara `before` y `after` campo por campo. En UPDATE la API manda solo las columnas que cambiaron, así que
 * casi todo sale "changed"; en INSERT todo es "added" y en DELETE todo es "removed".
 */
export function diffEvent(event: Pick<AuditEvent, 'before' | 'after'>): DiffRow[] {
  const before = event.before ?? {};
  const after = event.after ?? {};
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return fields.map((field) => {
    const hasBefore = field in before;
    const hasAfter = field in after;
    const status: DiffStatus = hasBefore && hasAfter ? (same(before[field], after[field]) ? 'same' : 'changed') : hasAfter ? 'added' : 'removed';
    return { field, before: before[field], after: after[field], hasBefore, hasAfter, status };
  });
}
