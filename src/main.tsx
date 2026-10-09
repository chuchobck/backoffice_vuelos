import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './index.css';

async function start(): Promise<void> {
  // Compilación exclusiva de pruebas E2E (`npm run e2e`): la API de prueba reemplaza a la real. En la
  // compilación de producción esta condición es falsa y el módulo no se incluye.
  if (import.meta.env.VITE_E2E === 'true') {
    const { installFakeApi } = await import('./test-support/fake-api/install');
    installFakeApi();
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
