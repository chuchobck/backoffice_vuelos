import { useEffect, useRef, useState } from 'react';
import { errorMessage, useCancelBooking, type BookingSummary } from '@/shared/api';
import { es, fmt } from '@/shared/i18n';
import { Alert, Button, Dialog, DialogContent, DialogDescription, DialogTitle, Field, Input, toast } from '@/shared/ui';

const t = es.bookings;
const MAX_REASON = 500;

interface Props {
  booking: Pick<BookingSummary, 'bookingId' | 'pnr'> | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Confirmación explícita de la cancelación administrativa (WCAG 3.3.4). La Idempotency-Key se genera UNA vez por
 * intento: al abrir el diálogo. Si el envío falla (red, 5xx) y se reintenta, viaja la misma clave y la API repite el
 * resultado en vez de cancelar dos veces; al cerrar y volver a abrir es un intento nuevo, con clave nueva.
 */
export function CancelBookingDialog({ booking, onOpenChange }: Props) {
  const cancel = useCancelBooking();
  const key = useRef<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [tooLong, setTooLong] = useState(false);
  const open = booking !== null;

  useEffect(() => {
    if (open) {
      key.current = crypto.randomUUID();
      setReason('');
      setError(null);
      setTooLong(false);
    } else {
      key.current = null;
    }
  }, [open]);

  const confirm = async () => {
    if (!booking || !key.current) return;
    const text = reason.trim();
    if (text.length > MAX_REASON) {
      setTooLong(true);
      return;
    }
    setError(null);
    try {
      const result = await cancel.mutateAsync({ id: booking.bookingId, key: key.current, reason: text || undefined });
      toast({ title: fmt(result.status === 'CANCELLATION_PENDING' ? t.cancelPending : t.cancelDone, { pnr: booking.pnr }), variant: 'success' });
      onOpenChange(false);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent role="alertdialog" hideClose>
        <DialogTitle>{fmt(t.cancelTitle, { pnr: booking?.pnr ?? '' })}</DialogTitle>
        <DialogDescription>{t.cancelText}</DialogDescription>
        {error ? (
          <Alert variant="error" live="assertive">
            <p>{error}</p>
          </Alert>
        ) : null}
        <Field label={t.cancelReasonLabel} hint={t.cancelReasonHint} error={tooLong && reason.trim().length > MAX_REASON ? t.reasonTooLong : undefined}>
          <Input
            value={reason}
            autoComplete="off"
            onChange={(e) => {
              setReason(e.target.value);
              setTooLong(false);
            }}
          />
        </Field>
        <div className="mt-2 flex flex-col-reverse gap-4 sm:flex-row sm:justify-end">
          {/* El foco inicial va a la opción segura de una acción que no se puede deshacer (alertdialog). */}
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <Button variant="secondary" autoFocus onClick={() => onOpenChange(false)}>
            {es.crud.keep}
          </Button>
          <Button variant="danger" loading={cancel.isPending} loadingText={es.a11y.loading} onClick={() => void confirm()}>
            {t.cancelConfirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
