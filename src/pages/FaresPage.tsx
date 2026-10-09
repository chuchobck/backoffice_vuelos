import { Page } from '@/app/layout/Page';
import { FaresScreen } from '@/features/fares';
import { es } from '@/shared/i18n';

export function FaresPage() {
  return (
    <Page title={es.entities.fares.title} lead={es.entities.fares.lead}>
      <FaresScreen />
    </Page>
  );
}
