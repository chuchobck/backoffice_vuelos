import { z } from 'zod';
import { es } from '@/shared/i18n';
import { patternField, textField } from '@/shared/lib/schemas';

const v = es.validation;
const cityId = z.string().min(1, v.required);

export const AirportCreateSchema = z.object({
  code: patternField(/^[A-Z]{3}$/, v.iata3),
  name: textField(150),
  cityId,
});
export const AirportEditSchema = z.object({ name: textField(150), cityId });
export type AirportValues = z.infer<typeof AirportCreateSchema>;
