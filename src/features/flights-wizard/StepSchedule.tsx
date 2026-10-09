import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useAirportZones } from '@/shared/api';
import { es, fmt } from '@/shared/i18n';
import { todayIn, zoneLabel } from '@/shared/lib/dates';
import { useErrorSummary } from '@/shared/lib/useErrorSummary';
import { Checkbox, Field, Input, LoadingState, Select } from '@/shared/ui';
import { wizardDates } from './plan';
import { scheduleSchema, type ScheduleValues } from './schemas';
import { StepFrame } from './StepFrame';
import type { StepProps } from './StepProps';

const t = es.wizard.schedule;

/**
 * Paso 3: fechas y horas. La salida se escribe en la hora local del aeropuerto de origen y la llegada
 * en la del destino (Galápagos es UTC−6); la API las recibe en UTC. Fechas repetibles hasta 31.
 */
export function StepSchedule({ state, onNext, onBack }: StepProps) {
  const { ready, zoneOf } = useAirportZones();
  const originZone = zoneOf(state.origin);
  const destinationZone = zoneOf(state.destination);
  const schema = useMemo(() => scheduleSchema(originZone, destinationZone), [originZone, destinationZone]);
  const schemaRef = useRef(schema);
  schemaRef.current = schema;

  const {
    register,
    control,
    handleSubmit,
    getValues,
    watch,
    formState: { errors, isSubmitted },
  } = useForm<ScheduleValues>({
    resolver: (values, context, options) => zodResolver(schemaRef.current)(values, context, options),
    defaultValues: {
      startDate: state.startDate,
      endDate: state.endDate,
      days: state.days,
      depTime: state.depTime,
      arrTime: state.arrTime,
      arrPlus: state.arrPlus,
      depTerminal: state.depTerminal,
      arrTerminal: state.arrTerminal,
    },
    mode: 'onTouched',
  });
  const { summary, summaryRef, onInvalid } = useErrorSummary<ScheduleValues>(
    {
      startDate: { id: 'wz-start', label: t.startDate },
      endDate: { id: 'wz-end', label: t.endDate },
      depTime: { id: 'wz-dep', label: t.depTime },
      arrTime: { id: 'wz-arr', label: t.arrTime },
    },
    errors,
    isSubmitted,
  );
  const values = watch();

  if (!ready) return <LoadingState skeletons={3} />;

  const dates = wizardDates(values as never);
  const preview =
    dates.length === 0
      ? t.previewEmpty
      : fmt(dates.length === 1 ? t.previewOne : t.previewMany, {
          count: dates.length,
          dates: dates.length > 6 ? `${dates.slice(0, 3).join(', ')} … ${dates[dates.length - 1]}` : dates.join(', '),
          times:
            values.depTime && values.arrTime
              ? fmt(t.previewTimes, { dep: values.depTime, arr: values.arrTime, plus: values.arrPlus === '0' ? '' : ` (+${values.arrPlus})` })
              : '',
        });

  const patch = (v: ScheduleValues) => ({
    startDate: v.startDate,
    endDate: v.endDate,
    days: v.days,
    depTime: v.depTime,
    arrTime: v.arrTime,
    arrPlus: v.arrPlus,
    depTerminal: v.depTerminal,
    arrTerminal: v.arrTerminal,
  });

  return (
    <StepFrame step={2} intro={t.intro} summary={summary} summaryRef={summaryRef} onBack={() => onBack(patch(getValues()))} onSubmit={(e) => void handleSubmit((v) => onNext(patch(v)), onInvalid)(e)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="wz-start" label={t.startDate} error={errors.startDate?.message} required>
          <Input type="date" min={todayIn(originZone)} {...register('startDate')} />
        </Field>
        <Field id="wz-end" label={t.endDate} hint={t.endDateHint} error={errors.endDate?.message} required={false}>
          <Input type="date" {...register('endDate')} />
        </Field>
      </div>

      {values.endDate ? (
        <fieldset className="rounded border-2 border-border p-4">
          <legend className="px-2 font-bold">{t.days}</legend>
          <div className="flex flex-wrap gap-x-6">
            {t.dayNames.map((name, i) => (
              <Controller
                key={name}
                control={control}
                name={`days.${i}` as `days.${number}`}
                render={({ field }) => <Checkbox ref={field.ref} label={name} checked={field.value === true} onCheckedChange={(v) => field.onChange(v === true)} />}
              />
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="wz-dep" label={t.depTime} hint={fmt(t.depTimeHint, { airport: state.origin, zone: zoneLabel(originZone) })} error={errors.depTime?.message} required>
          <Input type="time" {...register('depTime')} />
        </Field>
        <Field id="wz-arr" label={t.arrTime} hint={fmt(t.arrTimeHint, { airport: state.destination, zone: zoneLabel(destinationZone) })} error={errors.arrTime?.message} required>
          <Input type="time" {...register('arrTime')} />
        </Field>
        <Field id="wz-plus" label={t.arrPlus} required>
          <Select {...register('arrPlus')} options={[{ value: '0', label: t.arrPlus0 }, { value: '1', label: t.arrPlus1 }, { value: '2', label: t.arrPlus2 }]} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="wz-depterm" label={t.depTerminal} error={errors.depTerminal?.message} required={false}>
          <Input {...register('depTerminal')} maxLength={10} autoComplete="off" />
        </Field>
        <Field id="wz-arrterm" label={t.arrTerminal} error={errors.arrTerminal?.message} required={false}>
          <Input {...register('arrTerminal')} maxLength={10} autoComplete="off" />
        </Field>
      </div>

      <p role="status" aria-live="polite" className="rounded border-2 border-primary bg-primary-tint p-4">
        {preview}
      </p>
    </StepFrame>
  );
}
