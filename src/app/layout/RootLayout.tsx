import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ServerWakingNotice, Toaster } from '@/shared/ui';
import { Header } from './Header';
import { SessionNotices } from './SessionNotices';
import { focusElement, MAIN_ID, SkipLink } from './SkipLink';
import { SidebarNav } from './SidebarNav';

/** Al navegar dentro de la SPA el foco va al h1 de la nueva página; en la primera carga no se mueve. */
function useRouteFocus() {
  const location = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      focusElement(document.querySelector<HTMLElement>(`#${MAIN_ID} h1`));
    });
    return () => cancelAnimationFrame(id);
  }, [location.pathname, location.search]);
}

/** Estructura de las pantallas con sesión: barra superior, barra lateral fija (escritorio) y contenido. */
export function RootLayout() {
  useRouteFocus();
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <Header />
      <ServerWakingNotice />
      <SessionNotices />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 bg-sidebar text-sidebar-foreground lg:block">
          <div className="sticky top-14 max-h-[calc(100dvh-3.5rem)] overflow-y-auto">
            <SidebarNav />
          </div>
        </aside>
        <main id={MAIN_ID} tabIndex={-1} className="min-w-0 flex-1 outline-none">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
