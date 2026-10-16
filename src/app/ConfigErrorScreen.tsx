import { TriangleAlert } from 'lucide-react';
import type { ConfigIssue } from '@/shared/api';
import { es } from '@/shared/i18n';

const t = es.config;

const EXAMPLE = `window.BACKOFFICE_CONFIG = {
  API_URL: "https://<gateway>/flights/v1"
  // IDENTITY_URL: "https://<gateway>/identity/v1"   (opcional: se deriva de API_URL)
};`;

/**
 * Se muestra en lugar de la aplicación cuando `config.js` es inválido. No usa red, sesión ni rutas:
 * solo dice qué está mal y cómo arreglarlo.
 */
export function ConfigErrorScreen({ issues }: { issues: ConfigIssue[] }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-prose flex-col gap-4 px-4 py-10">
      <h1 className="flex items-center gap-2 text-2xl">
        <TriangleAlert aria-hidden="true" className="size-7 text-error" />
        {t.title}
      </h1>
      <p>{t.lead}</p>
      <ul role="alert" className="flex flex-col gap-3 rounded border-2 border-error bg-error-tint p-4">
        {issues.map((issue) => (
          <li key={issue.code}>
            <p className="font-bold">{t.issues[issue.code]}</p>
            {issue.value !== undefined ? (
              <p className="text-sm">
                {t.valueLabel}: <code className="break-all font-mono">{issue.value}</code>
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <section aria-labelledby="config-how" className="flex flex-col gap-2">
        <h2 id="config-how" className="text-xl">{t.howTitle}</h2>
        <p>{t.how}</p>
        <pre className="overflow-x-auto rounded border border-border bg-surface p-3 text-sm"><code>{EXAMPLE}</code></pre>
      </section>
    </main>
  );
}
