import type { BookingStatus, BookingTicket } from '@/shared/api';
import { es } from '@/shared/i18n';

export type Tone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export const STATUS_TONE: Record<BookingStatus, Tone> = {
  PENDING: 'info',
  PENDING_PAYMENT: 'warning',
  TICKET_ISSUING: 'info',
  CONFIRMED: 'success',
  FAILED: 'error',
  CHANGE_PENDING: 'warning',
  CANCELLATION_PENDING: 'warning',
  CANCELLED: 'neutral',
};

export const statusLabel = (status: BookingStatus): string => es.bookings.status[status];

export const ticketStatusLabel = (status: BookingTicket['status']): string => es.bookings.ticketStatus[status];

/** El dueño de una reserva: su correo o, si el core no lo conoce (cuenta que solo existe en identity), el comienzo de su id. */
export const ownerLabel = (owner: { id: string; email: string | null }): string => owner.email ?? `${es.bookings.noOwner} (${owner.id.slice(0, 8)}…)`;

/** Solo una reserva confirmada se puede cancelar (la API responde 409 con cualquier otro estado). */
export const canCancel = (status: BookingStatus): boolean => status === 'CONFIRMED';
