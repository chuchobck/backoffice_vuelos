import { describe, expect, it } from 'vitest';
import { cleanBarcode, looksLikeBoardingPass } from './barcode';

describe('formato general del pase', () => {
  it('acepta lo que empieza con BP1| (aunque el lector agregue espacios o saltos)', () => {
    expect(looksLikeBoardingPass('BP1|K7M2QX|0451331201527|LA1400|20261020|UIOGYE|10A|001|9f2c41b7a0d3')).toBe(true);
    expect(looksLikeBoardingPass('  BP1|algo\r\n')).toBe(true);
    expect(cleanBarcode('  BP1|algo\r\n')).toBe('BP1|algo');
  });

  it('rechaza lo vacío, lo que no empieza con BP1| y el prefijo solo', () => {
    for (const bad of ['', '   ', 'bp1|x', 'BP2|x', 'K7M2QX', 'BP1', 'BP1|', 'xBP1|abc']) expect(looksLikeBoardingPass(bad)).toBe(false);
  });
});
