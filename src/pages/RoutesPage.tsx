import { Page } from '@/app/layout/Page';
import { RoutesScreen } from '@/features/routes';
import { es } from '@/shared/i18n';

export function RoutesPage() {
  return (
    <Page title={es.entities.routes.title} lead={es.entities.routes.lead}>
      <RoutesScreen />
    </Page>
  );
}
