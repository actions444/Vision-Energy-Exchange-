import { create } from 'zustand'

const read = () => { try { return localStorage.getItem('vsw-admin') === '1' } catch { return false } }

// Admin tools are a convenience switch on this device, not access control.
// Real access control needs a backend login (see README).
export const useMusicAdmin = create((set) => ({
  adminTools: read(),
  showZones: false,
  setAdminTools: (v) => { try { localStorage.setItem('vsw-admin', v ? '1' : '0') } catch {} ; set({ adminTools: v }) },
  setShowZones: (v) => set({ showZones: v }),
}))
