import path from 'node:path';
import react from '@vitejs/plugin-react';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Desarrollo local (`npm run dev`): el navegador llama a su propio origen (`/flights/v1`, `/identity/v1`) y el
 * servidor de Vite reenvía hacia el GATEWAY (`GATEWAY_URL`, por defecto http://localhost:8080), que a su vez
 * reparte: /flights/v1/** → core · /identity/v1/** y /oauth2/token → identity · /graphql → BFF. Así no hay CORS
 * ni hace falta tocar `CORS_ORIGINS` de ningún servicio. El `/config.js` de desarrollo lo sirve este plugin;
 * el de `public/` (con la URL publicada) es el que se despliega y no se usa en desarrollo.
 * (`BACKEND_URL` sigue valiendo como nombre antiguo de `GATEWAY_URL`.)
 */
function devConfig(): Plugin {
  return {
    name: 'backoffice-dev-config',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/config.js', (_req, res) => {
        res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end('window.BACKOFFICE_CONFIG = { API_URL: "/flights/v1", IDENTITY_URL: "/identity/v1" };\n');
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const gatewayUrl = env.GATEWAY_URL || env.BACKEND_URL || 'http://localhost:8080';
  const toGateway = { target: gatewayUrl, changeOrigin: true };
  return {
    plugins: [react(), devConfig()],
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    server: {
      proxy: { '/flights': toGateway, '/identity': toGateway, '/graphql': toGateway },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            query: ['@tanstack/react-query'],
            radix: ['@radix-ui/react-checkbox', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-label', '@radix-ui/react-slot', '@radix-ui/react-toast'],
            forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          },
        },
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['src/test-setup.ts'],
    },
  };
});
