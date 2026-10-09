import { Page } from '@/app/layout/Page';
import { CountriesScreen } from '@/features/countries';
import { es } from '@/shared/i18n';

export function CountriesPage() {
  return (
    <Page title={es.entities.countries.title} lead={es.entities.countries.lead}>
      <CountriesScreen />
    </Page>
  );
}
