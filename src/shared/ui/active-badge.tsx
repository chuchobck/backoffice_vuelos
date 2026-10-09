import { es } from '@/shared/i18n';
import { Badge } from './badge';

/** Estado de un registro: icono + texto (nunca solo color). */
export function ActiveBadge({ active, label }: { active: boolean; label?: string }) {
  return <Badge tone={active ? 'success' : 'neutral'}>{label ?? (active ? es.common.active : es.common.inactive)}</Badge>;
}
