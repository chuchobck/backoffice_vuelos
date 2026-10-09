import { useEffect, useRef, type FormEvent, type ReactNode } from 'react';
import { es, fmt } from '@/shared/i18n';
import type { SummaryError } from '@/shared/ui';
import { Button, ErrorSummary } from '@/shared/ui';

interface StepFrameProps {
  step: number;
  intro: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** Guarda lo escrito sin validar y vuelve al paso anterior. */
  onBack?: () => void;
  summary: SummaryError[];
  summaryRef: React.Ref<HTMLDivElement>;
  /** Texto del botón principal (por defecto "Siguiente"). */
  nextLabel?: string;
  busy?: boolean;
  children: ReactNode;
}

/** Marco común de un paso: título (recibe el foco al llegar), resumen de errores, contenido y botones. */
export function StepFrame({ step, intro, onSubmit, onBack, summary, summaryRef, nextLabel = es.common.next, busy = false, children }: StepFrameProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4 rounded border-2 border-border bg-surface p-4 sm:p-6">
      <h2 ref={heading} tabIndex={-1} className="text-xl outline-none">
        {fmt(es.wizard.stepHeading, { n: step + 1, name: es.wizard.steps[step] ?? '' })}
      </h2>
      <p className="text-muted">{intro}</p>
      <ErrorSummary ref={summaryRef} errors={summary} />
      {children}
      <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        {onBack ? (
          <Button variant="secondary" onClick={onBack}>
            {es.common.back}
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" loading={busy}>
          {nextLabel}
        </Button>
      </div>
    </form>
  );
}
