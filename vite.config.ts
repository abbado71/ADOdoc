import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      {
        name: 'icon-cache-headers',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url && (req.url.includes('apple-touch-icon') || req.url.includes('pwa-') || req.url.includes('favicon'))) {
              res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
              res.setHeader('Access-Control-Allow-Origin', '*');
            }
            next();
          });
        },
      },
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.ico',
          'favicon.png',
          'apple-touch-icon.png',
          'apple-touch-icon-180x180.png',
          'apple-touch-icon-167x167.png',
          'apple-touch-icon-152x152.png',
          'apple-touch-icon-120x120.png',
          'apple-touch-icon-precomposed.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'ADOdoc',
          short_name: 'ADOdoc',
          description: 'ADOdoc - Editor e gestione documenti stile Google Docs con salvataggio in tempo reale e sincronizzazione Google Drive.',
          theme_color: '#1e293b',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/apple-touch-icon.png?v=3',
              sizes: '180x180',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-192x192.png?v=3',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png?v=3',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png?v=3',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
