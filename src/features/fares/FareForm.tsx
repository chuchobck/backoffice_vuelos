import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { useForm, type FieldValues } from 'react-hook-form';
import { errorMessage, isApiError, useAllItems, useCreateMutation, useUpdateMutation, type Fare } from '@/shared/api';
import type { FormDialogProps } from '@/shared/crud';
import { es } from '@/shared/i18n';
import { cabinLabel, passengerLabel } from '@/shared/lib/labels';
import { useErrorSummary } from '@/shared/lib/useErrorSummary';
import { Alert, Button, ErrorSummary, Field, Input, Select, toast } from '@/shared/ui';
import { FarePriceFields } from './FarePriceFields';
import { FareWarnings } from './FareWarnings';
import { EMPTY_PRICES, PRICE_KINDS, pricesChanged, pricesToValues, valuesToPrices } from './farePrices';
import { FareCreateSchema, FareEditSchema } from './schemas';

const f = es.entities.fares.form;
const DEFAULTS_CREATE = { departureId: '', fareFamilyId: '', currency: 'USD', extraBagPrice: '', changeFee: '', ...EMPTY_PRICES };

/** Cuerpo del formulario de tarifas: se monta al abrir el diálogo, así parte siempre de los valores correctos. */
export function FareForm({ item, onOpenChange, onSaved }: Omit<FormDialogProps<'fares'>, 'open'>) {
  const editing = item !== undefined;
  const formId = useId().replace(/:/g, '');
  const idOf = (name: string) => `${formId}-${name}`;
  const create = useCreateMutation('fares');
  const update = useUpdateMutation('fares');
  const [apiError, setApiError] = useState<unknown>(null);

  const departures = useAllItems('departures', undefined, !editing);
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<FieldValues>({
    resolver: zodResolver(editing ? FareEditSchema : FareCreateSchema) as never,
    defaultValues: editing
      ? { extraBagPrice: item.extraBagPrice, changeFee: item.changeFee, ...pricesToValues(item) }
      : DEFAULTS_CREATE,
    mode: 'onTouched',
    shouldFocusError: false,
  });
  const values = watch() as Record<string, string>;

  const departure = editing ? undefined : departures.data?.items.find((d) => d.id === values.departureId);
  const carrier = departure?.flightNumber.slice(0, 2);
  const families = useAllItems('fareFamilies', { airline: carrier }, !editing && !!carrier);
  const familyOptions = useMemo(() => {
    const cabins = new Set(departure?.cabins.map((c) => c.cabinClass));
    return (families.data?.items ?? []).filter((x) => cabins.has(x.cabinClass));
  }, [families.data, departure]);

  const fieldNames = ['departureId', 'fareFamilyId', 'currency', 'extraBagPrice', 'changeFee', 'adultBase', 'adultTaxes', 'youthBase', 'youthTaxes', 'childBase', 'childTaxes', 'infantBase', 'infantTaxes'];
  const label = (n: string) => {
    const known: Record<string, string> = { departureId: f.departure, fareFamilyId: f.family, currency: f.currency, extraBagPrice: f.extraBag, changeFee: f.changeFee };
    if (known[n]) return known[n];
    const kind = PRICE_KINDS.find((k) => n.startsWith(k.key));
    return kind ? `${passengerLabel(kind.type)}: ${n.endsWith('Base') ? f.base : f.taxes}` : n;
  };
  const meta = Object.fromEntries(fieldNames.map((n) => [n, { id: idOf(n), label: label(n) }]));
  const { summary, summaryRef, onInvalid } = useErrorSummary(meta, errors, isSubmitted);

  useEffect(() => {
    if (!isApiError(apiError)) return;
    for (const fe of apiError.fieldErrors) {
      const root = fe.field.split(/[.[]/)[0] ?? '';
      const target = root === 'prices' ? 'adultBase' : root;
      if (fieldNames.includes(target)) setError(target, { message: es.crud.summaryServerField });
    }
    // Solo cuando llega un error nuevo de la API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiError]);

  const sending = useRef(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true;
    void handleSubmit(onValid, onInvalid)(event).finally(() => {
      sending.current = false;
    });
  };

  const onValid = async (v: FieldValues) => {
    setApiError(null);
    const prices = valuesToPrices(v as never);
    try {
      if (editing) {
        const body: { extraBagPrice?: string; changeFee?: string; prices?: typeof prices } = {};
        if (Number(v.extraBagPrice) !== Number(item.extraBagPrice)) body.extraBagPrice = v.extraBagPrice;
        if (v.changeFee !== '' && Number(v.changeFee) !== Number(item.changeFee)) body.changeFee = v.changeFee;
        if (pricesChanged(prices, item)) body.prices = prices;
        if (Object.keys(body).length === 0) {
          toast({ title: es.common.nothingToSave });
          onOpenChange(false);
          return;
        }
        await update.mutateAsync({ id: item.id, body });
        toast({ title: es.common.changesSaved, variant: 'success' });
      } else {
        await create.mutateAsync({
          departureId: v.departureId,
          fareFamilyId: v.fareFamilyId,
          currency: v.currency.toUpperCase(),
          extraBagPrice: v.extraBagPrice,
          ...(v.changeFee ? { changeFee: v.changeFee } : {}),
          prices,
        });
        toast({ title: es.common.created, variant: 'success' });
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      setApiError(error);
    }
  };

  const fare: Fare | undefined = item;

  return (
    <>
        {apiError ? (
          <Alert variant="error" live="assertive">
            <p>{errorMessage(apiError)}</p>
          </Alert>
        ) : null}
        <form noValidate onSubmit={submit} className="flex flex-col gap-4">
          <ErrorSummary ref={summaryRef} errors={summary} />
          {editing ? (
            <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[max-content_1fr]">
              <dt className="font-bold text-muted">{f.readOnlyFlight}</dt>
              <dd className="font-mono">{fare?.flightNumber}</dd>
              <dt className="font-bold text-muted">{f.readOnlyFamily}</dt>
              <dd>
                {fare?.fareBrand} · {fare ? cabinLabel(fare.cabinClass) : ''}
              </dd>
              <dt className="font-bold text-muted">{f.readOnlyDeparture}</dt>
              <dd className="font-mono break-all">{fare?.departureId}</dd>
            </dl>
          ) : (
            <>
              <Field id={idOf('departureId')} label={f.departure} hint={f.departureHint} error={errors.departureId?.message as string | undefined} required>
                <Select
                  {...register('departureId')}
                  placeholder={departures.isLoading ? es.a11y.loading : es.common.choose}
                  options={(departures.data?.items ?? []).map((d) => ({ value: d.id, label: `${d.flightNumber} · ${d.departureDate} · ${d.origin}→${d.destination}` }))}
                />
              </Field>
              <Field
                id={idOf('fareFamilyId')}
                label={f.family}
                hint={departure ? undefined : f.familyHintNeedDeparture}
                error={errors.fareFamilyId?.message as string | undefined}
                required
              >
                <Select
                  {...register('fareFamilyId')}
                  placeholder={families.isLoading ? es.a11y.loading : es.common.choose}
                  options={familyOptions.map((x) => ({ value: x.id, label: `${x.name} (${x.code}) · ${cabinLabel(x.cabinClass)}` }))}
                />
              </Field>
              {departure && families.data && familyOptions.length === 0 ? <Alert variant="warning"><p>{f.familyNone}</p></Alert> : null}
              <Field id={idOf('currency')} label={f.currency} error={errors.currency?.message as string | undefined} required className="max-w-40">
                <Input {...register('currency')} maxLength={3} autoComplete="off" spellCheck={false} className="uppercase" />
              </Field>
            </>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={idOf('extraBagPrice')} label={f.extraBag} error={errors.extraBagPrice?.message as string | undefined} required>
              <Input {...register('extraBagPrice')} inputMode="decimal" maxLength={13} autoComplete="off" />
            </Field>
            <Field id={idOf('changeFee')} label={f.changeFee} error={errors.changeFee?.message as string | undefined} required={false}>
              <Input {...register('changeFee')} inputMode="decimal" maxLength={13} autoComplete="off" />
            </Field>
          </div>
          <h3 className="text-lg">{f.pricesTitle}</h3>
          <FarePriceFields idOf={idOf} register={register} errors={errors} values={values} />
          <FareWarnings values={values} fare={fare} departure={departure} familyId={values.fareFamilyId} />
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              {es.common.cancel}
            </Button>
            <Button type="submit" loading={isSubmitting} loadingText={editing ? es.common.saving : es.common.creating}>
              {editing ? es.common.save : es.common.create}
            </Button>
          </div>
        </form>
    </>
  );
}
