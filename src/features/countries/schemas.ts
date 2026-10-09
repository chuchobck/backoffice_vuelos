import { z } from 'zod';
import { es } from '@/shared/i18n';
import { patternField, textField } from '@/shared/lib/schemas';

const v = es.validation;

export const CountryCreateSchema = z.object({
  code: patternField(/^[A-Z]{2}$/, v.code2),
  iso3: patternField(/^[A-Z]{3}$/, v.iata3),
  name: textField(100),
});
export const CountryEditSchema = z.object({ name: textField(100) });
export type CountryValues = z.infer<typeof CountryCreateSchema>;
