import type { FieldErrors, FieldValues, UseFormRegister } from 'react-hook-form';
import { CABIN_CLASSES } from '@/shared/api';
import { es, fmt } from '@/shared/i18n';
import { cabinLabel } from '@/shared/lib/labels';
import { Button, Field, Input, Select } from '@/shared/ui';

const t = es.entities.seatMaps.create;

type BlockErrors = Record<string, { message?: string } | undefined> | undefined;

/** Un bloque de filas: cabina, primera fila, cantidad, distribución de letras y filas especiales. */
export function SeatBlockFields({
  index,
  register,
  errors,
  idOf,
  canRemove,
  onRemove,
}: {
  index: number;
  register: UseFormRegister<FieldValues>;
  errors: FieldErrors<FieldValues>;
  idOf: (name: string) => string;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const blockErrors = ((errors.blocks as unknown[] | undefined)?.[index] as BlockErrors) ?? undefined;
  const err = (name: string) => blockErrors?.[name]?.message;
  const id = (name: string) => idOf(`blocks-${index}-${name}`);
  const n = index + 1;
  return (
    <fieldset className="flex flex-col gap-4 rounded border-2 border-border p-4">
      <legend className="px-2 font-bold">{fmt(t.block, { n })}</legend>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id={id('cabinClass')} label={t.cabin} error={err('cabinClass')} required>
          <Select {...register(`blocks.${index}.cabinClass`)} options={CABIN_CLASSES.map((c) => ({ value: c, label: cabinLabel(c) }))} placeholder={es.common.choose} />
        </Field>
        <Field id={id('firstRow')} label={t.firstRow} error={err('firstRow')} required>
          <Input {...register(`blocks.${index}.firstRow`)} inputMode="numeric" maxLength={2} autoComplete="off" />
        </Field>
        <Field id={id('rowCount')} label={t.rowCount} error={err('rowCount')} required>
          <Input {...register(`blocks.${index}.rowCount`)} inputMode="numeric" maxLength={2} autoComplete="off" />
        </Field>
      </div>
      <Field id={id('layout')} label={t.layout} hint={t.layoutHint} error={err('layout')} required>
        <Input {...register(`blocks.${index}.layout`)} autoComplete="off" spellCheck={false} className="font-mono uppercase" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={id('extraLegroom')} label={t.extraLegroom} hint={t.extraLegroomHint} error={err('extraLegroom')} required={false}>
          <Input {...register(`blocks.${index}.extraLegroom`)} autoComplete="off" />
        </Field>
        <Field id={id('emergencyExit')} label={t.emergencyExit} hint={t.extraLegroomHint} error={err('emergencyExit')} required={false}>
          <Input {...register(`blocks.${index}.emergencyExit`)} autoComplete="off" />
        </Field>
      </div>
      {canRemove ? (
        <div>
          <Button variant="danger-outline" size="sm" onClick={onRemove} aria-label={fmt(t.removeBlock, { n })}>
            {fmt(t.removeBlock, { n })}
          </Button>
        </div>
      ) : null}
    </fieldset>
  );
}
