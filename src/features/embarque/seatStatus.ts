import type { ManifestSeatStatus } from '@/shared/api';

/** Tono de la etiqueta de cada estado del asiento (siempre va con icono y texto, nunca solo color). */
export const SEAT_STATUS_TONE = {
  BOOKED: 'neutral',
  TICKETED: 'neutral',
  CHECKED_IN: 'info',
  BOARDED: 'success',
} as const satisfies Record<ManifestSeatStatus, 'neutral' | 'info' | 'warning' | 'success'>;
