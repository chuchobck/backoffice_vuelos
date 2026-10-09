import { Page } from '@/app/layout/Page';
import { DashboardScreen } from '@/features/dashboard';
import { es } from '@/shared/i18n';

export function DashboardPage() {
  return (
    <Page title={es.dashboard.title} lead={es.dashboard.lead}>
      <DashboardScreen />
    </Page>
  );
}
