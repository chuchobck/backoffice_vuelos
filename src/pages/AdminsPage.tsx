import { Page } from '@/app/layout/Page';
import { AdminsScreen } from '@/features/admins';
import { useAuth } from '@/features/auth';
import { es } from '@/shared/i18n';

export function AdminsPage() {
  const { user } = useAuth();
  return (
    <Page title={es.entities.admins.title} lead={es.entities.admins.lead}>
      <AdminsScreen currentUserId={user?.id} />
    </Page>
  );
}
