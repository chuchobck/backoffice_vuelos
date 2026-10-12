import { Page } from '@/app/layout/Page';
import { BookingsScreen } from '@/features/bookings';
import { es } from '@/shared/i18n';

export function BookingsPage() {
  return (
    <Page title={es.bookings.title} lead={es.bookings.lead}>
      <BookingsScreen />
    </Page>
  );
}
