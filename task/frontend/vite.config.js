/**
 * vite.config.js — Vite build/dev config.
 *
 * - Dev server on :5173.
 * - Proxies /api and /socket.io to the backend on :4000 so the
 *   frontend can use relative URLs in dev without CORS hassle.
 * - In production the frontend deploys to Netlify and talks to the
 *   backend via the VITE_API_URL env var (absolute origin).
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Served-as-is assets live in /static (renamed from default /public).
  // Any file under static/ is available at the URL '/<path>'.
  // Example: static/icons/favicon.svg -> requested at /icons/favicon.svg
  publicDir: 'static',
  server: {
    // Bind to the loopback IP literal (not 'localhost') so the
    // origin the browser sees matches the Spotify redirect URI
    // we register (Spotify rejects 'localhost' as of April 2025).
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:4000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
