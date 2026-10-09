import { z } from 'zod';
import { es } from '@/shared/i18n';
import { optionalText, patternField, textField } from '@/shared/lib/schemas';

const v = es.validation;
const ticketPrefix = optionalText(3).refine((s) => s === '' || /^[0-9]{3}$/.test(s), v.ticketPrefix);

export const AirlineCreateSchema = z.object({ code: patternField(/^[A-Z0-9]{2}$/, v.iata2), name: textField(100), ticketPrefix });
export const AirlineEditSchema = z.object({ name: textField(100), ticketPrefix });
export type AirlineValues = z.infer<typeof AirlineCreateSchema>;
