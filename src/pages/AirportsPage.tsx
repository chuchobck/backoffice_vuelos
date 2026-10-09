import { Page } from '@/app/layout/Page';
import { AirportsScreen } from '@/features/airports';
import { es } from '@/shared/i18n';

export function AirportsPage() {
  return (
    <Page title={es.entities.airports.title} lead={es.entities.airports.lead}>
      <AirportsScreen />
    </Page>
  );
}
