import { z } from 'zod';
import { es } from '@/shared/i18n';
import { datetimeLocalToUtc } from '@/shared/lib/dates';
import { optionalText } from '@/shared/lib/schemas';

const v = es.validation;
const datetime = z.string().min(1, v.required).refine((s) => !Number.isNaN(new Date(s).getTime()), v.date);

/**
 * Edición de una salida. Las horas se escriben en la hora local de cada aeropuerto (salida: origen;
 * llegada: destino): para compararlas se pasan a UTC con la zona de cada uno.
 */
export function departureEditSchema(originZone: string, destinationZone: string) {
  return z
    .object({
      scheduledDeparture: datetime,
      scheduledArrival: datetime,
      departureTerminal: optionalText(10),
      arrivalTerminal: optionalText(10),
      status: z.string().min(1, v.required),
    })
    .superRefine((value, ctx) => {
      if (!value.scheduledDeparture || !value.scheduledArrival) return;
      const dep = new Date(datetimeLocalToUtc(value.scheduledDeparture, originZone)).getTime();
      const arr = new Date(datetimeLocalToUtc(value.scheduledArrival, destinationZone)).getTime();
      if (!(arr > dep)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scheduledArrival'], message: v.arrivalAfter });
    });
}

export type DepartureValues = z.infer<ReturnType<typeof departureEditSchema>>;
