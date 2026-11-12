import { useEffect, useRef, useState, type FormEvent } from 'react';
import { es } from '@/shared/i18n';
import { Button, Field, Input } from '@/shared/ui';

const t = es.boarding.scan;

interface Props {
  /** Texto escrito o leído, ya sin validar. */
  onScan: (barcode: string) => void;
  pending: boolean;
}

/**
 * Campo del lector de código de barras. Un lector USB "escribe" el código y manda Enter; pegar a mano funciona igual.
 * Al enviar, el campo se limpia y recupera el foco para el siguiente pasajero. No se bloquea mientras responde el servidor:
 * un lector rápido puede mandar varios pases seguidos.
 */
export function ScanForm({ onScan, pending }: Props) {
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = value;
    setValue('');
    input.current?.focus();
    if (text.trim() === '') return;
    onScan(text);
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-wrap items-end gap-4">
      <Field label={t.label} hint={t.hint} required className="min-w-0 flex-1 basis-72">
        <Input
          ref={input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className="font-mono"
        />
      </Field>
      <Button type="submit" size="md" aria-busy={pending || undefined}>
        {t.submit}
      </Button>
    </form>
  );
}
