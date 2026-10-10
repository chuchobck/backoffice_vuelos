import { Link, useLocation } from 'react-router-dom';
import { es } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { isNavItemActive, NAV_GROUPS } from './nav-items';

/** Navegación principal con grupos. La usan la barra lateral fija (escritorio) y el menú móvil. */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  return (
    <nav aria-label={es.a11y.mainNav} className="sidebar-scope flex flex-col gap-6 py-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="px-4 text-xs font-bold uppercase tracking-wide text-sidebar-muted">{group.label}</p>
          <ul className="flex flex-col">
            {group.items.map((item) => {
              const active = isNavItemActive(item, pathname);
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-11 items-center gap-3 border-l-4 px-4 py-1 text-sm font-medium text-sidebar-foreground no-underline hover:bg-sidebar-active',
                      active ? 'border-focus bg-sidebar-active font-bold' : 'border-transparent',
                    )}
                  >
                    <Icon aria-hidden="true" className="size-5 shrink-0" />
                    <span className="min-w-0 flex-1">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
