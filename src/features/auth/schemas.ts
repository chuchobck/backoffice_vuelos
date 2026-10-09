import { z } from 'zod';
import { es } from '@/shared/i18n';
import { emailField, passwordField } from '@/shared/lib/schemas';

const v = es.validation;

/** Reglas del backend (shared/lib/credentials.ts): correo normalizado y contraseña de 12 a 128. */
export const LoginSchema = z.object({
  email: emailField,
  password: passwordField,
  demo: z.boolean(),
});
export type LoginInput = z.input<typeof LoginSchema>;

/** En modo demo cualquier contraseña no vacía sirve (no se envía a ningún lado). */
export const DemoLoginSchema = LoginSchema.extend({ password: z.string().min(1, v.required) });
