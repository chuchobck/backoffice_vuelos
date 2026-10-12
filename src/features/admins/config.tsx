import type { ResourceConfig } from '@/shared/crud';
import { es } from '@/shared/i18n';
import { ActiveBadge } from '@/shared/ui';
import { AdminCreateSchema, type AdminValues } from './schemas';

const t = es.entities.admins;

/**
 * Administradores (/admin/users). La API solo lista, crea y da de baja: sin edición ni reactivación.
 * `currentUserId` es el `sub` de quien está conectado: su propia fila no se puede dar de baja.
 */
export function adminsConfig(currentUserId: string | undefined): ResourceConfig<'admins', AdminValues> {
  return {
    resource: 'admins',
    noun: t.noun,
    title: t.title,
    idOf: (a) => a.id,
    displayOf: (a) => a.email,
    isActive: (a) => a.active,
    noEdit: true,
    noReactivate: true,
    note: t.note,
    deactivateBlocked: (a) => (a.id === currentUserId ? t.selfBlocked : null),
    deactivation: { label: es.crud.deactivate, title: t.deactivateTitle, text: t.deactivateText },
    columns: [
      {
        id: 'email',
        header: t.cols.email,
        cell: (a) => (
          <span className="break-all">
            {a.email}
            {a.id === currentUserId ? <span className="ml-2 rounded-sm bg-primary-tint px-1 text-xs font-bold">{t.you}</span> : null}
          </span>
        ),
        sortValue: (a) => a.email,
      },
      { id: 'createdAt', header: t.cols.createdAt, cell: (a) => new Date(a.createdAt).toLocaleDateString('es-EC', { dateStyle: 'medium' }), sortValue: (a) => a.createdAt },
      { id: 'state', header: es.common.state, cell: (a) => <ActiveBadge active={a.active} />, sortValue: (a) => (a.active ? 0 : 1) },
    ],
    searchText: (a) => a.email,
    form: {
      fields: [
        { kind: 'text', name: 'email', label: t.fields.email, inputMode: 'email', maxLength: 254, autoComplete: 'off' },
        { kind: 'text', name: 'password', label: t.fields.password, hint: t.fieldHints.password, inputType: 'password', maxLength: 128, autoComplete: 'new-password' },
      ],
      createSchema: AdminCreateSchema as never,
      editSchema: AdminCreateSchema as never,
      defaults: () => ({ email: '', password: '' }),
      toCreate: (v) => ({ email: v.email, password: v.password }),
      toUpdate: () => null,
    },
  };
}
