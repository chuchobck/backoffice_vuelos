import { Link } from 'react-router-dom';
import { Page } from '@/app/layout/Page';
import { routes } from '@/app/routes';
import { es } from '@/shared/i18n';
import { Button } from '@/shared/ui';

export function DashboardPage() {
  return (
    <Page
      title={es.dashboard.title}
      lead={es.dashboard.lead}
      actions={
        <Button asChild>
          <Link to={routes.createFlight()}>{es.dashboard.createFlight}</Link>
        </Button>
      }
    >
      <p>{es.dashboard.loadingCounts}</p>
    </Page>
  );
}
