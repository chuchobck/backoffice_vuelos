import { Hourglass } from 'lucide-react';
import { es } from '@/shared/i18n';
import { Alert, Card, CardTitle } from '@/shared/ui';

export type PendingKind = 'bookings' | 'audit' | 'admins';

/**
 * Pantalla de una función que la API no tiene: explica por qué y deja escrita la especificación de
 * los endpoints que haría falta agregar al backend. No simula datos.
 */
export function PendingScreen({ kind }: { kind: PendingKind }) {
  const p = es.pending;
  const content = p[kind];
  return (
    <div className="flex flex-col gap-4">
      <Alert variant="warning" title={p.badge} live="off">
        <p>{p.notSimulated}</p>
      </Alert>
      <Card className="flex flex-col gap-3">
        <CardTitle as="h2" className="flex items-center gap-2">
          <Hourglass aria-hidden="true" className="size-6 text-warning" />
          {p.reasonTitle}
        </CardTitle>
        <p>{content.reason}</p>
      </Card>
      <Card className="flex flex-col gap-3">
        <CardTitle as="h2">{p.specTitle}</CardTitle>
        <div className="relative overflow-x-auto" tabIndex={0} role="region" aria-label={p.specTitle}>
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-primary-tint text-foreground">
                <th scope="col" className="px-3 py-2">{p.colMethod}</th>
                <th scope="col" className="px-3 py-2">{p.colPath}</th>
                <th scope="col" className="px-3 py-2">{p.colPurpose}</th>
              </tr>
            </thead>
            <tbody>
              {content.endpoints.map((e) => (
                <tr key={`${e.method} ${e.path}`} className="border-t border-border align-top">
                  <td className="px-3 py-2 font-mono font-bold">{e.method}</td>
                  <td className="px-3 py-2 font-mono break-all">{e.path}</td>
                  <td className="px-3 py-2">{e.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted">{p.scopeNote}</p>
      </Card>
    </div>
  );
}
