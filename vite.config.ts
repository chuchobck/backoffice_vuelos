import path from 'node:path';
import react from '@vitejs/plugin-react';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Desarrollo local (`npm run dev`): el navegador llama a su propio origen (`/flights/v1`) y el servidor de
 * Vite reenvía hacia `BACKEND_URL` (por defecto http://localhost:3000). Así no hay CORS ni hace falta tocar
 * `CORS_ORIGINS` del backend. El `/config.js` de desarrollo lo sirve este plugin; el de `public/` (con la
 * URL de producción) es el que se publica y no se usa en desarrollo.
 */
function devConfig(): Plugin {
  return {
      name: 'backoffice-dev-config',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use('/config.js', (_req, res) => {
          res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end('window.BACKOFFICE_CONFIG = { API_URL: "/flights/v1" };\n');
        });
      },
    };
  }

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.BACKEND_URL || 'http://localhost:3000';
  return {
    plugins: [react(), devConfig()],
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    server: {
      proxy: { '/flights': { target: backendUrl, changeOrigin: true } },
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
