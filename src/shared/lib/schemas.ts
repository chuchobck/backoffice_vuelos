import { z } from 'zod';
import { es, fmt } from '@/shared/i18n';
import { EMAIL_MAX_LENGTH, isValidEmail, normalizeEmail, passwordLengthIssue } from './credentials';
import { isValidMoney } from './money';

/** Campos zod reutilizables. Cada mensaje dice qué pasó y cómo arreglarlo. */
const v = es.validation;

/** Correo: misma normalización y validación que el backend (shared/lib/credentials.ts). */
export const emailField = z
  .string()
  .transform(normalizeEmail)
  .pipe(z.string().min(1, v.required).max(EMAIL_MAX_LENGTH, v.emailLength).refine(isValidEmail, v.emailInvalid));

/** Contraseña: solo longitud (12 a 128, tras NFKC y sin recortar), sin reglas de composición. */
export const passwordField = z.string().superRefine((value, ctx) => {
  if (value.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: v.required });
    return;
  }
  const issue = passwordLengthIssue(value);
  if (issue === 'short') ctx.addIssue({ code: z.ZodIssueCode.custom, message: v.passwordLength });
  if (issue === 'long') ctx.addIssue({ code: z.ZodIssueCode.custom, message: v.passwordMax });
});

/** Texto obligatorio con largo máximo. Recorta espacios al borde. */
export const textField = (max: number) => z.string().trim().min(1, v.required).max(max, fmt(v.maxLength, { max }));

/** Texto opcional con largo máximo ("" = sin valor). */
export const optionalText = (max: number) => z.string().trim().max(max, fmt(v.maxLength, { max }));

/** Entero opcional escrito como texto ("" = sin valor), dentro de [min, max]. */
export const intText = (min: number, max: number, required = true) =>
  z.string().trim().superRefine((value, ctx) => {
    if (value === '') {
      if (required) ctx.addIssue({ code: z.ZodIssueCode.custom, message: v.required });
      return;
    }
    if (!/^\d+$/.test(value)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: v.integer });
    else if (Number(value) < min) ctx.addIssue({ code: z.ZodIssueCode.custom, message: fmt(v.min, { min }) });
    else if (Number(value) > max) ctx.addIssue({ code: z.ZodIssueCode.custom, message: fmt(v.max, { max }) });
  });

/** Monto en texto: "94.38", hasta 10 enteros y 2 decimales. */
export const moneyField = z.string().trim().min(1, v.required).refine(isValidMoney, v.money);
export const optionalMoney = z.string().trim().refine((s) => s === '' || isValidMoney(s), v.money);

/** Campo con patrón (códigos IATA, ISO…): se escribe en mayúsculas. */
export const patternField = (pattern: RegExp, message: string, required = true) =>
  z.string().trim().transform((s) => s.toUpperCase()).pipe(
    z.string().superRefine((value, ctx) => {
      if (value === '') {
        if (required) ctx.addIssue({ code: z.ZodIssueCode.custom, message: v.required });
        return;
      }
      if (!pattern.test(value)) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    }),
  );
