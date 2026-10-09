import { ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { es } from '@/shared/i18n';
import { routes } from '../routes';
import { findNav } from './nav-items';

/** Migas de pan: Inicio › Grupo › Pantalla. La última es la página actual. */
export function Breadcrumbs() {
  const { pathname } = useLocation();
  const found = findNav(pathname);
  if (!found) return null;
  const trail = [
    { label: es.layout.home, to: routes.dashboard() },
    ...(found.group.items[0] === found.item && found.group.label === es.nav.general ? [] : [{ label: found.group.label }]),
    { label: found.item.label, current: true },
  ];
  return (
    <nav aria-label={es.a11y.breadcrumb}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
        {trail.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight aria-hidden="true" className="size-4" /> : null}
            {'to' in c && c.to ? (
              <Link to={c.to} className="-mx-2 inline-flex min-h-11 items-center px-2">{c.label}</Link>
            ) : (
              <span aria-current={'current' in c && c.current ? 'page' : undefined} className={'current' in c && c.current ? 'font-bold text-foreground' : undefined}>
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
