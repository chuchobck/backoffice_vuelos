import { useEffect, useState } from 'react';
import { boardingErrorMessage, MANIFEST_REFRESH_MS, useManifest, useScanBoarding } from '@/shared/api';
import { es } from '@/shared/i18n';
import { ErrorState } from '@/shared/ui';
import { looksLikeBoardingPass } from './barcode';
import { ManifestSummary } from './ManifestSummary';
import { ManifestTable } from './ManifestTable';
import { ScanForm } from './ScanForm';
import { ScanResult } from './ScanResult';

/** Cuánto tiempo queda a la vista el nombre del pasajero tras un abordaje (el backend lo entrega solo para compararlo con el documento). */
export const NAME_VISIBLE_MS = 8_000;

/**
 * Todo lo de una salida: conteos, campo de escaneo, resultado y manifiesto. El resultado (con nombres) vive solo en la mutación:
 * se borra a los 8 s, al siguiente escaneo y al salir de la pantalla, y no se copia a ningún otro estado, caché, almacenamiento ni consola.
 */
export function BoardingGate({ departureId }: { departureId: string }) {
  const manifest = useManifest(departureId, MANIFEST_REFRESH_MS);
  const scan = useScanBoarding(departureId);
  const { reset, mutate } = scan;
  const [malformed, setMalformed] = useState(false);

  // El nombre se borra a los 8 s; un escaneo nuevo (otro `data`) reinicia la cuenta.
  useEffect(() => {
    if (!scan.data) return undefined;
    const timer = setTimeout(reset, NAME_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [scan.data, reset]);

  // Al salir de la pantalla o cambiar de salida no queda nada del último pasajero.
  useEffect(() => reset, [reset]);

  const onScan = (barcode: string) => {
    reset();
    if (!looksLikeBoardingPass(barcode)) {
      setMalformed(true);
      return;
    }
    setMalformed(false);
    mutate(barcode);
  };

  const errorText = malformed ? es.boarding.errors.malformed : scan.error ? boardingErrorMessage(scan.error) : null;

  return (
    <div className="flex flex-col gap-6">
      {manifest.error && !manifest.data ? (
        <ErrorState error={manifest.error} onRetry={() => void manifest.refetch()} />
      ) : (
        <ManifestSummary manifest={manifest.data} loading={manifest.isLoading} />
      )}
      <ScanForm onScan={onScan} pending={scan.isPending} />
      <ScanResult data={scan.data} error={errorText} />
      {manifest.data ? <ManifestTable manifest={manifest.data} /> : null}
    </div>
  );
}
