import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useAllItems } from '@/shared/api';
import { es } from '@/shared/i18n';
import { useErrorSummary } from '@/shared/lib/useErrorSummary';
import { Alert, ErrorState, Field, LoadingState, Select } from '@/shared/ui';
import { RouteSchema, type RouteValues } from './schemas';
import type { StepProps } from './StepProps';
import { StepFrame } from './StepFrame';

const t = es.wizard.route;

/** Paso 1: origen y destino del catálogo de aeropuertos (distintos entre sí). */
export function StepRoute({ state, onNext }: StepProps) {
  const airports = useAllItems('airports');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitted },
  } = useForm<RouteValues>({ resolver: zodResolver(RouteSchema), defaultValues: { origin: state.origin, destination: state.destination }, mode: 'onTouched' });
  const { summary, summaryRef, onInvalid } = useErrorSummary<RouteValues>(
    { origin: { id: 'wz-origin', label: t.origin }, destination: { id: 'wz-destination', label: t.destination } },
    errors,
    isSubmitted,
  );

  if (airports.isLoading) return <LoadingState skeletons={2} />;
  if (airports.error) return <ErrorState error={airports.error} onRetry={() => void airports.refetch()} />;

  const options = (airports.data?.items ?? []).map((a) => ({ value: a.code, label: `${a.code} — ${a.name} (${a.cityName})` }));
  return (
    <StepFrame step={0} intro={t.intro} summary={summary} summaryRef={summaryRef} onSubmit={(e) => void handleSubmit((v) => onNext({ origin: v.origin, destination: v.destination }), onInvalid)(e)}>
      {options.length === 0 ? <Alert variant="warning"><p>{t.noAirports}</p></Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="wz-origin" label={t.origin} error={errors.origin?.message} required>
          <Select {...register('origin')} options={options} placeholder={es.common.choose} />
        </Field>
        <Field id="wz-destination" label={t.destination} error={errors.destination?.message} required>
          <Select {...register('destination')} options={options} placeholder={es.common.choose} />
        </Field>
      </div>
    </StepFrame>
  );
}
