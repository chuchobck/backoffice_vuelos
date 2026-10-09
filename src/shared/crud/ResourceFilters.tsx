import { useState, type FormEvent } from 'react';
import { es } from '@/shared/i18n';
import { Button, Field, Input, Select } from '@/shared/ui';
import type { SelectOption } from '@/shared/ui';
import type { FilterSpec } from './types';
import { useOptions } from './useOptions';

type Values = Record<string, string>;

function FilterControl({ spec, value, onChange, error }: { spec: FilterSpec; value: string; onChange: (v: string, applyNow: boolean) => void; error?: string }) {
  const loaded = useOptions(spec.source, {});
  const id = `filter-${spec.name}`;
  if (spec.kind === 'select') {
    const options: SelectOption[] = spec.options ?? loaded.options;
    return (
      <Field id={id} label={spec.label} required className="min-w-40 flex-1">
        <Select
          value={value}
          options={options}
          placeholder={spec.source?.placeholder ?? es.common.all}
          onChange={(e) => onChange(e.target.value, true)}
        />
      </Field>
    );
  }
  return (
    <Field id={id} label={spec.label} error={error} required className="min-w-40 flex-1">
      <Input
        type={spec.kind === 'date' ? 'date' : 'text'}
        value={value}
        maxLength={spec.maxLength}
        placeholder={spec.placeholder}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => onChange(spec.upper ? e.target.value.toUpperCase() : e.target.value, false)}
      />
    </Field>
  );
}

interface Props {
  filters: FilterSpec[];
  applied: Values;
  onApply: (values: Values) => void;
}

/**
 * Filtros del servidor. Las listas desplegables y las fechas se aplican al elegir; los de texto, con
 * "Aplicar filtros" (o Enter). Los de texto se validan con su patrón al aplicar, sin borrar lo escrito.
 */
export function ResourceFilters({ filters, applied, onApply }: Props) {
  const [draft, setDraft] = useState<Values>(applied);
  const [errors, setErrors] = useState<Values>({});

  const commit = (values: Values = draft) => {
    const nextErrors: Values = {};
    for (const f of filters) {
      const v = (values[f.name] ?? '').trim();
      if (v && f.pattern && !f.pattern.test(v)) nextErrors[f.name] = f.patternMessage ?? es.validation.required;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onApply(Object.fromEntries(Object.entries(values).filter(([, v]) => v.trim() !== '')));
  };

  const hasText = filters.some((f) => f.kind === 'text' || f.kind === 'date');

  return (
    <form
      noValidate
      role="search"
      aria-label={es.table.filters}
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        commit();
      }}
      className="flex flex-wrap items-end gap-4"
    >
      {filters.map((f) => (
        <FilterControl
          key={f.name}
          spec={f}
          value={draft[f.name] ?? ''}
          error={errors[f.name]}
          onChange={(v, applyNow) => {
            const next = { ...draft, [f.name]: v };
            setDraft(next);
            // Una lista desplegable se aplica de inmediato con el valor recién elegido.
            if (applyNow) commit(next);
          }}
        />
      ))}
      {hasText ? <Button type="submit">{es.table.applyFilters}</Button> : null}
      {Object.keys(applied).length > 0 ? (
        <Button
          variant="secondary"
          onClick={() => {
            setDraft({});
            setErrors({});
            onApply({});
          }}
        >
          {es.table.clearFilters}
        </Button>
      ) : null}
    </form>
  );
}
