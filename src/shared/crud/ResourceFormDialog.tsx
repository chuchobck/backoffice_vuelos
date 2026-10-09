import { useState } from 'react';
import type { FieldValues } from 'react-hook-form';
import { useCreateMutation, useUpdateMutation, errorMessage, type ItemOf, type ResourceName } from '@/shared/api';
import { es, fmt } from '@/shared/i18n';
import { Alert, Dialog, DialogContent, DialogDescription, DialogTitle, toast } from '@/shared/ui';
import { ResourceForm } from './ResourceForm';
import type { ResourceConfig } from './types';

interface Props<N extends ResourceName, V extends FieldValues> {
  config: ResourceConfig<N, V>;
  /** `undefined` = crear; con registro = editar. */
  item?: ItemOf<N>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

/** Diálogo de alta o edición (PATCH parcial). Los errores de la API se muestran dentro, sin perder lo escrito. */
export function ResourceFormDialog<N extends ResourceName, V extends FieldValues>({ config, item, open, onOpenChange, onSaved }: Props<N, V>) {
  const form = config.form;
  const create = useCreateMutation(config.resource, config.invalidates);
  const update = useUpdateMutation(config.resource, config.invalidates);
  const [apiError, setApiError] = useState<unknown>(null);
  if (!form) return null;
  const editing = item !== undefined;
  const fields = form.fields.filter((f) => (editing ? !f.createOnly : true));
  const title = editing ? fmt(es.crud.editTitle, { noun: config.noun, id: config.idOf(item) }) : fmt(es.crud.newTitle, { noun: config.noun });

  const submit = async (values: FieldValues) => {
    setApiError(null);
    try {
      if (editing) {
        const body = form.toUpdate(values as V, item);
        if (!body) {
          toast({ title: es.common.nothingToSave });
          onOpenChange(false);
          return;
        }
        await update.mutateAsync({ id: config.idOf(item), body });
        toast({ title: es.common.changesSaved, variant: 'success' });
      } else {
        await create.mutateAsync(form.toCreate(values as V));
        toast({ title: es.common.created, variant: 'success' });
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      setApiError(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="sr-only">{title}</DialogDescription>
        {apiError ? (
          <Alert variant="error" live="assertive">
            <p>{errorMessage(apiError)}</p>
          </Alert>
        ) : null}
        <ResourceForm
          fields={fields}
          schema={(editing ? form.editSchema : form.createSchema) as never}
          defaultValues={form.defaults(item) as FieldValues}
          submitLabel={editing ? es.common.save : es.common.create}
          submittingLabel={editing ? es.common.saving : es.common.creating}
          onSubmit={submit}
          onCancel={() => onOpenChange(false)}
          apiError={apiError}
        />
      </DialogContent>
    </Dialog>
  );
}
