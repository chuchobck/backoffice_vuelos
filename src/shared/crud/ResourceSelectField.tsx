import type { FieldError, UseFormRegister, FieldValues } from 'react-hook-form';
import { es } from '@/shared/i18n';
import { Field, Select } from '@/shared/ui';
import type { FieldSpec } from './types';
import { useOptions } from './useOptions';

type SelectSpec = Extract<FieldSpec, { kind: 'select' }>;

/** Lista desplegable nativa con opciones fijas o cargadas de la API (solo los registros activos). */
export function ResourceSelectField({
  spec,
  id,
  register,
  error,
  values,
  required,
}: {
  spec: SelectSpec;
  id: string;
  register: UseFormRegister<FieldValues>;
  error?: FieldError;
  values: Record<string, unknown>;
  required: boolean;
}) {
  const loaded = useOptions(spec.source, values);
  const options = spec.options ?? loaded.options;
  const placeholder = loaded.loading ? es.a11y.loading : (spec.source?.placeholder ?? spec.placeholder ?? es.common.choose);
  return (
    <Field id={id} label={spec.label} hint={spec.hint} error={error?.message} required={required}>
      <Select {...register(spec.name)} options={options} placeholder={placeholder} />
    </Field>
  );
}
