import { Page } from '@/app/layout/Page';
import { AuditScreen } from '@/features/audit';
import { es } from '@/shared/i18n';

export function AuditPage() {
  return (
    <Page title={es.audit.title} lead={es.audit.lead}>
      <AuditScreen />
    </Page>
  );
}
