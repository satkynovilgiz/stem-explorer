import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { installLocationEvents } from './lib/location'
import { installStaleBuildRecovery } from './lib/staleBuild'
import './styles/tokens.css'
import './styles/app.css'

installLocationEvents()
installStaleBuildRecovery()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
