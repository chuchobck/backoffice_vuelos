import { CheckCircle2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '@/app/routes';
import { es, fmt } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import type { ExecutionResult } from './types';

/** Resultado final: identificadores creados y enlace "Ver en la lista" (salidas filtradas por el vuelo). */
export function WizardSuccess({ flightNumber, result, onAnother }: { flightNumber: string; result: ExecutionResult; onAnother: () => void }) {
  const t = es.wizard.success;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <section className="flex flex-col gap-4 rounded border-2 border-l-8 border-success bg-success-tint p-4 sm:p-6" aria-labelledby="wz-success-title">
      <h2 id="wz-success-title" ref={heading} tabIndex={-1} className="flex items-center gap-2 text-xl outline-none">
        <CheckCircle2 aria-hidden="true" className="size-6 text-success" />
        {fmt(t.title, { flight: flightNumber })}
      </h2>
      <p>{fmt(t.text, { count: result.departures.length })}</p>
      <div role="region" aria-label={t.idsCaption} tabIndex={0} className="relative overflow-x-auto rounded border-2 border-border bg-surface">
        <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
          <caption className="sr-only">{t.idsCaption}</caption>
          <thead>
            <tr className="bg-primary-tint">
              <th scope="col" className="px-3 py-2">{t.colDate}</th>
              <th scope="col" className="px-3 py-2">{t.colId}</th>
              <th scope="col" className="px-3 py-2">{t.colFares}</th>
            </tr>
          </thead>
          <tbody>
            {result.departures.map((d) => (
              <tr key={d.date} className="border-t border-border">
                <td className="px-3 py-2">{d.date}</td>
                <td className="px-3 py-2 font-mono break-all">{d.id}</td>
                <td className="px-3 py-2">{Object.keys(d.fares).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to={routes.departures(flightNumber)}>{t.seeInList}</Link>
        </Button>
        <Button variant="secondary" onClick={onAnother}>
          {t.another}
        </Button>
      </div>
    </section>
  );
}
