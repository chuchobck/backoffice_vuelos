import { z } from 'zod';
import { CABIN_CLASSES, type CabinClass, type CreateSeatMap } from '@/shared/api';
import { es } from '@/shared/i18n';
import { intText, textField } from '@/shared/lib/schemas';
import { generateRows, parseLayout, parseRowList, type SeatBlock } from './layout';

const v = es.validation;
const e = es.entities.seatMaps.create.errors;

const blockShape = z.object({
  cabinClass: z.string().min(1, v.required),
  firstRow: intText(1, 99),
  rowCount: intText(1, 99),
  layout: z.string(),
  extraLegroom: z.string(),
  emergencyExit: z.string(),
});
export type SeatBlockValues = z.infer<typeof blockShape>;

export const SeatMapCreateSchema = z
  .object({
    airline: z.string().min(1, v.required),
    aircraftModel: z.string().min(1, v.required),
    name: textField(150),
    blocks: z.array(blockShape).min(1),
  })
  .superRefine((value, ctx) => {
    const issue = (i: number, field: string, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['blocks', i, field], message });
    const used: { from: number; to: number }[] = [];
    const cabins = new Set<string>();

    value.blocks.forEach((b, i) => {
      if (b.cabinClass) {
        if (cabins.has(b.cabinClass)) issue(i, 'cabinClass', e.cabinRepeated);
        cabins.add(b.cabinClass);
      }

      const layout = parseLayout(b.layout);
      if ('error' in layout) {
        const map = { empty: e.layoutEmpty, letters: e.layoutLetters, repeated: e.layoutRepeated, tooMany: e.layoutTooMany } as const;
        issue(i, 'layout', map[layout.error]);
      }

      const first = Number(b.firstRow);
      const count = Number(b.rowCount);
      if (!/^\d+$/.test(b.firstRow) || !/^\d+$/.test(b.rowCount)) return;
      const last = first + count - 1;
      if (first < 1 || last > 99) {
        issue(i, 'rowCount', e.rowsRange);
        return;
      }
      if (used.some((r) => first <= r.to && last >= r.from)) issue(i, 'firstRow', e.rowsOverlap);
      used.push({ from: first, to: last });

      for (const [field, text] of [['extraLegroom', b.extraLegroom], ['emergencyExit', b.emergencyExit]] as const) {
        const list = parseRowList(text);
        if (list === null) issue(i, field, e.listInvalid);
        else if (list.some((n) => n < first || n > last)) issue(i, field, e.listOutside);
      }
    });
  });

export type SeatMapCreateValues = z.infer<typeof SeatMapCreateSchema>;

export const DEFAULT_BLOCK: SeatBlockValues = { cabinClass: 'ECONOMY', firstRow: '1', rowCount: '10', layout: 'ABC DEF', extraLegroom: '', emergencyExit: '' };

/** Bloques ya validados → bloques de generación. */
export function toBlocks(values: SeatBlockValues[]): SeatBlock[] {
  return values.map((b) => ({
    cabinClass: b.cabinClass as CabinClass,
    firstRow: Number(b.firstRow),
    rowCount: Number(b.rowCount),
    layout: b.layout,
    extraLegroomRows: parseRowList(b.extraLegroom) ?? [],
    emergencyRows: parseRowList(b.emergencyExit) ?? [],
  }));
}

export function toSeatMapBody(v: SeatMapCreateValues): CreateSeatMap {
  return { airline: v.airline, aircraftModel: v.aircraftModel, name: v.name, rows: generateRows(toBlocks(v.blocks)) };
}

export const CABIN_OPTIONS = CABIN_CLASSES;
