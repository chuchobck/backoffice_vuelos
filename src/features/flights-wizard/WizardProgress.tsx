import { Check } from 'lucide-react';
import { es, fmt } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';

/** Indicador de progreso: lista ordenada, el paso actual lleva aria-current="step". */
export function WizardProgress({ current }: { current: number }) {
  const steps = es.wizard.steps;
  return (
    <ol aria-label={es.a11y.progress} className="grid gap-2 sm:grid-cols-5">
      {steps.map((name, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={name}
            aria-current={active ? 'step' : undefined}
            className={cn(
              'flex min-h-11 items-center gap-2 rounded border-2 px-3 py-1 text-sm',
              active ? 'border-primary bg-primary-tint font-bold' : 'border-border bg-surface',
            )}
          >
            <span
              aria-hidden="true"
              className={cn('flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold', done ? 'bg-success text-success-foreground' : active ? 'bg-primary text-primary-foreground' : 'bg-border text-foreground')}
            >
              {done ? <Check className="size-4" /> : i + 1}
            </span>
            <span>
              <span className="sr-only">{done ? es.a11y.stepDone : active ? es.a11y.stepCurrent : es.a11y.stepPending}: </span>
              {name}
            </span>
          </li>
        );
      })}
      <li className="sr-only" aria-live="polite">
        {fmt(es.wizard.stepAnnounce, { n: current + 1, total: steps.length, name: steps[current] ?? '' })}
      </li>
    </ol>
  );
}
