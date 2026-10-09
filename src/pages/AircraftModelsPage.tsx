import { Page } from '@/app/layout/Page';
import { AircraftModelsScreen } from '@/features/aircraft-models';
import { es } from '@/shared/i18n';

export function AircraftModelsPage() {
  return (
    <Page title={es.entities.aircraftModels.title} lead={es.entities.aircraftModels.lead}>
      <AircraftModelsScreen />
    </Page>
  );
}
