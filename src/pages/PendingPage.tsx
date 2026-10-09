import { Page } from '@/app/layout/Page';
import { PendingScreen, type PendingKind } from '@/features/pending';
import { es } from '@/shared/i18n';

export function PendingPage({ kind }: { kind: PendingKind }) {
  const c = es.pending[kind];
  return (
    <Page title={c.title} lead={c.lead}>
      <PendingScreen kind={kind} />
    </Page>
  );
}
