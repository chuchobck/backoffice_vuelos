import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { usePageTitle } from '@/shared/lib/usePageTitle';
import { Breadcrumbs } from './Breadcrumbs';

interface PageProps {
  /** Título de la pestaña y texto del único h1 de la página. */
  title: string;
  lead?: ReactNode;
  /** Contenido a la derecha del encabezado (p. ej. el botón "Nuevo"). */
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Esqueleto de toda página interna: migas, un solo h1 (recibe el foco al cambiar de ruta) y contenido. */
export function Page({ title, lead, actions, className, children }: PageProps) {
  usePageTitle(title);
  return (
    <div className={cn('flex flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8', className)}>
      <Breadcrumbs />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1>{title}</h1>
          {lead ? <p className="text-muted">{lead}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
