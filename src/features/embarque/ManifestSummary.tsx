import type { BoardingManifest } from '@/shared/api';
import { es, fmt } from '@/shared/i18n';
import { DepartureStatusBadge, LoadingState, ProgressMeter } from '@/shared/ui';

const t = es.boarding;

/** Encabezado de la salida (vuelo, ruta, estado, puerta) y el avance del embarque con barras que también dicen el valor en texto. */
export function ManifestSummary({ manifest, loading }: { manifest: BoardingManifest | undefined; loading: boolean }) {
  if (!manifest) return loading ? <LoadingState label={t.summary.loading} skeletons={2} /> : null;
  const { counts } = manifest;
  return (
    <section aria-labelledby="gate-summary" className="flex flex-col gap-4 rounded border-2 border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <h2 id="gate-summary" className="text-2xl">
          <span className="font-mono">{fmt(t.summary.title, { flight: manifest.flightNumber })}</span>
          <span className="sr-only">. </span>
          <span className="ml-3 text-lg font-normal">{fmt(t.summary.route, { origin: manifest.origin, destination: manifest.destination })}</span>
        </h2>
        <dl className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <dt className="font-bold">{t.summary.date}</dt>
            <dd><time dateTime={manifest.date}>{manifest.date}</time></dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="font-bold">{t.summary.status}</dt>
            <dd><DepartureStatusBadge status={manifest.status} /></dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="font-bold">{t.summary.gate}</dt>
            <dd>{manifest.gate ?? t.summary.noGate}</dd>
          </div>
        </dl>
      </div>

      <h3 className="text-lg">{t.counts.title}</h3>
      <p className="text-2xl font-bold tabular-nums">
        {t.counts.sold}: {counts.sold}
        <span className="sr-only"> — {fmt(t.counts.soldValue, { count: counts.sold })}</span>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <ProgressMeter label={t.counts.checkedIn} value={counts.checkedIn} total={counts.sold} />
        <ProgressMeter label={t.counts.boarded} value={counts.boarded} total={counts.sold} />
        {counts.infants.sold > 0 ? (
          <>
            <ProgressMeter label={t.counts.infantsCheckedIn} value={counts.infants.checkedIn} total={counts.infants.sold} />
            <ProgressMeter label={t.counts.infantsBoarded} value={counts.infants.boarded} total={counts.infants.sold} />
          </>
        ) : null}
      </div>
      {counts.infants.sold > 0 ? <p className="text-sm text-muted">{t.counts.infants}: {counts.infants.sold}</p> : null}
    </section>
  );
}
