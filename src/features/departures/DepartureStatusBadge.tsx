import type { Departure } from '@/shared/api';
import { statusLabel } from '@/shared/lib/labels';
import { Badge } from '@/shared/ui';

const TONES = {
  SCHEDULED: 'info',
  BOARDING: 'info',
  DEPARTED: 'neutral',
  DELAYED: 'warning',
  ARRIVED: 'success',
  CANCELLED: 'error',
  DIVERTED: 'warning',
} as const;

export function DepartureStatusBadge({ status }: { status: Departure['status'] }) {
  return <Badge tone={TONES[status]}>{statusLabel(status)}</Badge>;
}
