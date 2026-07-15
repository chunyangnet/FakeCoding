import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || `http://127.0.0.1:${env.FAKECODING_PORT || '8084'}`

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg'],
        manifest: {
          name: 'FakeCoding',
          short_name: 'Codex',
          description: 'A Codex-like zero-side-effect fake coding workspace',
          theme_color: '#171717',
          background_color: '#171717',
          display: 'standalone',
          icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
        },
        workbox: {
          navigateFallback: '/index.html',
          globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        },
      }),
    ],
    server: {
      host: '127.0.0.1',
      port: 5173,
      proxy: {
        '/v1': { target: apiProxyTarget, changeOrigin: true },
        '/health': { target: apiProxyTarget, changeOrigin: true },
      },
    },
    build: {
      outDir: '../agent_nonsense/web',
      emptyOutDir: true,
      sourcemap: false,
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: true,
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
    },
  }
})
