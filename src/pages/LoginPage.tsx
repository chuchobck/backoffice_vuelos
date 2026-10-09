import { Plane } from 'lucide-react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { SkipLink } from '@/app/layout/SkipLink';
import { routes, RETURN_TO_PARAM, safeReturnTo } from '@/app/routes';
import { LoginForm, useAuth } from '@/features/auth';
import { es } from '@/shared/i18n';
import { usePageTitle } from '@/shared/lib/usePageTitle';
import { LoadingState } from '@/shared/ui';

/** Pantalla de ingreso, sin barra lateral. Con sesión activa lleva a donde se quería ir (`?volver=`). */
export function LoginPage() {
  usePageTitle(es.auth.title);
  const { status } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const target = safeReturnTo(params.get(RETURN_TO_PARAM)) ?? routes.dashboard();

  if (status === 'restoring') return <LoadingState label={es.session.restoring} className="p-8" />;
  if (status === 'authenticated') return <Navigate to={target} replace />;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-primary px-4 py-8 dark:bg-sidebar">
      <SkipLink />
      <main id="contenido" tabIndex={-1} className="flex w-full max-w-md flex-col gap-6 rounded border-2 border-border bg-surface p-6 shadow-raised">
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 font-bold text-primary">
            <Plane aria-hidden="true" className="size-6" />
            {es.app.name}
          </p>
          <h1>{es.auth.title}</h1>
          <p className="text-muted">{es.auth.lead}</p>
        </div>
        <LoginForm onSuccess={() => navigate(target, { replace: true })} />
      </main>
    </div>
  );
}
