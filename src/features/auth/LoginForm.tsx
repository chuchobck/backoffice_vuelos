import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { apiConfig, loginErrorMessage, setApiMode, useIsDemo, warmUpServer } from '@/shared/api';
import { es } from '@/shared/i18n';
import { Alert, Button, Checkbox, Field, Input, PasswordInput } from '@/shared/ui';
import { useAuth } from './AuthProvider';
import { DemoLoginSchema, LoginSchema, type LoginInput } from './schemas';

const a = es.auth;

/**
 * Formulario de ingreso. Valida al salir del campo y al enviar sin borrar lo escrito. El interruptor
 * "Modo demo" cambia de la API real a datos locales (sin red). El rol nunca se envía: el servidor
 * lo decide y la sesión comprueba el permiso `flights:admin` con /auth/me.
 */
export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { login } = useAuth();
  const demoNow = useIsDemo();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors, isSubmitting, touchedFields },
  } = useForm<LoginInput>({
    // En modo demo la contraseña solo debe estar escrita; el resolver se elige en cada validación.
    resolver: (values, context, options) => zodResolver(values.demo ? DemoLoginSchema : LoginSchema)(values, context, options),
    defaultValues: { email: '', password: '', demo: demoNow },
    mode: 'onTouched',
    shouldFocusError: true,
  });

  // Evita el doble envío (también con Enter): el candado se toma antes de la validación asíncrona.
  // Despierta el servidor gratuito de Render al empezar a escribir, solo en modo real (la demo nunca hace red).
  const warmed = useRef(false);
  const onFocus = () => {
    if (warmed.current || getValues('demo')) return;
    warmed.current = true;
    warmUpServer();
  };

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
    setApiMode(values.demo ? 'demo' : 'real');
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
      <Controller
        control={control}
        name="demo"
        render={({ field }) => (
          <Checkbox
            ref={field.ref}
            label={es.demo.switchLabel}
            hint={es.demo.switchHint}
            checked={field.value}
            onCheckedChange={(v) => {
              field.onChange(v === true);
              // La regla de la contraseña cambia con el modo: se revalida si ya se tocó el campo.
              if (touchedFields.password || getValues('password')) void trigger('password');
            }}
          />
        )}
      />
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
