import { z } from 'zod';
import { es } from '@/shared/i18n';
import { optionalText, textField } from '@/shared/lib/schemas';

const v = es.validation;
const timeZone = optionalText(60).refine((s) => s === '' || /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)+$/.test(s), v.timeZone);

export const CityCreateSchema = z.object({ country: z.string().min(1, v.required), name: textField(100), timeZone });
export const CityEditSchema = z.object({ name: textField(100), timeZone });
export type CityValues = z.infer<typeof CityCreateSchema>;
