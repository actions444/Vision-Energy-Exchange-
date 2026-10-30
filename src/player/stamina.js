// Sprint stamina: pure rules, no three.js or physics imports, so they run under `node --test`.
export const STAMINA = { max: 100, drain: 22, regen: 16, minToSprint: 8 }

/** Sprint is allowed while stamina is high enough, or while already sprinting with some left. */
export function canSprint(stamina, wantSprint, alreadySprinting) {
  if (!wantSprint) return false
  return alreadySprinting ? stamina > 0 : stamina >= STAMINA.minToSprint
}

/** Drain while sprinting, recover otherwise. Clamped to 0..max. */
export function stepStamina(stamina, sprinting, dt) {
  const next = sprinting ? stamina - STAMINA.drain * dt : stamina + STAMINA.regen * dt
  return Math.max(0, Math.min(STAMINA.max, next))
}
