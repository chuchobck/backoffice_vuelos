import { describe, expect, it } from 'vitest';
import { generateRows, parseLayout, parseRowList, positionsOf, summarize, type SeatBlock } from './layout';

describe('distribución de asientos', () => {
  it('separa por pasillos y acepta mayúsculas o minúsculas', () => {
    expect(parseLayout('abc def')).toEqual({ groups: [['A', 'B', 'C'], ['D', 'E', 'F']] });
    expect(parseLayout('  AC   DF ')).toEqual({ groups: [['A', 'C'], ['D', 'F']] });
  });

  it('rechaza letras no permitidas (la I no existe), repetidas, vacías o más de 10', () => {
    expect(parseLayout('')).toEqual({ error: 'empty' });
    expect(parseLayout('ABI')).toEqual({ error: 'letters' });
    expect(parseLayout('A1B')).toEqual({ error: 'letters' });
    expect(parseLayout('ABC ABD')).toEqual({ error: 'repeated' });
    expect(parseLayout('ABCDEFGHJK L')).toEqual({ error: 'letters' });
    expect(parseLayout('ABCDEFGHJK')).toEqual({ groups: [[...'ABCDEFGHJK']] });
  });

  it('calcula ventana, pasillo y centro como la semilla del backend (ABC DEF: A/F ventana, C/D pasillo)', () => {
    const m = positionsOf([['A', 'B', 'C'], ['D', 'E', 'F']]);
    expect([...m.entries()]).toEqual([['A', 'WINDOW'], ['B', 'MIDDLE'], ['C', 'AISLE'], ['D', 'AISLE'], ['E', 'MIDDLE'], ['F', 'WINDOW']]);
    const atr = positionsOf([['A', 'C'], ['D', 'F']]);
    expect([...atr.values()]).toEqual(['WINDOW', 'AISLE', 'AISLE', 'WINDOW']);
  });

  it('listas de filas: números y rangos', () => {
    expect(parseRowList('')).toEqual([]);
    expect(parseRowList('10, 12-13')).toEqual([10, 12, 13]);
    expect(parseRowList('3,3,1')).toEqual([1, 3]);
    expect(parseRowList('abc')).toBeNull();
    expect(parseRowList('5-3')).toBeNull();
    expect(parseRowList('100')).toBeNull();
  });

  const blocks: SeatBlock[] = [
    { cabinClass: 'ECONOMY', firstRow: 10, rowCount: 3, layout: 'ABC DEF', extraLegroomRows: [10], emergencyRows: [12] },
    { cabinClass: 'BUSINESS', firstRow: 1, rowCount: 2, layout: 'AC DF', extraLegroomRows: [], emergencyRows: [] },
  ];

  it('genera las filas ordenadas, con banderas de espacio extra y salida de emergencia', () => {
    const rows = generateRows(blocks);
    expect(rows.map((r) => r.number)).toEqual([1, 2, 10, 11, 12]);
    expect(rows[2]).toMatchObject({ number: 10, cabinClass: 'ECONOMY', extraLegroom: true, emergencyExit: false });
    expect(rows[4]).toMatchObject({ number: 12, extraLegroom: false, emergencyExit: true });
    expect(rows[0]!.seats.map((s) => s.letter)).toEqual(['A', 'C', 'D', 'F']);
  });

  it('resume filas y asientos por cabina', () => {
    expect(summarize(generateRows(blocks))).toEqual({
      total: { rows: 5, seats: 4 * 2 + 6 * 3 },
      cabins: [
        { cabinClass: 'BUSINESS', rows: 2, seats: 8 },
        { cabinClass: 'ECONOMY', rows: 3, seats: 18 },
      ],
    });
  });
});
