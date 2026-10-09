import { afterEach } from 'vitest';

// Las pruebas de componentes corren en jsdom (// @vitest-environment jsdom): se limpia el DOM entre pruebas.
afterEach(async () => {
  if (typeof document === 'undefined') return;
  const { cleanup } = await import('@testing-library/react');
  cleanup();
});
