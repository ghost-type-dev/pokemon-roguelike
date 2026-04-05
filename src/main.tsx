import { Buffer } from 'buffer'
// Polyfill Node.js globals for @pkmn/sim compatibility
;(globalThis as any).Buffer = Buffer
;(globalThis as any).global = globalThis

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
