import { Page } from '@/app/layout/Page';
import { FareFamiliesScreen } from '@/features/fare-families';
import { es } from '@/shared/i18n';

export function FareFamiliesPage() {
  return (
    <Page title={es.entities.fareFamilies.title} lead={es.entities.fareFamilies.lead}>
      <FareFamiliesScreen />
    </Page>
  );
}
