import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { registerSW } from 'virtual:pwa-register'
// Self-hosted fonts, bundled by Vite — the app renders fully offline, first
// paint included. Never @import from a CDN (breaks the offline guarantee).
// @fontsource ships `font-display: swap`, so the system fallback shows instantly.
import '@fontsource/barlow-condensed/500.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import './index.css'
import App from './App.tsx'

registerSW()

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
