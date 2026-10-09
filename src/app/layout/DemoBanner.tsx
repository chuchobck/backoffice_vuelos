import { useIsDemo } from '@/shared/api';
import { es } from '@/shared/i18n';

/** Aviso fijo en modo demo: los datos son de ejemplo y no hay llamadas a la API real. */
export function DemoBanner() {
  if (!useIsDemo()) return null;
  return (
    <div role="status" className="border-b-2 border-warning bg-warning-tint px-4 py-2 text-sm text-warning">
      <strong>{es.demo.bannerTitle}</strong> {es.demo.bannerText}
    </div>
  );
}
