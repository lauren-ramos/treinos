import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/plus-jakarta-sans'
import './index.css'
import App from './App'

registerSW({ immediate: true })
document.getElementById('splash')?.remove()
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
