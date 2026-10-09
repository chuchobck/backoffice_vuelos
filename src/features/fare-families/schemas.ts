import { z } from 'zod';
import { es } from '@/shared/i18n';
import { intText, patternField, textField } from '@/shared/lib/schemas';

const v = es.validation;
const PERCENT = /^(100(\.0{1,2})?|\d{1,2}(\.\d{1,2})?)$/;

const rules = {
  name: textField(100),
  changeable: z.boolean(),
  cancellationPenaltyPercent: z.string().trim().min(1, v.required).regex(PERCENT, v.percent),
  personalItemIncluded: z.boolean(),
  carryOnBagsIncluded: intText(0, 3),
  checkedBagsIncluded: intText(0, 5),
  maxExtraBags: intText(0, 10),
};

export const FareFamilyCreateSchema = z.object({
  airline: z.string().min(1, v.required),
  cabinClass: z.string().min(1, v.required),
  code: patternField(/^[A-Z0-9_]{2,20}$/, v.familyCode),
  ...rules,
});
export const FareFamilyEditSchema = z.object(rules);
export type FareFamilyValues = z.infer<typeof FareFamilyCreateSchema>;
