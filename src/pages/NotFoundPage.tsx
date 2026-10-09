import { Link } from 'react-router-dom';
import { Page } from '@/app/layout/Page';
import { routes } from '@/app/routes';
import { es } from '@/shared/i18n';
import { EmptyState } from '@/shared/ui';

export function NotFoundPage() {
  return (
    <Page title={es.common.notFoundTitle}>
      <EmptyState title={es.common.notFoundTitle} text={es.common.notFoundText} action={<Link to={routes.dashboard()}>{es.common.goHome}</Link>} />
    </Page>
  );
}
