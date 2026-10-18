// NPC taxi service: a small, curated network of real in-game landmarks a cab can take you to,
// plus the fare math. Kept separate from the full ZONES list because not every zone (an
// elevator lobby, a single apartment) is a sensible place to be dropped off.
import { zoneById } from './rooms.js'

const DEST_IDS = ['plaza', 'job-center', 'post-office', 'gym', 'museum', 'library', 'mansion', 'courthouse']

export const TAXI_DESTINATIONS = DEST_IDS
  .map((id) => { const z = zoneById(id); return z ? { id: z.id, name: z.name, spawn: z.spawn } : null })
  .filter(Boolean)

// Two taxi stands so two trips can be running at once. Each has its own cab, parked until hailed.
export const TAXI_STANDS = [
  { id: 'stand-plaza', zoneId: 'plaza', color: '#f2c230' },
  { id: 'stand-job-center', zoneId: 'job-center', color: '#f2c230' },
].map((s) => ({ ...s, spawn: zoneById(s.zoneId).spawn }))

export const TAXI_SPEED = 9 // m/s - a bit brisker than background traffic
export const TAXI_BASE_FARE = 15
export const TAXI_PER_100M = 8

export function fareFor(fromSpawn, toSpawn) {
  const dx = toSpawn[0] - fromSpawn[0]
  const dz = toSpawn[2] - fromSpawn[2]
  const dist = Math.hypot(dx, dz)
  return Math.round(TAXI_BASE_FARE + (dist / 100) * TAXI_PER_100M)
}
