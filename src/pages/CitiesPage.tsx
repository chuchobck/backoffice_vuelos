import { Page } from '@/app/layout/Page';
import { CitiesScreen } from '@/features/cities';
import { es } from '@/shared/i18n';

export function CitiesPage() {
  return (
    <Page title={es.entities.cities.title} lead={es.entities.cities.lead}>
      <CitiesScreen />
    </Page>
  );
}
