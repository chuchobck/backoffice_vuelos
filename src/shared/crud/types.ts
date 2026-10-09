import type { ReactNode } from 'react';
import type { FieldValues } from 'react-hook-form';
import type { z } from 'zod';
import type { CreateOf, DetailOf, ItemOf, ResourceName, UpdateOf } from '@/shared/api';
import type { Column } from '@/shared/ui';
import type { SelectOption } from '@/shared/ui';

/** De dónde salen las opciones de una lista desplegable: los registros activos de otro recurso. */
export interface OptionSource {
  resource: ResourceName;
  /** Filtros del servidor según lo ya escrito en el formulario (p. ej. familias de la aerolínea elegida). */
  filters?: (values: Record<string, unknown>) => Record<string, string | undefined> | null;
  value: (item: never) => string;
  label: (item: never) => string;
  /** Texto de la opción vacía. */
  placeholder?: string;
}

export function optionSource<N extends ResourceName>(
  resource: N,
  config: {
    value: (item: ItemOf<N>) => string;
    label: (item: ItemOf<N>) => string;
    filters?: OptionSource['filters'];
    placeholder?: string;
  },
): OptionSource {
  return { resource, ...config, value: config.value as OptionSource['value'], label: config.label as OptionSource['label'] };
}

interface BaseField {
  name: string;
  label: string;
  hint?: string;
  /** Solo se pide al crear (el identificador no se edita). */
  createOnly?: boolean;
  /** Campo que puede quedar vacío: se marca "(opcional)" en la etiqueta. */
  optional?: boolean;
}

export type FieldSpec =
  | (BaseField & { kind: 'text'; upper?: boolean; inputMode?: 'text' | 'numeric' | 'decimal' | 'email'; maxLength?: number; placeholder?: string; autoComplete?: string })
  | (BaseField & { kind: 'select'; options?: SelectOption[]; source?: OptionSource; placeholder?: string })
  | (BaseField & { kind: 'checkbox' });

export interface FilterSpec {
  name: string;
  label: string;
  kind: 'select' | 'text' | 'date';
  options?: SelectOption[];
  source?: OptionSource;
  upper?: boolean;
  maxLength?: number;
  pattern?: RegExp;
  patternMessage?: string;
  placeholder?: string;
}

export interface FormConfig<N extends ResourceName, V extends FieldValues> {
  fields: FieldSpec[];
  createSchema: z.ZodType<V, z.ZodTypeDef, unknown>;
  editSchema: z.ZodType<V, z.ZodTypeDef, unknown>;
  defaults: (item?: ItemOf<N>) => V;
  toCreate: (values: V) => CreateOf<N>;
  /** Solo lo que cambió (PATCH parcial); `null` si no hay cambios. */
  toUpdate: (values: V, item: ItemOf<N>) => UpdateOf<N> | null;
}

export interface DetailRow {
  label: string;
  value: ReactNode;
}

export interface ResourceConfig<N extends ResourceName, V extends FieldValues = FieldValues> {
  resource: N;
  /** Sustantivo en singular para frases: "aeropuerto". */
  noun: string;
  /** Nombre de la tabla en plural: "Aeropuertos". */
  title: string;
  idOf: (item: ItemOf<N>) => string;
  isActive: (item: ItemOf<N>) => boolean;
  columns: Column<ItemOf<N>>[];
  /** Texto en el que busca "Buscar" (por defecto, todos los valores del registro). */
  searchText?: (item: ItemOf<N>) => string;
  filters?: FilterSpec[];
  form?: FormConfig<N, V>;
  /** En lugar de un formulario, el botón de crear lleva a otra pantalla (p. ej. el asistente). */
  createLink?: { to: string; label: string };
  /** Sin `detail` no hay botón "Ver". Con `fetch`, el detalle se pide a GET /{id}. */
  detail?: { fetch?: boolean; rows: (data: DetailOf<N>) => DetailRow[] };
  /** Textos propios de la baja (una salida se "cancela"). */
  deactivation?: { label: string; title: string; text: string; ariaLabel?: string };
  /** Recursos cuyas consultas también se invalidan al escribir (p. ej. una baja afecta a las tarifas). */
  invalidates?: ResourceName[];
  initialFilters?: Record<string, string>;
  /** Contenido extra bajo la tabla (p. ej. una nota). */
  note?: string;
}
