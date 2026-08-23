import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.VITE_API_TARGET ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Same-origin during development, so the browser never needs a CORS preflight.
    proxy: { '/api': { target: apiTarget, changeOrigin: true } },
  },
  build: { outDir: 'dist', sourcemap: false },
});
