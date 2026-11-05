import { Component, Suspense, useEffect, useState } from 'react'
import { modelAvailable } from '../assets/modelAvailable.js'

// Wraps an imported-GLB building (ParkingGarage, SkylineSuiteSet) so a failed or missing model
// file degrades to "nothing renders there" instead of crashing the whole app. This matters
// specifically for the Claude artifact preview: .glb files aren't served from that sandboxed
// origin (they 404), and useLoader turns a failed fetch into a thrown render error with no
// built-in recovery - without a boundary here, that one missing model takes down every other
// building, the HUD, and the whole React tree with it. On the real self-hosted server the model
// loads normally and this boundary never engages.
class Catch extends Component {
  constructor(props) { super(props); this.state = { failed: false } }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error) {
    console.warn('[GLBBoundary] model failed to load, skipping it:', error?.message || error)
  }
  render() { return this.state.failed ? (this.props.fallback ?? null) : this.props.children }
}

export default function GLBBoundary({ children, fallback = null, urls }) {
  // with `urls`, first make sure every model file is really there; if one is missing, show the fallback
  // without mounting the loader (so no error is thrown at all). Without `urls`, behaves as before.
  const list = urls ? (Array.isArray(urls) ? urls : [urls]) : null
  const key = list ? list.join('|') : ''
  const [ready, setReady] = useState(list ? null : true) // null = checking, true = all present, false = missing
  useEffect(() => {
    if (!list) return
    let live = true
    Promise.all(list.map(modelAvailable)).then((oks) => { if (live) setReady(oks.every(Boolean)) })
    return () => { live = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  if (ready === null) return null
  if (ready === false) {
    if (!warned.has(key)) { warned.add(key); console.info('[GLBBoundary] model not hosted here, using the fallback:', key) }
    return fallback ?? null
  }
  return (
    <Catch fallback={fallback}>
      <Suspense fallback={null}>{children}</Suspense>
    </Catch>
  )
}

const warned = new Set()
