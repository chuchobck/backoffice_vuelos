import { ChevronLeft, ChevronRight } from 'lucide-react';
import { es, fmt } from '@/shared/i18n';
import { Button } from '@/shared/ui';

interface Props {
  /** Página actual, desde 0. */
  page: number;
  hasNext: boolean;
  /** Total de páginas, si se conoce (modo "todas las páginas"). */
  totalPages?: number;
  onPrevious: () => void;
  onNext: () => void;
}

/** Paginación por cursor: solo se sabe si hay una siguiente (la API no cuenta el total). */
export function ResourcePager({ page, hasNext, totalPages, onPrevious, onNext }: Props) {
  const label = totalPages ? fmt(es.table.pageOfTotal, { page: page + 1, total: totalPages }) : hasNext ? fmt(es.table.page, { page: page + 1 }) : fmt(es.table.pageLast, { page: page + 1 });
  return (
    <nav aria-label={es.a11y.pagination} className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page === 0} onClick={onPrevious}>
          <ChevronLeft aria-hidden="true" />
          {es.table.previous}
        </Button>
        <Button variant="secondary" disabled={!hasNext} onClick={onNext}>
          {es.table.next}
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
      <p className="text-sm text-muted" aria-live="polite">
        {label}
      </p>
    </nav>
  );
}
