/** Todo pase de abordar empieza con "BP1|" (versión 1 del formato). Solo se revisa eso: la firma la verifica el backend. */
export const BARCODE_PREFIX = 'BP1|';

/** El lector suele agregar un salto de línea o espacios: se recortan antes de revisar y de enviar. */
export function cleanBarcode(text: string): string {
  return text.trim();
}

/** Formato general: empieza con "BP1|" y trae algo después. No replica la firma ni el resto de los campos. */
export function looksLikeBoardingPass(text: string): boolean {
  const clean = cleanBarcode(text);
  return clean.startsWith(BARCODE_PREFIX) && clean.length > BARCODE_PREFIX.length;
}
