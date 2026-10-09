import { z } from 'zod';
import { emailField, passwordField } from '@/shared/lib/schemas';

/** Reglas del backend (shared/lib/credentials.ts): correo normalizado y contraseña de 12 a 128. */
export const LoginSchema = z.object({
  email: emailField,
  password: passwordField,
});
export type LoginInput = z.input<typeof LoginSchema>;
