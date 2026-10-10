import { z } from 'zod';
import { emailField, passwordField } from '@/shared/lib/schemas';

/** Reglas del backend (iguales a /auth/register): correo válido en minúsculas y contraseña de 12 a 128. */
export const AdminCreateSchema = z.object({ email: emailField, password: passwordField });
export type AdminValues = z.infer<typeof AdminCreateSchema>;
