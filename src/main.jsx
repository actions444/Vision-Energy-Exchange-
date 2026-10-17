import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './ui/styles.css'

createRoot(document.getElementById('root')).render(<App />)

// PWA install support: registers only on a real deployment (self-hosted server). Skipped inside
// the Claude artifact preview (no matching origin to control, and the sandboxed iframe there
// doesn't allow it anyway) and on plain http in dev. Never blocks or affects app startup.
if ('serviceWorker' in navigator && location.protocol === 'https:' && !(window.claude && window.claude.use)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
