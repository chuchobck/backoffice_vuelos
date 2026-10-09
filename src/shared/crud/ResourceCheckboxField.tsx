import { Controller, type Control, type FieldValues } from 'react-hook-form';
import { Checkbox } from '@/shared/ui';
import type { FieldSpec } from './types';

type CheckboxSpec = Extract<FieldSpec, { kind: 'checkbox' }>;

export function ResourceCheckboxField({ spec, id, control }: { spec: CheckboxSpec; id: string; control: Control<FieldValues> }) {
  return (
    <Controller
      control={control}
      name={spec.name}
      render={({ field }) => (
        <Checkbox id={id} ref={field.ref} label={spec.label} hint={spec.hint} checked={field.value === true} onCheckedChange={(v) => field.onChange(v === true)} />
      )}
    />
  );
}
