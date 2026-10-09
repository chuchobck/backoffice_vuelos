import { z } from 'zod';
import { es, fmt } from '@/shared/i18n';
import { PRICE_KINDS } from '@/shared/lib/farePrices';
import { isValidMoney } from '@/shared/lib/money';
import type { CabinClass } from '@/shared/api';

const v = es.validation;
const c = es.wizard.cabins;
const f = es.entities.fares.form;

const text = z.string();

/** Valores del paso 4: cabinas (cupo) y, por familia, los precios. */
export const cabinsShape = z.object({
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, v.currency),
  cabins: z.record(z.object({ on: z.boolean(), seats: text })),
  families: z.record(
    z.object({
      on: z.boolean(),
      extraBag: text,
      changeFee: text,
      adultBase: text, adultTaxes: text,
      youthBase: text, youthTaxes: text,
      childBase: text, childTaxes: text,
      infantBase: text, infantTaxes: text,
    }),
  ),
});
export type CabinsValues = z.infer<typeof cabinsShape>;

/** Id (data-id) del bloque donde se muestran los errores generales (sin campo propio) del paso. */
export const CABINS_FORM_ERROR_ID = 'wz-cabins-form';

export interface FamilyInfo {
  id: string;
  cabinClass: CabinClass;
}

/**
 * Validación del paso 4: al menos una cabina con cupo válido (1 a los asientos del mapa) y al menos una
 * familia con precios válidos. Solo se exigen los campos de las cabinas y familias activadas.
 */
export function cabinsSchema(seatMap: { cabins: { cabinClass: CabinClass; seats: number }[] }, families: FamilyInfo[]) {
  return cabinsShape.superRefine((value, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
    const money = (path: string[], raw: string | undefined, required: boolean) => {
      const x = (raw ?? '').trim();
      if (x === '') {
        if (required) issue(path, v.required);
      } else if (!isValidMoney(x)) issue(path, v.money);
    };

    const onCabins = seatMap.cabins.filter((cab) => value.cabins[cab.cabinClass]?.on);
    if (onCabins.length === 0) issue(['form'], c.noCabin);
    for (const cab of onCabins) {
      const raw = (value.cabins[cab.cabinClass]?.seats ?? '').trim();
      const path = ['cabins', cab.cabinClass, 'seats'];
      if (raw === '') issue(path, v.required);
      else if (!/^\d+$/.test(raw)) issue(path, v.integer);
      else if (Number(raw) < 1) issue(path, fmt(v.min, { min: 1 }));
      else if (Number(raw) > cab.seats) issue(path, fmt(v.max, { max: cab.seats }));
    }

    const active = families.filter((fam) => value.families[fam.id]?.on && onCabins.some((cab) => cab.cabinClass === fam.cabinClass));
    if (onCabins.length > 0 && active.length === 0) issue(['form'], c.noFamily);
    for (const fam of active) {
      const fm = value.families[fam.id]!;
      const base = ['families', fam.id];
      money([...base, 'adultBase'], fm.adultBase, true);
      money([...base, 'adultTaxes'], fm.adultTaxes, true);
      money([...base, 'extraBag'], fm.extraBag, true);
      money([...base, 'changeFee'], fm.changeFee, false);
      for (const { key, required } of PRICE_KINDS) {
        if (required) continue;
        const b = (fm[`${key}Base` as 'youthBase'] ?? '').trim();
        const t = (fm[`${key}Taxes` as 'youthTaxes'] ?? '').trim();
        money([...base, `${key}Base`], b, false);
        money([...base, `${key}Taxes`], t, false);
        if (b && !t) issue([...base, `${key}Taxes`], f.pairMissingTaxes);
        if (t && !b) issue([...base, `${key}Base`], f.pairMissingBase);
      }
    }
  });
}
