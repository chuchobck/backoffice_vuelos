import { Page } from '@/app/layout/Page';
import { BoardingScreen } from '@/features/embarque';
import { es } from '@/shared/i18n';

export function BoardingPage() {
  return (
    <Page title={es.boarding.title} lead={es.boarding.lead}>
      <BoardingScreen />
    </Page>
  );
}
