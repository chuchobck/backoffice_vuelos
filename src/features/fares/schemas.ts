import { z } from 'zod';
import { es } from '@/shared/i18n';
import { moneyField, optionalMoney } from '@/shared/lib/schemas';
import { PRICE_KINDS } from '@/shared/lib/farePrices';

const v = es.validation;
const f = es.entities.fares.form;

const prices = {
  adultBase: moneyField,
  adultTaxes: moneyField,
  youthBase: optionalMoney,
  youthTaxes: optionalMoney,
  childBase: optionalMoney,
  childTaxes: optionalMoney,
  infantBase: optionalMoney,
  infantTaxes: optionalMoney,
};

const common = { extraBagPrice: moneyField, changeFee: optionalMoney, ...prices };

/** Un tipo de pasajero opcional lleva tarifa base e impuestos juntos, o ninguno. */
function checkPairs(value: Record<string, string>, ctx: z.RefinementCtx) {
  for (const { key, required } of PRICE_KINDS) {
    if (required) continue;
    const base = value[`${key}Base`] ?? '';
    const taxes = value[`${key}Taxes`] ?? '';
    if (base && !taxes) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [`${key}Taxes`], message: f.pairMissingTaxes });
    if (taxes && !base) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [`${key}Base`], message: f.pairMissingBase });
  }
}

export const FareCreateSchema = z
  .object({
    departureId: z.string().min(1, v.required),
    fareFamilyId: z.string().min(1, v.required),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, v.currency),
    ...common,
  })
  .superRefine(checkPairs);

export const FareEditSchema = z.object(common).superRefine(checkPairs);
export type FareValues = z.infer<typeof FareCreateSchema>;
export type FareEditValues = z.infer<typeof FareEditSchema>;
