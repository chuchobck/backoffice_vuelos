import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useRef, type FormEvent } from 'react';
import { useForm, type FieldValues } from 'react-hook-form';
import type { z } from 'zod';
import { isApiError } from '@/shared/api';
import { es } from '@/shared/i18n';
import { useErrorSummary } from '@/shared/lib/useErrorSummary';
import { Button, ErrorSummary } from '@/shared/ui';
import { ResourceCheckboxField } from './ResourceCheckboxField';
import { ResourceSelectField } from './ResourceSelectField';
import { ResourceTextField } from './ResourceTextField';
import type { FieldSpec } from './types';

interface ResourceFormProps {
  fields: FieldSpec[];
  schema: z.ZodType<FieldValues, z.ZodTypeDef, unknown>;
  defaultValues: FieldValues;
  submitLabel: string;
  submittingLabel: string;
  onSubmit: (values: FieldValues) => Promise<void> | void;
  onCancel: () => void;
  /** Error de la API del último envío: marca los campos que nombra (sin mostrar el detail técnico). */
  apiError?: unknown;
}

/**
 * Formulario genérico de un recurso: react-hook-form + zod. Valida al salir del campo y al enviar
 * sin borrar lo escrito; al enviar con errores muestra el resumen (role="alert") y lleva el foco
 * allí; el botón impide el doble envío.
 */
export function ResourceForm({ fields, schema, defaultValues, submitLabel, submittingLabel, onSubmit, onCancel, apiError }: ResourceFormProps) {
  const formId = useId().replace(/:/g, '');
  const idOf = (name: string) => `${formId}-${name}`;
  const {
    register,
    control,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<FieldValues>({ resolver: zodResolver(schema), defaultValues, mode: 'onTouched', shouldFocusError: false });

  const meta = Object.fromEntries(fields.map((f) => [f.name, { id: idOf(f.name), label: f.label }]));
  const { summary, summaryRef, onInvalid } = useErrorSummary(meta, errors, isSubmitted);
  const values = watch();

  useEffect(() => {
    if (!isApiError(apiError)) return;
    for (const fe of apiError.fieldErrors) {
      const root = fe.field.split(/[.[]/)[0] ?? '';
      if (fields.some((f) => f.name === root)) setError(root, { message: es.crud.summaryServerField });
    }
    // Solo cuando llega un error nuevo de la API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiError]);

  const sending = useRef(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true;
    void handleSubmit((v) => onSubmit(v), onInvalid)(event).finally(() => {
      sending.current = false;
    });
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <ErrorSummary ref={summaryRef} errors={summary} />
      {fields.map((spec) => {
        const id = idOf(spec.name);
        const error = errors[spec.name] as never;
        const required = !spec.optional;
        if (spec.kind === 'select') return <ResourceSelectField key={spec.name} spec={spec} id={id} register={register} error={error} values={values} required={required} />;
        if (spec.kind === 'checkbox') return <ResourceCheckboxField key={spec.name} spec={spec} id={id} control={control} />;
        return <ResourceTextField key={spec.name} spec={spec} id={id} register={register} error={error} required={required} />;
      })}
      <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          {es.common.cancel}
        </Button>
        <Button type="submit" loading={isSubmitting} loadingText={submittingLabel}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
