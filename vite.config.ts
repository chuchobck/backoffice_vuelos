import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Desarrollo local: con `API_URL: "/flights/v1"` en public/config.js, el proxy reenvía /flights hacia
 * la API de Render (changeOrigin) y no hay problemas de CORS. En producción la URL absoluta de
 * public/config.js se llama directamente (el origen del sitio debe estar en CORS_ORIGINS del backend).
 */
const API_TARGET = 'https://quinde-vuelos-api.onrender.com';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    proxy: { '/flights': { target: API_TARGET, changeOrigin: true, secure: true } },
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
});
