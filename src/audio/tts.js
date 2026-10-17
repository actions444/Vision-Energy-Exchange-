// Spoken NPC dialogue, using the browser's own text-to-speech (the Web Speech API). No audio files, no
// server: it works offline and costs nothing, but it is a synthetic computer voice, not a voice actor —
// quality and the available voices vary by browser and device, and some mobile browsers only allow it
// after the player has already interacted with the page (which they always have, from the Enter button).
import { useStore } from '../state/store.js'

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
let voices = []
if (supported) {
  const load = () => { voices = window.speechSynthesis.getVoices() }
  load()
  window.speechSynthesis.onvoiceschanged = load
}

const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) }

/** A stable-ish voice/pitch pick for one NPC id, so the same person sounds the same each time. */
function voiceFor(id) {
  const n = voices.length
  const h = hash(id || 'npc')
  const voice = n ? voices[h % n] : null
  const pitch = 0.88 + (h % 25) / 100 // 0.88..1.12
  const rate = 0.96 + ((h >> 5) % 14) / 100 // 0.96..1.09
  return { voice, pitch, rate }
}

/**
 * Speak an NPC's line aloud, if the player has spoken dialogue on (Settings → NPC voices). `id` picks a
 * consistent voice/pitch for that character; `text` should be the line only (no "Name: " prefix — pass
 * `name` separately so it is not read aloud). Cancels whatever was being said so lines do not pile up.
 */
export function speakLine(text, { id, name } = {}) {
  if (!supported || !text) return
  if (!useStore.getState().settings.npcVoice) return
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    const { voice, pitch, rate } = voiceFor(id || name)
    if (voice) u.voice = voice
    u.pitch = pitch
    u.rate = rate
    u.volume = 0.85
    window.speechSynthesis.speak(u)
  } catch { /* speech synthesis is unavailable or blocked here; the toast text still shows */ }
}

export function stopSpeech() { if (supported) { try { window.speechSynthesis.cancel() } catch {} } }
export const ttsSupported = supported
