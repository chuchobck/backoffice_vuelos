import type { FieldError, FieldValues, UseFormRegister } from 'react-hook-form';
import { cn } from '@/shared/lib/cn';
import { Field, Input } from '@/shared/ui';
import type { FieldSpec } from './types';

type TextSpec = Extract<FieldSpec, { kind: 'text' }>;

export function ResourceTextField({
  spec,
  id,
  register,
  error,
  required,
}: {
  spec: TextSpec;
  id: string;
  register: UseFormRegister<FieldValues>;
  error?: FieldError;
  required: boolean;
}) {
  return (
    <Field id={id} label={spec.label} hint={spec.hint} error={error?.message} required={required}>
      <Input
        {...register(spec.name)}
        type={spec.inputType ?? 'text'}
        inputMode={spec.inputMode}
        maxLength={spec.maxLength}
        placeholder={spec.placeholder}
        autoComplete={spec.autoComplete ?? 'off'}
        spellCheck={false}
        autoCapitalize={spec.upper ? 'characters' : 'none'}
        className={cn(spec.upper && 'uppercase')}
      />
    </Field>
  );
}
