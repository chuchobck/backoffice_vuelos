import type { FieldErrors, FieldValues, UseFormRegister } from 'react-hook-form';
import { es, fmt } from '@/shared/i18n';
import { passengerLabel } from '@/shared/lib/labels';
import { addMoney } from '@/shared/lib/money';
import { Field, Input } from '@/shared/ui';
import { PRICE_KINDS } from '@/shared/lib/farePrices';

const f = es.entities.fares.form;

/** Precio por tipo de pasajero: tarifa base e impuestos, con el total calculado en centavos. */
export function FarePriceFields({
  idOf,
  register,
  errors,
  values,
}: {
  idOf: (name: string) => string;
  register: UseFormRegister<FieldValues>;
  errors: FieldErrors<FieldValues>;
  values: Record<string, string>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{f.pricesHint}</p>
      {PRICE_KINDS.map(({ type, key, required }) => {
        const base = `${key}Base`;
        const taxes = `${key}Taxes`;
        const total = addMoney((values[base] ?? '').trim(), (values[taxes] ?? '').trim());
        const legend = passengerLabel(type);
        return (
          <fieldset key={type} className="rounded border-2 border-border p-4">
            <legend className="px-2 font-bold">{required ? legend : `${legend} (${es.a11y.optional})`}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id={idOf(base)} label={`${legend}: ${f.base}`} error={errors[base]?.message as string | undefined} required={required}>
                <Input {...register(base)} inputMode="decimal" maxLength={13} autoComplete="off" />
              </Field>
              <Field id={idOf(taxes)} label={`${legend}: ${f.taxes}`} error={errors[taxes]?.message as string | undefined} required={required}>
                <Input {...register(taxes)} inputMode="decimal" maxLength={13} autoComplete="off" />
              </Field>
            </div>
            {total ? (
              <p className="mt-2 font-bold" aria-live="polite">
                {fmt(f.total, { type: legend.toLowerCase(), amount: total })}
              </p>
            ) : null}
          </fieldset>
        );
      })}
    </div>
  );
}
