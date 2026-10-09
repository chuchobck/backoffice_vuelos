import { z } from 'zod';
import { es } from '@/shared/i18n';
import { patternField, textField } from '@/shared/lib/schemas';

export const AircraftModelCreateSchema = z.object({ code: patternField(/^[A-Z0-9]{3}$/, es.validation.model3), name: textField(100) });
export const AircraftModelEditSchema = z.object({ name: textField(100) });
export type AircraftModelValues = z.infer<typeof AircraftModelCreateSchema>;
