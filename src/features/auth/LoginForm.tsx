import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import { apiConfig, loginErrorMessage, warmUpServer } from '@/shared/api';
import { es } from '@/shared/i18n';
import { Alert, Button, Field, Input, PasswordInput } from '@/shared/ui';
import { useAuth } from './AuthProvider';
import { LoginSchema, type LoginInput } from './schemas';

const a = es.auth;

/**
 * Formulario de ingreso. Valida al salir del campo y al enviar sin borrar lo escrito. El rol nunca se envía: el servidor
 * lo decide y la sesión comprueba el permiso `flights:admin` con /auth/me.
 */
export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { login } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
    shouldFocusError: true,
  });

  // Despierta el servidor gratuito de Render al empezar a escribir.
  const warmed = useRef(false);
  const onFocus = () => {
    if (warmed.current) return;
    warmed.current = true;
    warmUpServer();
  };

  // Evita el doble envío (también con Enter): el candado se toma antes de la validación asíncrona.
  const sending = useRef(false);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true;
    void handleSubmit(onValid)(event).finally(() => {
      sending.current = false;
    });
  };

  const onValid = async (values: LoginInput) => {
    setSubmitError(null);
    try {
      await login({ email: values.email, password: values.password });
      onSuccess();
    } catch (error) {
      setSubmitError(loginErrorMessage(error));
    }
  };

  return (
    <form noValidate onSubmit={onSubmit} onFocus={onFocus} className="flex flex-col gap-6">
      {submitError ? (
        <Alert variant="error" live="assertive">
          <p>{submitError}</p>
        </Alert>
      ) : null}
      <Field label={a.email} error={errors.email?.message} required>
        <Input {...register('email')} type="email" autoComplete="username" inputMode="email" spellCheck={false} autoCapitalize="none" />
      </Field>
      <Field label={a.password} hint={a.passwordHint} error={errors.password?.message} required>
        <PasswordInput {...register('password')} autoComplete="current-password" />
      </Field>
      <Button type="submit" size="lg" loading={isSubmitting} loadingText={a.submitting}>
        <LogIn aria-hidden="true" />
        {a.submit}
      </Button>
      <p className="text-sm text-muted">
        {a.apiLabel}: {apiConfig.apiUrl || a.apiMissing}
      </p>
    </form>
  );
}
