import { Inbox, RefreshCw, XCircle } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { errorMessage, isApiError } from '@/shared/api';
import { es, fmt } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { Button } from './button';
import { Skeleton } from './skeleton';
import { Spinner } from './spinner';

/** Estado de carga: texto anunciado con role="status" + esqueletos decorativos opcionales. */
export function LoadingState({ label = es.a11y.loading, skeletons = 0, className }: { label?: string; skeletons?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <p role="status" className="flex items-center gap-2 font-bold text-muted">
        <Spinner />
        {label}
      </p>
      {Array.from({ length: skeletons }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  text,
  action,
  icon,
  headingLevel = 'h2',
  className,
}: {
  title: string;
  text?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  headingLevel?: 'h2' | 'h3';
  className?: string;
}) {
  const Heading = headingLevel;
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded border-2 border-dashed border-input bg-surface px-6 py-12 text-center', className)}>
      <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-primary-tint text-primary">
        {icon ?? <Inbox className="size-7" />}
      </span>
      <Heading className="text-xl">{title}</Heading>
      {text ? <p className="text-muted">{text}</p> : null}
      {action ? <div className="flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

/**
 * Estado de error con mensaje en lenguaje del usuario (qué pasó y qué hacer) y botón para reintentar.
 * role="alert" para que se anuncie al aparecer.
 */
export function ErrorState({
  error,
  title = es.states.errorTitle,
  onRetry,
  action,
  headingLevel = 'h2',
  className,
}: {
  error?: unknown;
  title?: string;
  onRetry?: () => void;
  action?: ReactNode;
  headingLevel?: 'h2' | 'h3';
  className?: string;
}) {
  const Heading = headingLevel;
  const apiError = isApiError(error) ? error : undefined;
  // 429 y 503 con Retry-After: el botón se habilita cuando pasa el tiempo indicado.
  const waitSeconds = apiError && (apiError.status === 429 || apiError.status === 503) ? (apiError.retryAfter ?? 0) : 0;
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-3 rounded border-2 border-error bg-error-tint px-6 py-10 text-center', className)}>
      <XCircle aria-hidden="true" className="size-10 text-error" />
      <Heading className="text-xl">{title}</Heading>
      <p>{errorMessage(error)}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {onRetry && apiError?.code !== 'NOT_CONNECTED' ? <RetryButton onRetry={onRetry} waitSeconds={waitSeconds} /> : null}
        {action}
      </div>
    </div>
  );
}

/** Reintentar; si la API pidió esperar (Retry-After), se habilita al terminar la cuenta. */
export function RetryButton({ onRetry, waitSeconds, label = es.common.retry }: { onRetry: () => void; waitSeconds: number; label?: string }) {
  const [left, setLeft] = useState(waitSeconds);
  useEffect(() => {
    setLeft(waitSeconds);
    if (waitSeconds <= 0) return;
    const id = setInterval(() => setLeft((s) => (s <= 1 ? (clearInterval(id), 0) : s - 1)), 1000);
    return () => clearInterval(id);
  }, [waitSeconds]);
  return (
    <div className="flex flex-col items-center gap-2">
      <Button variant="primary" onClick={onRetry} disabled={left > 0} aria-describedby={left > 0 ? 'retry-wait' : undefined}>
        <RefreshCw aria-hidden="true" />
        {label}
      </Button>
      {left > 0 ? (
        <p id="retry-wait" className="text-sm tabular-nums">
          {fmt(es.errors.retryIn, { seconds: left })}
        </p>
      ) : null}
    </div>
  );
}
