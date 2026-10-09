import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { es } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { SidebarNav } from './SidebarNav';

/**
 * Menú desplegable para pantallas pequeñas. Es un diálogo modal (Radix): atrapa el foco al abrirse,
 * se cierra con Esc o con el botón de 48 px y devuelve el foco al botón "Menú".
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-hover lg:hidden" aria-label={es.a11y.openMenu}>
          <Menu aria-hidden="true" />
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay/60 animate-fade-in lg:hidden" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="sidebar-scope fixed inset-y-0 left-0 z-50 flex w-72 max-w-[calc(100vw-3rem)] flex-col overflow-y-auto bg-sidebar text-sidebar-foreground shadow-raised animate-slide-up lg:hidden"
        >
          <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-2">
            <DialogPrimitive.Title className="text-lg font-bold text-sidebar-foreground">{es.layout.menuTitle}</DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label={es.a11y.closeMenu} className="text-sidebar-foreground hover:bg-sidebar-active">
                <X aria-hidden="true" />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
