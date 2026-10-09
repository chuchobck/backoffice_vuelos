import { Hourglass } from 'lucide-react';
import { useServerWaking } from '@/shared/api';
import { es } from '@/shared/i18n';

/**
 * Aviso no bloqueante cuando el servidor tarda en responder (arranque en frío de Render).
 * La región aria-live existe siempre, así el lector de pantalla anuncia el texto cuando aparece.
 */
export function ServerWakingNotice() {
  const waking = useServerWaking();
  return (
    <div aria-live="polite" aria-atomic="true">
      {waking ? (
        <p className="flex items-center gap-2 px-4 py-2 font-bold text-foreground sm:px-6 lg:px-8">
          <Hourglass aria-hidden="true" className="size-5 shrink-0 text-primary motion-safe:animate-pulse" />
          {es.server.waking}
        </p>
      ) : null}
    </div>
  );
}
