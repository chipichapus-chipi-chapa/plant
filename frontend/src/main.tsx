import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import { App } from './app/App'
import { setupPwa } from './app/pwa'
import { setupTelegram } from './app/telegram'

setupTelegram()
setupPwa()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
