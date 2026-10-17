import { Component } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './ui/styles.css'

// Visible crash diagnostics: if anything throws during startup or render, show the real error
// on screen instead of leaving a blank page. This runs even in sandboxed hosting (like the
// Claude artifact preview) where the browser console isn't reachable for debugging.
function showCrashOverlay(title, detail) {
  let el = document.getElementById('crash-overlay')
  if (!el) {
    el = document.createElement('div')
    el.id = 'crash-overlay'
    el.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#0a0910;color:#f4f1ea;font:13px/1.5 -apple-system,BlinkMacSystemFont,sans-serif;padding:24px;overflow:auto;white-space:pre-wrap;word-break:break-word'
    document.body.appendChild(el)
  }
  const line = document.createElement('div')
  line.style.cssText = 'margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid #332b40'
  line.innerHTML = `<div style="color:#ff6b9d;font-weight:700;font-size:15px;margin-bottom:6px">${title}</div><div>${detail}</div>`
  el.appendChild(line)
}

window.addEventListener('error', (e) => {
  showCrashOverlay('Uncaught error', (e.error?.stack || e.message || String(e)).replace(/</g, '&lt;'))
})
window.addEventListener('unhandledrejection', (e) => {
  const r = e.reason
  showCrashOverlay('Unhandled promise rejection', ((r && (r.stack || r.message)) || String(r)).replace(/</g, '&lt;'))
})

class RootErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { showCrashOverlay('React render error', ((error?.stack || error?.message || String(error)) + '\n\n' + (info?.componentStack || '')).replace(/</g, '&lt;')) }
  render() {
    if (this.state.error) return null // the crash overlay above already shows the details
    return this.props.children
  }
}

try {
  createRoot(document.getElementById('root')).render(
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  )
} catch (err) {
  showCrashOverlay('Failed to start', (err?.stack || err?.message || String(err)).replace(/</g, '&lt;'))
}

// PWA install support: registers only on a real deployment (self-hosted server). Skipped inside
// the Claude artifact preview (no matching origin to control, and the sandboxed iframe there
// doesn't allow it anyway) and on plain http in dev. Never blocks or affects app startup.
if ('serviceWorker' in navigator && location.protocol === 'https:' && !(window.claude && window.claude.use)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
