import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { adminApi, ApiError, errorMessage, useAllItems, type SeatMapSummary } from '@/shared/api';
import { es, fmt } from '@/shared/i18n';
import { cabinLabel } from '@/shared/lib/labels';
import { useErrorSummary } from '@/shared/lib/useErrorSummary';
import { Alert, ErrorState, Field, Input, LoadingState, Select } from '@/shared/ui';
import { AirlineStepSchema, type AirlineStepValues } from './schemas';
import { StepFrame } from './StepFrame';
import type { StepProps } from './StepProps';
import type { SeatMapChoice } from './types';

const t = es.wizard.airline;

/**
 * Paso 2: aerolínea, equipo, mapa de asientos (define las cabinas) y número de vuelo: uno nuevo o uno
 * que ya existe en la ruta. Un número nuevo se comprueba contra la API antes de seguir.
 */
export function StepAirline({ state, onNext, onBack }: StepProps) {
  const airlines = useAllItems('airlines');
  const models = useAllItems('aircraftModels');
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    getValues,
    watch,
    formState: { errors, isSubmitted },
  } = useForm<AirlineStepValues>({
    resolver: zodResolver(AirlineStepSchema),
    defaultValues: {
      airline: state.airline,
      model: state.model,
      seatMapId: state.seatMap?.id ?? '',
      flightMode: state.flightMode,
      number: state.number,
      existingFlight: state.existingFlight,
    },
    mode: 'onTouched',
  });
  const { summary, summaryRef, onInvalid } = useErrorSummary<AirlineStepValues>(
    {
      airline: { id: 'wz-airline', label: t.airline },
      model: { id: 'wz-model', label: t.model },
      seatMapId: { id: 'wz-seatmap', label: t.seatMap },
      number: { id: 'wz-number', label: t.newNumber },
      existingFlight: { id: 'wz-existing', label: t.existing },
    },
    errors,
    isSubmitted,
  );

  const airline = watch('airline');
  const model = watch('model');
  const mode = watch('flightMode');
  const seatMapId = watch('seatMapId');

  const seatMaps = useAllItems('seatMaps', { airline, aircraftModel: model }, !!airline && !!model);
  const flights = useAllItems('flightNumbers', { airline, origin: state.origin, destination: state.destination }, !!airline);

  // Si cambia la aerolínea o el equipo, el mapa elegido puede ya no corresponder.
  useEffect(() => {
    if (!seatMaps.data) return;
    const ids = seatMaps.data.items.map((m) => m.id);
    if (seatMapId && !ids.includes(seatMapId)) setValue('seatMapId', '');
    else if (!seatMapId && ids.length === 1) setValue('seatMapId', ids[0]!);
  }, [seatMaps.data, seatMapId, setValue]);

  const existing = flights.data?.items ?? [];
  useEffect(() => {
    if (flights.data && existing.length === 0 && mode === 'existing') setValue('flightMode', 'new');
  }, [flights.data, existing.length, mode, setValue]);

  if (airlines.isLoading || models.isLoading) return <LoadingState skeletons={3} />;
  if (airlines.error || models.error) return <ErrorState error={airlines.error ?? models.error} onRetry={() => { void airlines.refetch(); void models.refetch(); }} />;

  const maps = seatMaps.data?.items ?? [];
  const back = () => {
    const v = getValues();
    onBack({ airline: v.airline, model: v.model, seatMap: toChoice(maps.find((m) => m.id === v.seatMapId)), flightMode: v.flightMode, number: v.number, existingFlight: v.existingFlight });
  };

  const submit = async (v: AirlineStepValues) => {
    setCheckError(null);
    if (v.flightMode === 'new') {
      const flight = `${v.airline}${v.number}`;
      setChecking(true);
      try {
        const found = await adminApi.flightNumbers.get(flight);
        setError('number', {
          message: fmt(t.exists, { flight, inactive: found.active ? '' : t.existsInactive, route: `${found.origin} → ${found.destination}` }),
        });
        document.getElementById('wz-number')?.focus();
        return;
      } catch (error) {
        // 404 = el número está libre; cualquier otro error detiene el paso.
        if (!(error instanceof ApiError && error.status === 404)) {
          setCheckError(errorMessage(error));
          return;
        }
      } finally {
        setChecking(false);
      }
    }
    onNext({
      airline: v.airline,
      model: v.model,
      seatMap: toChoice(maps.find((m) => m.id === v.seatMapId)),
      flightMode: v.flightMode,
      number: v.number,
      existingFlight: v.existingFlight,
    });
  };

  return (
    <StepFrame step={1} intro={t.intro} summary={summary} summaryRef={summaryRef} onBack={back} busy={checking} onSubmit={(e) => void handleSubmit(submit, onInvalid)(e)}>
      {checkError ? <Alert variant="error" live="assertive"><p>{checkError}</p></Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="wz-airline" label={t.airline} error={errors.airline?.message} required>
          <Select {...register('airline')} options={(airlines.data?.items ?? []).map((a) => ({ value: a.code, label: `${a.code} — ${a.name}` }))} placeholder={es.common.choose} />
        </Field>
        <Field id="wz-model" label={t.model} error={errors.model?.message} required>
          <Select {...register('model')} options={(models.data?.items ?? []).map((m) => ({ value: m.code, label: `${m.name} (${m.code})` }))} placeholder={es.common.choose} />
        </Field>
      </div>
      <Field id="wz-seatmap" label={t.seatMap} hint={t.seatMapHint} error={errors.seatMapId?.message} required>
        <Select
          {...register('seatMapId')}
          options={maps.map((m) => ({ value: m.id, label: `${m.name} — ${m.cabins.map((c) => `${cabinLabel(c.cabinClass)} ${c.seats}`).join(' / ')}` }))}
          placeholder={!airline || !model ? t.seatMapPick : seatMaps.isLoading ? es.a11y.loading : es.common.choose}
        />
      </Field>
      {airline && model && seatMaps.data && maps.length === 0 ? <Alert variant="warning"><p>{t.seatMapNone}</p></Alert> : null}

      <fieldset className="flex flex-col gap-2 rounded border-2 border-border p-4">
        <legend className="px-2 font-bold">{t.flightNumber}</legend>
        <div className="flex min-h-11 items-center gap-3">
          <input id="wz-mode-new" type="radio" value="new" {...register('flightMode')} className="size-6" />
          <label htmlFor="wz-mode-new" className="font-bold">{t.modeNew}</label>
        </div>
        {mode === 'new' ? (
          <div className="ml-8">
            <Field id="wz-number" label={t.newNumber} hint={t.newNumberHint} error={errors.number?.message} required>
              <Input {...register('number')} inputMode="numeric" maxLength={4} autoComplete="off" />
            </Field>
          </div>
        ) : null}
        <div className="flex min-h-11 items-center gap-3">
          <input id="wz-mode-existing" type="radio" value="existing" disabled={existing.length === 0} {...register('flightMode')} className="size-6" />
          <label htmlFor="wz-mode-existing" className="font-bold">{t.modeExisting}</label>
        </div>
        {mode === 'existing' ? (
          <div className="ml-8">
            <Field id="wz-existing" label={t.existing} error={errors.existingFlight?.message} required>
              <Select {...register('existingFlight')} options={existing.map((f) => ({ value: f.flightNumber, label: `${f.flightNumber} (${f.origin} → ${f.destination})` }))} placeholder={es.common.choose} />
            </Field>
          </div>
        ) : null}
        {airline && flights.data && existing.length === 0 ? <p className="text-sm text-muted">{t.existingNone}</p> : null}
      </fieldset>
    </StepFrame>
  );
}

function toChoice(m: SeatMapSummary | undefined): SeatMapChoice | null {
  return m ? { id: m.id, name: m.name, cabins: m.cabins.map((c) => ({ cabinClass: c.cabinClass, seats: c.seats })) } : null;
}
