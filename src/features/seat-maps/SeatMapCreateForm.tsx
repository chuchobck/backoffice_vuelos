import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { useFieldArray, useForm, type FieldValues } from 'react-hook-form';
import { errorMessage, isApiError, useAllItems, useCreateMutation } from '@/shared/api';
import type { FormDialogProps } from '@/shared/crud';
import { es, fmt } from '@/shared/i18n';
import { cabinLabel } from '@/shared/lib/labels';
import { useErrorSummary } from '@/shared/lib/useErrorSummary';
import { Alert, Button, ErrorSummary, Field, Input, Select, toast } from '@/shared/ui';
import { DEFAULT_BLOCK, SeatMapCreateSchema, toBlocks, toSeatMapBody, type SeatBlockValues, type SeatMapCreateValues } from './createSchema';
import { generateRows, summarize } from './layout';
import { SeatBlockFields } from './SeatBlockFields';

const t = es.entities.seatMaps.create;

/** Cuerpo del alta de un mapa de asientos (POST /admin/seat-maps): genera las filas y los asientos desde bloques. */
export function SeatMapCreateForm({ onOpenChange, onSaved }: Pick<FormDialogProps<'seatMaps'>, 'onOpenChange' | 'onSaved'>) {
  const formId = useId().replace(/:/g, '');
  const idOf = (name: string) => `${formId}-${name}`;
  const airlines = useAllItems('airlines');
  const models = useAllItems('aircraftModels');
  const create = useCreateMutation('seatMaps', ['departures']);
  const [apiError, setApiError] = useState<unknown>(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<FieldValues>({
    resolver: zodResolver(SeatMapCreateSchema) as never,
    defaultValues: { airline: '', aircraftModel: '', name: '', blocks: [DEFAULT_BLOCK] },
    mode: 'onTouched',
    shouldFocusError: false,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'blocks' });
  const values = watch() as Partial<SeatMapCreateValues>;

  const meta: Record<string, { id: string; label: string }> = {
    airline: { id: idOf('airline'), label: t.airline },
    aircraftModel: { id: idOf('aircraftModel'), label: t.model },
    name: { id: idOf('name'), label: t.name },
  };
  const { summary: baseSummary, summaryRef, onInvalid } = useErrorSummary(meta, errors, isSubmitted);
  // Errores de los bloques: un renglón del resumen por cada campo con problema.
  const blockSummary = useMemo(() => {
    const out: { fieldId: string; label: string; message: string }[] = [];
    const list = (errors.blocks as unknown[] | undefined) ?? [];
    list.forEach((b, i) => {
      for (const [name, e] of Object.entries((b as Record<string, { message?: string }> | undefined) ?? {})) {
        if (e?.message) out.push({ fieldId: idOf(`blocks-${i}-${name}`), label: `${fmt(t.block, { n: i + 1 })}`, message: e.message });
      }
    });
    return out;
    // idOf es estable por render del formulario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errors.blocks]);
  const summary = [...baseSummary, ...(isSubmitted ? blockSummary : [])];

  useEffect(() => {
    if (!isApiError(apiError)) return;
    for (const fe of apiError.fieldErrors) {
      const root = fe.field.split(/[.[]/)[0] ?? '';
      if (root in meta) setError(root, { message: es.crud.summaryServerField });
    }
    // Solo cuando llega un error nuevo de la API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiError]);

  // Vista previa: solo con bloques que ya son válidos.
  // Barato de calcular en cada render (RHF reutiliza el arreglo de `watch`, así que no sirve de dependencia de useMemo).
  const parsedBlocks = SeatMapCreateSchema.safeParse({ airline: 'x', aircraftModel: 'x', name: 'x', blocks: values.blocks ?? [] });
  const previewRows = parsedBlocks.success ? generateRows(toBlocks(parsedBlocks.data.blocks as SeatBlockValues[])) : [];
  const preview = previewRows.length ? summarize(previewRows) : null;

  const sending = useRef(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true;
    void handleSubmit(onValid, onInvalid)(event).finally(() => {
      sending.current = false;
    });
  };

  const onValid = async (v: FieldValues) => {
    setApiError(null);
    try {
      await create.mutateAsync(toSeatMapBody(v as SeatMapCreateValues));
      toast({ title: es.common.created, variant: 'success' });
      onOpenChange(false);
      onSaved();
    } catch (error) {
      setApiError(error);
    }
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      {apiError ? (
        <Alert variant="error" live="assertive">
          <p>{errorMessage(apiError)}</p>
        </Alert>
      ) : null}
      <ErrorSummary ref={summaryRef} errors={summary} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={idOf('airline')} label={t.airline} error={errors.airline?.message as string | undefined} required>
          <Select {...register('airline')} placeholder={airlines.isLoading ? es.a11y.loading : es.common.choose} options={(airlines.data?.items ?? []).map((a) => ({ value: a.code, label: `${a.code} — ${a.name}` }))} />
        </Field>
        <Field id={idOf('aircraftModel')} label={t.model} error={errors.aircraftModel?.message as string | undefined} required>
          <Select {...register('aircraftModel')} placeholder={models.isLoading ? es.a11y.loading : es.common.choose} options={(models.data?.items ?? []).map((m) => ({ value: m.code, label: `${m.name} (${m.code})` }))} />
        </Field>
      </div>
      <Field id={idOf('name')} label={t.name} hint={t.nameHint} error={errors.name?.message as string | undefined} required>
        <Input {...register('name')} maxLength={150} autoComplete="off" />
      </Field>

      <h3 className="text-lg">{t.blocksTitle}</h3>
      <p className="-mt-2 text-sm text-muted">{t.blocksHint}</p>
      {fields.map((field, index) => (
        <SeatBlockFields key={field.id} index={index} register={register} errors={errors} idOf={idOf} canRemove={fields.length > 1} onRemove={() => remove(index)} />
      ))}
      <div>
        <Button variant="secondary" onClick={() => append({ ...DEFAULT_BLOCK, cabinClass: '', firstRow: '', rowCount: '' })}>
          <Plus aria-hidden="true" />
          {t.addBlock}
        </Button>
      </div>

      <section aria-label={t.preview} className="rounded border-2 border-primary bg-primary-tint p-4">
        <h3 className="text-base">{t.preview}</h3>
        <div aria-live="polite">
          {preview ? (
            <>
              <p className="font-bold">{fmt(t.previewTotal, preview.total)}</p>
              <ul className="list-disc pl-6">
                {preview.cabins.map((c) => (
                  <li key={c.cabinClass}>{fmt(t.previewCabin, { cabin: cabinLabel(c.cabinClass), rows: c.rows, seats: c.seats })}</li>
                ))}
              </ul>
            </>
          ) : (
            <p>{t.previewEmpty}</p>
          )}
        </div>
      </section>

      <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          {es.common.cancel}
        </Button>
        <Button type="submit" loading={isSubmitting} loadingText={es.common.creating}>
          {es.common.create}
        </Button>
      </div>
    </form>
  );
}
