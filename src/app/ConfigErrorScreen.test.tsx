// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConfigErrorScreen } from './ConfigErrorScreen';

describe('pantalla de configuración inválida', () => {
  it('nombra cada problema con el valor recibido y explica cómo arreglarlo (un solo h1, role=alert)', () => {
    render(
      <ConfigErrorScreen
        issues={[
          { code: 'API_URL_INVALID', value: 'no es una url' },
          { code: 'IDENTITY_URL_UNDERIVABLE', value: 'https://gw.example.com/api' },
        ]}
      />,
    );
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const alert = screen.getByRole('alert');
    expect(within(alert).getByText(/API_URL no es una URL válida/)).toBeTruthy();
    expect(within(alert).getByText('no es una url')).toBeTruthy();
    expect(within(alert).getByText(/Falta IDENTITY_URL y no se puede derivar/)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Cómo arreglarlo' })).toBeTruthy();
    expect(screen.getByText(/IDENTITY_URL: "https:\/\/<gateway>\/identity\/v1"/)).toBeTruthy();
  });
});
