import { Page } from '@/app/layout/Page';
import { FlightWizard } from '@/features/flights-wizard';
import { es } from '@/shared/i18n';

export function CreateFlightPage() {
  return (
    <Page title={es.wizard.title} lead={es.wizard.lead}>
      <FlightWizard />
    </Page>
  );
}
