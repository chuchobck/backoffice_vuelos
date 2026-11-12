import { useId } from 'react';
import { es, fmt } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';

interface Props {
  label: string;
  value: number;
  total: number;
  className?: string;
}

/**
 * Barra de avance accesible: el valor SIEMPRE va también en texto ("40 de 120 (33 %)"), nunca solo en el largo ni el color
 * de la barra. Con `role="progressbar"` y sus valores para los lectores de pantalla.
 */
export function ProgressMeter({ label, value, total, className }: Props) {
  const labelId = useId();
  const percent = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  const text = fmt(es.boarding.counts.progress, { value, total, percent });
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span id={labelId} className="font-bold">{label}</span>
        <span className="tabular-nums">{text}</span>
      </div>
      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={Math.min(value, total)}
        aria-valuetext={text}
        className="h-3 w-full overflow-hidden rounded-full border-2 border-input bg-background"
      >
        <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
