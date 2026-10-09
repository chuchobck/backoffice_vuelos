import { LogOut, Plane } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { useIsDemo } from '@/shared/api';
import { es } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { routes } from '../routes';
import { MobileMenu } from './MobileMenu';
import { ThemeToggle } from './ThemeToggle';

/** Barra superior fija: marca, insignia de modo demo, usuario y cierre de sesión. */
export function Header() {
  const { user, logout } = useAuth();
  const demo = useIsDemo();
  const navigate = useNavigate();
  return (
    <header className="sidebar-scope sticky top-0 z-40 flex min-h-14 flex-wrap items-center gap-2 bg-primary px-4 py-1 text-primary-foreground dark:bg-sidebar dark:text-sidebar-foreground">
      <MobileMenu />
      <p className="flex items-center gap-2 text-lg font-bold">
        <Plane aria-hidden="true" className="size-6" />
        <span>{es.app.name}</span>
      </p>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {demo ? <span className="rounded-full bg-warning-tint px-3 py-1 text-xs font-bold text-warning">{es.demo.badge}</span> : null}
        {user ? <span className="hidden max-w-60 truncate text-sm sm:inline" title={user.email}>{user.email}</span> : null}
        <ThemeToggle />
        {user ? (
          <Button
            variant="ghost"
            className="min-h-11 px-3 text-primary-foreground hover:bg-primary-hover dark:text-sidebar-foreground"
            onClick={() => {
              void logout().then(() => navigate(routes.login()));
            }}
          >
            <LogOut aria-hidden="true" className="size-5" />
            <span className="hidden sm:inline">{es.nav.logout}</span>
            <span className="sr-only sm:hidden">{es.nav.logout}</span>
          </Button>
        ) : null}
      </div>
    </header>
  );
}
