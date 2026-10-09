import { Controller, type Control, type FieldErrors, type FieldValues, type UseFormRegister } from 'react-hook-form';
import type { FareFamily } from '@/shared/api';
import { es, fmt } from '@/shared/i18n';
import { PRICE_KINDS } from '@/shared/lib/farePrices';
import { passengerLabel } from '@/shared/lib/labels';
import { addMoney } from '@/shared/lib/money';
import { Checkbox, Field, Input } from '@/shared/ui';

const t = es.wizard.cabins;
const f = es.entities.fares.form;

type Errors = Record<string, { message?: string } | undefined> | undefined;

/** Una familia tarifaria dentro de una cabina: casilla "vender con…" y, activada, sus precios por pasajero. */
export function FamilyPricing({
  family,
  on,
  register,
  control,
  errors,
  values,
  idOf,
}: {
  family: FareFamily;
  on: boolean;
  register: UseFormRegister<FieldValues>;
  control: Control<FieldValues>;
  errors: FieldErrors<FieldValues>;
  values: Record<string, string>;
  idOf: (name: string) => string;
}) {
  const prefix = `families.${family.id}`;
  const famErrors = ((errors.families as Record<string, unknown> | undefined)?.[family.id] as Errors) ?? undefined;
  const err = (name: string) => famErrors?.[name]?.message;
  const label = fmt(t.sellWith, {
    name: family.name,
    code: family.code,
    changeable: family.changeable ? t.changeable : t.notChangeable,
    bags: family.checkedBagsIncluded,
  });
  return (
    <div className="flex flex-col gap-2">
      <Controller
        control={control}
        name={`${prefix}.on`}
        render={({ field }) => <Checkbox ref={field.ref} label={label} checked={field.value === true} onCheckedChange={(v) => field.onChange(v === true)} />}
      />
      {on ? (
        <div className="ml-4 flex flex-col gap-4 border-l-4 border-border pl-4 sm:ml-8">
          {PRICE_KINDS.map(({ type, key, required }) => {
            const total = addMoney((values[`${key}Base`] ?? '').trim(), (values[`${key}Taxes`] ?? '').trim());
            const who = passengerLabel(type);
            return (
              <div key={key} className="flex flex-col gap-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id={idOf(`${family.id}-${key}Base`)} label={`${who}: ${f.base}`} error={err(`${key}Base`)} required={required}>
                    <Input {...register(`${prefix}.${key}Base`)} inputMode="decimal" maxLength={13} autoComplete="off" />
                  </Field>
                  <Field id={idOf(`${family.id}-${key}Taxes`)} label={`${who}: ${f.taxes}`} error={err(`${key}Taxes`)} required={required}>
                    <Input {...register(`${prefix}.${key}Taxes`)} inputMode="decimal" maxLength={13} autoComplete="off" />
                  </Field>
                </div>
                {total ? <p className="font-bold" aria-live="polite">{fmt(f.total, { type: who.toLowerCase(), amount: total })}</p> : null}
              </div>
            );
          })}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={idOf(`${family.id}-extraBag`)} label={t.extraBag} error={err('extraBag')} required>
              <Input {...register(`${prefix}.extraBag`)} inputMode="decimal" maxLength={13} autoComplete="off" />
            </Field>
            <Field id={idOf(`${family.id}-changeFee`)} label={t.changeFee} error={err('changeFee')} required={false}>
              <Input {...register(`${prefix}.changeFee`)} inputMode="decimal" maxLength={13} autoComplete="off" />
            </Field>
          </div>
        </div>
      ) : null}
    </div>
  );
}
