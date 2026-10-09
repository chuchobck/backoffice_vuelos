import { z } from 'zod';
import { es } from '@/shared/i18n';

const v = es.validation;

export const FlightNumberCreateSchema = z
  .object({
    marketingCarrier: z.string().min(1, v.required),
    number: z.string().trim().min(1, v.required).regex(/^[1-9][0-9]{0,3}$/, v.flightNumberDigits),
    operatingCarrier: z.string(),
    origin: z.string().min(1, v.required),
    destination: z.string().min(1, v.required),
  })
  .superRefine((value, ctx) => {
    if (value.origin && value.destination && value.origin === value.destination) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['destination'], message: v.destinationDifferent });
    }
  });
export const FlightNumberEditSchema = z.object({ operatingCarrier: z.string() });
export type FlightNumberValues = z.infer<typeof FlightNumberCreateSchema>;
