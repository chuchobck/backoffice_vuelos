import { Home, RefreshCw } from 'lucide-react';
import { es } from '@/shared/i18n';
import { usePageTitle } from '@/shared/lib/usePageTitle';
import { routes } from '../routes';

/**
 * Último recurso si una página falla al renderizar. No depende del router ni de los proveedores
 * (pueden ser la causa del fallo), por eso usa enlaces y estilos simples.
 */
export function RouteErrorPage() {
  usePageTitle(es.states.errorTitle);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <h1>{es.states.errorTitle}</h1>
      <p className="text-lg">{es.errors.unknown}</p>
      <div className="flex flex-wrap justify-center gap-4">
        <button type="button" onClick={() => window.location.reload()} className="inline-flex min-h-12 items-center gap-2 rounded border-2 border-primary bg-primary px-6 font-bold text-primary-foreground">
          <RefreshCw aria-hidden="true" className="size-6" />
          {es.common.retry}
        </button>
        <a href={routes.home()} className="inline-flex min-h-12 items-center gap-2 rounded border-2 border-primary px-6 font-bold no-underline">
          <Home aria-hidden="true" className="size-6" />
          {es.common.goHome}
        </a>
      </div>
    </main>
  );
}
