import { useAllItems } from '@/shared/api';
import type { SelectOption } from '@/shared/ui';
import type { OptionSource } from './types';

/** Opciones de una lista desplegable a partir de los registros activos de otro recurso. */
export function useOptions(source: OptionSource | undefined, values: Record<string, unknown>) {
  const filters = source?.filters ? source.filters(values) : {};
  // `null` = todavía falta algo escrito para poder filtrar (p. ej. la aerolínea): sin opciones.
  const enabled = !!source && filters !== null;
  const query = useAllItems(source?.resource ?? 'airports', filters ?? undefined, enabled);
  const options: SelectOption[] = !source || !query.data ? [] : (query.data.items as never[]).map((i) => ({ value: source.value(i), label: source.label(i) }));
  return { options, loading: enabled && query.isLoading, error: query.error, waiting: !!source && filters === null };
}
