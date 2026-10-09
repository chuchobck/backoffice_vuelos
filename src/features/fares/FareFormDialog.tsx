import type { FormDialogProps } from '@/shared/crud';
import { es, fmt } from '@/shared/i18n';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui';
import { FareForm } from './FareForm';

const f = es.entities.fares.form;

/** Diálogo de alta y edición de una tarifa (POST/PATCH /admin/fares). El formulario se monta al abrirlo. */
export function FareFormDialog({ item, open, onOpenChange, onSaved }: FormDialogProps<'fares'>) {
  const title = item ? fmt(f.editTitle, { id: item.id }) : f.createTitle;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-w-[44rem]">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="sr-only">{title}</DialogDescription>
        <FareForm key={item?.id ?? 'new'} item={item} onOpenChange={onOpenChange} onSaved={onSaved} />
      </DialogContent>
    </Dialog>
  );
}
