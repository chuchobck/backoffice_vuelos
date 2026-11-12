import { useMemo, useState } from 'react';
import { useAirportZones, useAllItems } from '@/shared/api';
import { es, fmt } from '@/shared/i18n';
import { ECUADOR_ZONE, formatLocalTime, todayIn } from '@/shared/lib/dates';
import { Field, Input, LoadingState, Select, ErrorState } from '@/shared/ui';

const t = es.boarding.picker;

interface Props {
  value: string;
  onChange: (departureId: string) => void;
}

/** Elegir la salida: reutiliza la lista de salidas del catálogo, filtrada por el día (hoy por defecto). */
export function DeparturePicker({ value, onChange }: Props) {
  const [date, setDate] = useState(() => todayIn(ECUADOR_ZONE));
  const { zoneOf } = useAirportZones();
  const query = useAllItems('departures', { dateFrom: date, dateTo: date }, !!date);

  const options = useMemo(
    () =>
      [...(query.data?.items ?? [])]
        .sort((a, b) => a.scheduledDeparture.localeCompare(b.scheduledDeparture) || a.flightNumber.localeCompare(b.flightNumber))
        .map((d) => ({
          value: d.id,
          label: fmt(t.option, { flight: d.flightNumber, origin: d.origin, destination: d.destination, time: formatLocalTime(d.scheduledDeparture, zoneOf(d.origin)) }),
        })),
    [query.data, zoneOf],
  );

  return (
    <div className="flex flex-wrap items-start gap-4">
      <Field label={t.date} required className="w-full sm:w-56">
        <Input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            onChange('');
          }}
        />
      </Field>
      <Field label={t.departure} hint={t.hint} required className="w-full min-w-0 sm:flex-1">
        <Select value={value} options={options} placeholder={t.departurePlaceholder} disabled={query.isLoading} onChange={(e) => onChange(e.target.value)} />
      </Field>
      <div className="w-full">
        {query.isLoading ? <LoadingState label={t.loading} /> : null}
        {query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} headingLevel="h2" /> : null}
        {query.isSuccess && options.length === 0 ? <p className="text-muted">{t.none}</p> : null}
      </div>
    </div>
  );
}
