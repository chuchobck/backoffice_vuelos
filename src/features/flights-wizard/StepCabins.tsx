import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useRef } from 'react';
import { useForm, type FieldValues } from 'react-hook-form';
import { useAirportZones, useAllItems } from '@/shared/api';
import { es } from '@/shared/i18n';
import { GALAPAGOS_ZONE } from '@/shared/lib/dates';
import { EMPTY_PRICES } from '@/shared/lib/farePrices';
import { cabinLabel } from '@/shared/lib/labels';
import { useErrorSummary } from '@/shared/lib/useErrorSummary';
import { Alert, ErrorState, Field, Input, LoadingState } from '@/shared/ui';
import { CABINS_FORM_ERROR_ID, cabinsSchema, type CabinsValues } from './cabinsSchema';
import { CabinSection } from './CabinSection';
import { StepFrame } from './StepFrame';
import type { StepProps } from './StepProps';
import type { CabinForm, FamilyForm, FamilyMeta } from './types';

const t = es.wizard.cabins;

/**
 * Paso 4: cupo por cabina (a lo sumo los asientos del mapa) y, por cada familia tarifaria de la
 * aerolínea, su precio por tipo de pasajero. Avisa (sin bloquear) de montos raros.
 */
export function StepCabins({ state, onNext, onBack }: StepProps) {
  const seatMap = state.seatMap;
  const families = useAllItems('fareFamilies', { airline: state.airline }, !!seatMap);
  const { zoneOf } = useAirportZones();
  const galapagos = zoneOf(state.origin) === GALAPAGOS_ZONE || zoneOf(state.destination) === GALAPAGOS_ZONE;

  const list = useMemo(() => (families.data?.items ?? []).filter((f) => seatMap?.cabins.some((c) => c.cabinClass === f.cabinClass)), [families.data, seatMap]);
  // Firma estable: un refresco en segundo plano de las familias no debe borrar lo que el usuario escribe.
  const signature = list.map((f) => f.id).join(',');
  const schema = useMemo(
    () => (seatMap ? cabinsSchema(seatMap, list.map((f) => ({ id: f.id, cabinClass: f.cabinClass }))) : null),
    [seatMap, list],
  );
  const schemaRef = useRef(schema);
  schemaRef.current = schema;

  const defaults = useMemo<CabinsValues>(() => {
    const cabins: Record<string, CabinForm> = {};
    for (const c of seatMap?.cabins ?? []) cabins[c.cabinClass] = state.cabins[c.cabinClass] ?? { on: true, seats: String(c.seats) };
    const fams: Record<string, FamilyForm> = {};
    for (const f of list) fams[f.id] = state.families[f.id] ?? { ...EMPTY_PRICES, on: false, extraBag: '15.00', changeFee: '' };
    return { currency: state.currency, cabins, families: fams };
    // Los valores iniciales se calculan una vez que llegan las familias (cambia solo si cambia el conjunto).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, seatMap]);

  const {
    register,
    control,
    handleSubmit,
    getValues,
    reset,
    watch,
    formState: { errors, isSubmitted },
  } = useForm<FieldValues>({
    resolver: (values, context, options) => (schemaRef.current ? zodResolver(schemaRef.current)(values, context, options) : { values, errors: {} }),
    defaultValues: defaults,
    mode: 'onTouched',
  });
  // Al llegar las familias se cargan los valores iniciales (una sola vez por conjunto de familias).
  useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);

  const { summary, summaryRef, onInvalid } = useErrorSummary<FieldValues>(
    {
      form: { id: CABINS_FORM_ERROR_ID, label: es.wizard.steps[3] ?? '' },
      currency: { id: 'wz-currency', label: t.currency },
    },
    errors,
    isSubmitted,
  );
  const values = watch() as never;

  if (!seatMap) {
    return (
      <StepFrame step={3} intro={t.intro} summary={[]} summaryRef={null} onBack={() => onBack({})} onSubmit={(e) => e.preventDefault()}>
        <Alert variant="error" live="assertive"><p>{t.missingSeatMap}</p></Alert>
      </StepFrame>
    );
  }
  if (families.isLoading) return <LoadingState label={t.loadingFamilies} skeletons={3} />;
  if (families.error) return <ErrorState error={families.error} onRetry={() => void families.refetch()} />;

  const patch = (v: FieldValues): Partial<typeof state> => {
    const famForms = v.families as Record<string, FamilyForm>;
    const meta: Record<string, FamilyMeta> = {};
    for (const f of list) meta[f.id] = { name: f.name, code: f.code, cabinClass: f.cabinClass, changeable: f.changeable, checkedBags: f.checkedBagsIncluded };
    return { currency: String(v.currency).toUpperCase(), cabins: v.cabins as typeof state.cabins, families: famForms, familyMeta: meta };
  };

  const formError = (errors.form as { message?: string } | undefined)?.message;
  const idOf = (name: string) => `wz-${name}`;

  return (
    <StepFrame step={3} intro={t.intro} summary={summary} summaryRef={summaryRef} onBack={() => onBack(patch(getValues()))} onSubmit={(e) => void handleSubmit((v) => onNext(patch(v)), onInvalid)(e)}>
      <div id={CABINS_FORM_ERROR_ID} tabIndex={-1} className="outline-none">
        {formError ? <Alert variant="error" live="assertive"><p>{formError}</p></Alert> : null}
      </div>
      <Field id="wz-currency" label={t.currency} error={(errors.currency as { message?: string } | undefined)?.message} required className="max-w-40">
        <Input {...register('currency')} maxLength={3} autoComplete="off" spellCheck={false} className="uppercase" />
      </Field>
      {seatMap.cabins.map((cabin) => (
        <CabinSection
          key={cabin.cabinClass}
          cabin={cabin}
          families={list.filter((f) => f.cabinClass === cabin.cabinClass)}
          register={register}
          control={control}
          errors={errors}
          values={values}
          galapagos={galapagos}
          idOf={idOf}
        />
      ))}
      <p className="sr-only">{seatMap.cabins.map((c) => cabinLabel(c.cabinClass)).join(', ')}</p>
    </StepFrame>
  );
}
