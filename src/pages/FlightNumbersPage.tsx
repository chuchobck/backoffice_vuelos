import { Page } from '@/app/layout/Page';
import { FlightNumbersScreen } from '@/features/flight-numbers';
import { es } from '@/shared/i18n';

export function FlightNumbersPage() {
  return (
    <Page title={es.entities.flightNumbers.title} lead={es.entities.flightNumbers.lead}>
      <FlightNumbersScreen />
    </Page>
  );
}
