// Spoken NPC dialogue, using the browser's own text-to-speech (the Web Speech API). No audio files, no
// server: it works offline and costs nothing, but it is a synthetic computer voice, not a voice actor —
// quality and the available voices vary by browser and device, and some mobile browsers only allow it
// after the player has already interacted with the page (which they always have, from the Enter button).
import { useStore } from '../state/store.js'
import { currentLocale, bcp47For, translate } from '../state/locale.js'

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
let voices = []
if (supported) {
  const load = () => { voices = window.speechSynthesis.getVoices() }
  load()
  window.speechSynthesis.onvoiceschanged = load
}

const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h) }

/**
 * A stable-ish voice/pitch pick for one NPC id, so the same person sounds the same each time -
 * narrowed first to voices matching the visitor's language (Settings > Language, auto-detected
 * from their browser by default), so a translated line is actually spoken in that language
 * rather than read with an English voice.
 */
function voiceFor(id, lang) {
  const inLang = lang ? voices.filter((v) => v.lang?.toLowerCase().startsWith(lang.slice(0, 2))) : []
  const pool = inLang.length ? inLang : voices
  const n = pool.length
  const h = hash(id || 'npc')
  const voice = n ? pool[h % n] : null
  const pitch = 0.88 + (h % 25) / 100 // 0.88..1.12
  const rate = 0.96 + ((h >> 5) % 14) / 100 // 0.96..1.09
  return { voice, pitch, rate }
}

/**
 * Speak an NPC's line aloud, if the player has spoken dialogue on (Settings → NPC voices). `id` picks a
 * consistent voice/pitch for that character; `text` should be the line only (no "Name: " prefix — pass
 * `name` separately so it is not read aloud). Cancels whatever was being said so lines do not pile up.
 *
 * The line is translated into the visitor's language when a translation is on file
 * (state/locale.js) and spoken with a voice in that language; otherwise it is read in English as
 * written. Call `translatedLine(text)` first if you also want to show the same translated text
 * in a toast or subtitle.
 */
export function speakLine(text, { id, name } = {}) {
  if (!supported || !text) return
  if (!useStore.getState().settings.npcVoice) return
  try {
    const locale = currentLocale()
    const said = translate(text, locale)
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(said)
    u.lang = bcp47For(locale)
    const { voice, pitch, rate } = voiceFor(id || name, u.lang)
    if (voice) u.voice = voice
    u.pitch = pitch
    u.rate = rate
    u.volume = 0.85
    window.speechSynthesis.speak(u)
  } catch { /* speech synthesis is unavailable or blocked here; the toast text still shows */ }
}

/** The same translation speakLine uses, for showing matching text in a toast or subtitle. */
export const translatedLine = (text) => translate(text)

export function stopSpeech() { if (supported) { try { window.speechSynthesis.cancel() } catch {} } }
export const ttsSupported = supported
