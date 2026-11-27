import { createReadStream, readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const require = createRequire(import.meta.url)
const tesseractDir = dirname(require.resolve('tesseract.js/package.json'))
const coreDir = dirname(
  createRequire(join(tesseractDir, 'package.json')).resolve('tesseract.js-core/package.json'),
)
const tesseractVersion: string = JSON.parse(
  readFileSync(join(tesseractDir, 'package.json'), 'utf8'),
).version

// Versioned so the CacheFirst runtime cache can never pair a stale worker with
// a newer core after a tesseract.js upgrade.
const OCR_ASSET_DIR = `ocr/${tesseractVersion}`

/** Published path (under OCR_ASSET_DIR) → source file on disk. */
function ocrAssetMap(): Map<string, string> {
  const files = new Map<string, string>()
  files.set('worker.min.js', join(tesseractDir, 'dist/worker.min.js'))
  // LSTM-only builds; tesseract.js picks one at runtime by SIMD support.
  for (const f of readdirSync(coreDir).filter((f) => f.endsWith('-lstm.wasm.js'))) {
    files.set(`core/${f}`, join(coreDir, f))
  }
  for (const f of readdirSync('ocr-models').filter((f) => f.endsWith('.traineddata'))) {
    files.set(`lang/${f}`, join('ocr-models', f))
  }
  return files
}

/**
 * Self-hosts the Tesseract worker, wasm core and models (instead of the
 * jsDelivr defaults) — served from node_modules in dev, emitted in build.
 */
function ocrAssets(): Plugin {
  const files = ocrAssetMap()
  return {
    name: 'ocr-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0] ?? ''
        const prefix = `/${OCR_ASSET_DIR}/`
        const src = path.startsWith(prefix) ? files.get(path.slice(prefix.length)) : undefined
        if (!src) return next()
        res.setHeader(
          'Content-Type',
          src.endsWith('.js') ? 'text/javascript' : 'application/octet-stream',
        )
        createReadStream(src).pipe(res)
      })
    },
    generateBundle() {
      for (const [path, src] of files) {
        this.emitFile({ type: 'asset', fileName: `${OCR_ASSET_DIR}/${path}`, source: readFileSync(src) })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __OCR_ASSET_DIR__: JSON.stringify(OCR_ASSET_DIR),
  },
  plugins: [
    react(),
    ocrAssets(),
    VitePWA({
      registerType: 'autoUpdate',
      // Precache the bundled fonts too (Workbox's default globs omit woff2) so
      // Barlow/Inter render offline on first paint — the local-first guarantee.
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // OCR assets (~5.5 MB per device) are opt-in: cached on first scanner
        // use instead of downloaded by every install.
        globIgnores: ['ocr/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/ocr/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'ocr-assets',
              expiration: { maxEntries: 16 },
            },
          },
        ],
      },
      manifest: {
        name: 'Everyday Fitness',
        short_name: 'Everyday Fitness',
        description: 'Local-first weight tracking',
        display: 'standalone',
        start_url: '/',
        theme_color: '#15171c',
        background_color: '#15171c',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pwa-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
  },
})
