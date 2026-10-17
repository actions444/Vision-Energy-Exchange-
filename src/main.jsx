import { Component } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './ui/styles.css'

// Visible crash diagnostics: if the app fails to render at all, show the real error on screen
// instead of leaving a blank page. This runs even in sandboxed hosting (like the Claude artifact
// preview) where the browser console isn't reachable for debugging.
//
// Two tiers, on purpose:
// - A React render error that reaches here means the whole tree unmounted - genuinely blank,
//   so this takes over the screen with the full error.
// - A stray window-level error/rejection (a background fetch failing, say) does NOT necessarily
//   mean anything broke - most of those are already caught locally (see GLBBoundary) and the
//   game keeps running fine underneath. Covering the screen for those would just recreate the
//   blank-page problem for something harmless, so these get a small dismissible corner note
//   instead of hiding the game.
function showFatalOverlay(title, detail) {
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

let toastEl = null
let toastCount = 0
function showBackgroundErrorToast(title, detail) {
  console.warn(`[${title}]`, detail)
  toastCount++
  if (!toastEl) {
    toastEl = document.createElement('div')
    toastEl.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:999998;max-width:min(92vw,520px);max-height:40vh;overflow:auto;background:rgba(10,9,16,.92);color:#f4f1ea;font:11px/1.4 ui-monospace,monospace;padding:10px 12px;border-radius:8px;border:1px solid #332b40;white-space:pre-wrap;word-break:break-word;cursor:pointer'
    toastEl.title = 'Click to dismiss'
    toastEl.addEventListener('click', () => { toastEl.remove(); toastEl = null })
    document.body.appendChild(toastEl)
  }
  toastEl.textContent = `${toastCount} background error${toastCount > 1 ? 's' : ''} (latest) — ${title}: ${detail}`.slice(0, 2000)
}

window.addEventListener('error', (e) => {
  showBackgroundErrorToast('Uncaught error', e.error?.stack || e.message || String(e))
})
window.addEventListener('unhandledrejection', (e) => {
  const r = e.reason
  showBackgroundErrorToast('Unhandled promise rejection', (r && (r.stack || r.message)) || String(r))
})

class RootErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { showFatalOverlay('React render error', ((error?.stack || error?.message || String(error)) + '\n\n' + (info?.componentStack || '')).replace(/</g, '&lt;')) }
  render() {
    if (this.state.error) return null // the fatal overlay above already shows the details
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
  showFatalOverlay('Failed to start', (err?.stack || err?.message || String(err)).replace(/</g, '&lt;'))
}

// PWA install support: registers only on a real deployment (self-hosted server). Skipped inside
// the Claude artifact preview (no matching origin to control, and the sandboxed iframe there
// doesn't allow it anyway) and on plain http in dev. Never blocks or affects app startup.
if ('serviceWorker' in navigator && location.protocol === 'https:' && !(window.claude && window.claude.use)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
