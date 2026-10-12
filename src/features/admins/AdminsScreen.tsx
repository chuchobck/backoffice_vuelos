import { useMemo } from 'react';
import { ResourceScreen } from '@/shared/crud';
import { adminsConfig } from './config';

/** `currentUserId` (el `sub` de la sesión) lo da la página: un módulo de features no importa de otro. */
export function AdminsScreen({ currentUserId }: { currentUserId: string | undefined }) {
  const config = useMemo(() => adminsConfig(currentUserId), [currentUserId]);
  return <ResourceScreen config={config} />;
}
