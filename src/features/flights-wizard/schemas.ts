import { z } from 'zod';
import { es } from '@/shared/i18n';
import { localToUtcIso, todayIn } from '@/shared/lib/dates';
import { optionalText } from '@/shared/lib/schemas';
import { MAX_DEPARTURES } from './types';
import { wizardDates } from './plan';

const v = es.validation;
const s = es.wizard.schedule;

export const RouteSchema = z
  .object({ origin: z.string().min(1, v.required), destination: z.string().min(1, v.required) })
  .superRefine((value, ctx) => {
    if (value.origin && value.destination && value.origin === value.destination) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['destination'], message: v.destinationDifferent });
    }
  });
export type RouteValues = z.infer<typeof RouteSchema>;

export const AirlineStepSchema = z
  .object({
    airline: z.string().min(1, v.required),
    model: z.string().min(1, v.required),
    seatMapId: z.string().min(1, v.required),
    flightMode: z.enum(['new', 'existing']),
    number: z.string().trim(),
    existingFlight: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.flightMode === 'new') {
      if (value.number === '') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['number'], message: v.required });
      else if (!/^[1-9][0-9]{0,3}$/.test(value.number)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['number'], message: v.flightNumberDigits });
    } else if (value.existingFlight === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['existingFlight'], message: v.required });
    }
  });
export type AirlineStepValues = z.infer<typeof AirlineStepSchema>;

/**
 * Horario: las horas se escriben en la hora local del aeropuerto (salida: origen; llegada: destino).
 * Se valida con los mismos cálculos que se mandan a la API (en UTC).
 */
export function scheduleSchema(originZone: string, destinationZone: string, now: Date = new Date()) {
  return z
    .object({
      startDate: z.string().min(1, v.required),
      endDate: z.string(),
      days: z.array(z.boolean()).length(7),
      depTime: z.string().min(1, v.required),
      arrTime: z.string().min(1, v.required),
      arrPlus: z.enum(['0', '1', '2']),
      depTerminal: optionalText(10),
      arrTerminal: optionalText(10),
    })
    .superRefine((value, ctx) => {
      const issue = (path: string, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
      if (value.startDate && value.startDate < todayIn(originZone, now)) issue('startDate', v.datePast);
      if (value.endDate && value.startDate && value.endDate < value.startDate) issue('endDate', s.endBeforeStart);
      if (!value.startDate || !value.depTime || !value.arrTime) return;

      const dep = new Date(localToUtcIso({ date: value.startDate, time: value.depTime }, originZone)).getTime();
      const arr = new Date(localToUtcIso({ date: value.startDate, time: value.arrTime }, destinationZone, Number(value.arrPlus))).getTime();
      if (!(arr > dep)) issue('arrTime', s.arrivalAfter);

      const dates = wizardDates(value);
      if (dates.length === 0) issue('endDate', s.noDays);
      else if (dates.length > MAX_DEPARTURES) issue('endDate', s.tooMany.replace('{max}', String(MAX_DEPARTURES)));
      else if (dep <= now.getTime() && dates[0] === value.startDate) issue('depTime', s.firstPast);
      else {
        const first = new Date(localToUtcIso({ date: dates[0]!, time: value.depTime }, originZone)).getTime();
        if (first <= now.getTime()) issue('depTime', s.firstPast);
      }
    });
}
export type ScheduleValues = z.infer<ReturnType<typeof scheduleSchema>>;
