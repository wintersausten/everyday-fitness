import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { registerSW } from 'virtual:pwa-register'
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
