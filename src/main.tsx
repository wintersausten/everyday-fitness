import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { registerSW } from 'virtual:pwa-register'
// Self-hosted fonts, bundled by Vite — the app renders fully offline, first
// paint included. Never @import from a CDN (breaks the offline guarantee).
// @fontsource ships `font-display: swap`, so the system fallback shows instantly.
// Latin subset only (DESIGN.md §3) — the glyphs we use, nothing more.
import '@fontsource/barlow-condensed/latin-500.css'
import '@fontsource/barlow-condensed/latin-600.css'
import '@fontsource/barlow-condensed/latin-700.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import './index.css'
import App from './App.tsx'

registerSW()

// Dev-only bulk data seeder, exposed as `window.seed` in the console.
// Dynamic import behind DEV so it's excluded from the production bundle.
if (import.meta.env.DEV) {
  import('./db/seed.ts').then((m) => m.installSeedConsole())
}

// Ask the browser not to evict IndexedDB under storage pressure.
// Fire-and-forget: the app works either way, but durability matters.
navigator.storage
  ?.persist?.()
  .then((granted) => console.log(`storage.persist(): ${granted ? 'granted' : 'denied'}`))
  .catch((err) => console.log('storage.persist() failed:', err))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
