import type { CabinClass, SeatPosition, SeatRow } from '@/shared/api';

/** Letras válidas de asiento en la API: A a H, J y K. */
export const SEAT_LETTERS = /^[A-HJK]$/;

export interface SeatBlock {
  cabinClass: CabinClass;
  firstRow: number;
  rowCount: number;
  /** "ABC DEF": letras de izquierda a derecha, un espacio donde va el pasillo. */
  layout: string;
  extraLegroomRows: number[];
  emergencyRows: number[];
}

export type LayoutError = 'empty' | 'letters' | 'repeated' | 'tooMany';

/** Grupos de asientos separados por pasillos: "ABC DEF" → [["A","B","C"],["D","E","F"]]. */
export function parseLayout(layout: string): { groups: string[][] } | { error: LayoutError } {
  const groups = layout
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .filter((g) => g !== '')
    .map((g) => [...g]);
  if (groups.length === 0) return { error: 'empty' };
  const letters = groups.flat();
  if (!letters.every((l) => SEAT_LETTERS.test(l))) return { error: 'letters' };
  if (new Set(letters).size !== letters.length) return { error: 'repeated' };
  if (letters.length > 10) return { error: 'tooMany' };
  return { groups };
}

/** Posición de cada letra: ventana en los extremos, pasillo junto a un pasillo, centro en el resto. */
export function positionsOf(groups: string[][]): Map<string, SeatPosition> {
  const map = new Map<string, SeatPosition>();
  groups.forEach((group, gi) => {
    group.forEach((letter, li) => {
      const outer = (gi === 0 && li === 0) || (gi === groups.length - 1 && li === group.length - 1);
      const besideAisle = (li === group.length - 1 && gi < groups.length - 1) || (li === 0 && gi > 0);
      map.set(letter, outer ? 'WINDOW' : besideAisle ? 'AISLE' : 'MIDDLE');
    });
  });
  return map;
}

/** "10, 12-13" → [10, 12, 13]. `null` si el texto no es una lista válida de números o rangos. */
export function parseRowList(text: string): number[] | null {
  const trimmed = text.trim();
  if (trimmed === '') return [];
  const out = new Set<number>();
  for (const part of trimmed.split(/\s*,\s*/)) {
    const m = /^(\d{1,2})(?:\s*-\s*(\d{1,2}))?$/.exec(part);
    if (!m) return null;
    const from = Number(m[1]);
    const to = m[2] === undefined ? from : Number(m[2]);
    if (to < from) return null;
    for (let n = from; n <= to; n++) out.add(n);
  }
  return [...out].sort((a, b) => a - b);
}

/** Filas de la API para los bloques indicados (ya validados). */
export function generateRows(blocks: SeatBlock[]): SeatRow[] {
  const rows: SeatRow[] = [];
  for (const block of blocks) {
    const parsed = parseLayout(block.layout);
    if ('error' in parsed) continue;
    const positions = positionsOf(parsed.groups);
    const letters = parsed.groups.flat();
    for (let n = block.firstRow; n < block.firstRow + block.rowCount; n++) {
      rows.push({
        number: n,
        cabinClass: block.cabinClass,
        extraLegroom: block.extraLegroomRows.includes(n),
        emergencyExit: block.emergencyRows.includes(n),
        seats: letters.map((letter) => ({ letter, position: positions.get(letter)! })),
      });
    }
  }
  return rows.sort((a, b) => a.number - b.number);
}

/** Filas y asientos por cabina, para la vista previa. */
export function summarize(rows: SeatRow[]): { total: { rows: number; seats: number }; cabins: { cabinClass: CabinClass; rows: number; seats: number }[] } {
  const byCabin = new Map<CabinClass, { rows: number; seats: number }>();
  for (const r of rows) {
    const c = byCabin.get(r.cabinClass) ?? { rows: 0, seats: 0 };
    c.rows += 1;
    c.seats += r.seats.length;
    byCabin.set(r.cabinClass, c);
  }
  const cabins = [...byCabin.entries()].map(([cabinClass, v]) => ({ cabinClass, ...v }));
  return { total: { rows: rows.length, seats: rows.reduce((n, r) => n + r.seats.length, 0) }, cabins };
}
