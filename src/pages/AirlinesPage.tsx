import { Page } from '@/app/layout/Page';
import { AirlinesScreen } from '@/features/airlines';
import { es } from '@/shared/i18n';

export function AirlinesPage() {
  return (
    <Page title={es.entities.airlines.title} lead={es.entities.airlines.lead}>
      <AirlinesScreen />
    </Page>
  );
}
