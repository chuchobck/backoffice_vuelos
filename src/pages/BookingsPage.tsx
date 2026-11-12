import { useSearchParams } from 'react-router-dom';
import { Page } from '@/app/layout/Page';
import { PNR_PARAM } from '@/app/routes';
import { BookingsScreen } from '@/features/bookings';
import { es } from '@/shared/i18n';

/** Un PNR son 6 letras o dígitos; cualquier otra cosa en `?pnr=` se ignora. */
const PNR = /^[A-Za-z0-9]{6}$/;

export function BookingsPage() {
  const [params] = useSearchParams();
  const raw = params.get(PNR_PARAM);
  const pnr = raw && PNR.test(raw) ? raw.toUpperCase() : undefined;
  return (
    <Page title={es.bookings.title} lead={es.bookings.lead}>
      <BookingsScreen key={pnr ?? 'all'} initialPnr={pnr} />
    </Page>
  );
}
