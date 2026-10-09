import type { FormDialogProps } from '@/shared/crud';
import { es } from '@/shared/i18n';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui';
import { SeatMapCreateForm } from './SeatMapCreateForm';

/** Diálogo de alta de un mapa de asientos. El formulario se monta al abrirlo, siempre con valores nuevos. */
export function SeatMapCreateDialog({ open, onOpenChange, onSaved }: FormDialogProps<'seatMaps'>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-w-[48rem]">
        <DialogTitle>{es.entities.seatMaps.create.title}</DialogTitle>
        <DialogDescription className="sr-only">{es.entities.seatMaps.create.title}</DialogDescription>
        <SeatMapCreateForm onOpenChange={onOpenChange} onSaved={onSaved} />
      </DialogContent>
    </Dialog>
  );
}
