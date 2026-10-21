import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] },
    proxy: {
      '/api': { target: process.env.DEV_API_TARGET || 'http://127.0.0.1:8080', changeOrigin: true },
    },
  },
  build: { chunkSizeWarningLimit: 1300 },
});
