// Owner access log. Every time the owner uses owner access to enter a space a customer has
// booked privately (or inspects it), an entry is written to `audit/` in the backend, which only
// the owner can read. Customers' privacy settings are never changed by owner access.
import { create } from 'zustand'
import { backend, useBackend } from '../backend/backend.js'

export const useAudit = create(() => ({ entries: [], loaded: false }))
const local = [] // no backend: kept for this visit only

let started = false
export function startAudit() {
  const api = backend()
  if (!api || started || !useBackend.getState().admin) return
  started = true
  api.sub('audit', (docs) => useAudit.setState({ entries: docs.sort((a, b) => (b.at || '').localeCompare(a.at || '')).slice(0, 300), loaded: true }))
}

/** Record owner access. `kind`: 'entry' | 'inspect' | 'teleport'. */
export async function logAccess({ kind, roomId, roomName, detail }) {
  const entry = { kind, roomId, roomName: roomName || roomId, detail: detail || '', at: new Date().toISOString(), by: 'owner' }
  const api = backend()
  if (!api || !useBackend.getState().admin) { local.unshift(entry); useAudit.setState({ entries: [...local] }); return }
  const id = 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  try { await api.set('audit/' + id, entry) } catch (e) { console.warn('audit log failed', e) }
}
