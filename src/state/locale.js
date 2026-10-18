// Spoken-language support: the game's UI text stays in English (that's a much larger, separate
// rewrite of every string in the codebase), but NPC dialogue spoken aloud through audio/tts.js -
// including every resident's greeting in the new Residence Tower - is translated into the
// visitor's own language when a translation is on file, and the text-to-speech voice/accent is
// always picked to match that language rather than defaulting to an English one.
//
// The language is auto-detected from the visitor's browser (the language they "signed up"
// under, in a browser game with no accounts, is simply the language their browser and OS are
// set to) on first visit, and can be overridden any time in Settings > Language. The choice is
// remembered in this browser.
import { create } from 'zustand'

export const LOCALES = [
  { code: 'en', label: 'English', bcp47: 'en-US' },
  { code: 'es', label: 'Español', bcp47: 'es-ES' },
  { code: 'fr', label: 'Français', bcp47: 'fr-FR' },
  { code: 'de', label: 'Deutsch', bcp47: 'de-DE' },
  { code: 'pt', label: 'Português', bcp47: 'pt-BR' },
  { code: 'it', label: 'Italiano', bcp47: 'it-IT' },
  { code: 'zh', label: '中文', bcp47: 'zh-CN' },
]
const CODES = new Set(LOCALES.map((l) => l.code))

function detect() {
  if (typeof navigator === 'undefined') return 'en'
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language || 'en']
  for (const l of langs) {
    const base = (l || '').split('-')[0].toLowerCase()
    if (CODES.has(base)) return base
  }
  return 'en'
}

function loadSaved() {
  try { return localStorage.getItem('vsw-locale') } catch { return null }
}

export const useLocale = create((set) => ({
  locale: loadSaved() || detect(),
  auto: !loadSaved(),
  setLocale(code) {
    set({ locale: CODES.has(code) ? code : 'en', auto: false })
    try { localStorage.setItem('vsw-locale', code) } catch {}
  },
  useAutoDetect() {
    const d = detect()
    set({ locale: d, auto: true })
    try { localStorage.removeItem('vsw-locale') } catch {}
  },
}))

/** Current locale code without subscribing to the store (for use outside React, e.g. tts.js). */
export const currentLocale = () => useLocale.getState().locale
export const bcp47For = (code) => LOCALES.find((l) => l.code === code)?.bcp47 || 'en-US'

// English source line -> translations. Extend this as more of the game's NPC dialogue gets
// localized; anything not listed here is simply spoken/shown in English, so adding a game-wide
// dictionary is additive and safe to grow over time.
const DICT = {
  "Welcome to my studio — make yourself at home.": {
    es: 'Bienvenido a mi estudio, siéntete como en casa.',
    fr: 'Bienvenue dans mon studio, fais comme chez toi.',
    de: 'Willkommen in meinem Studio, fühl dich wie zu Hause.',
    pt: 'Bem-vindo ao meu estúdio, fique à vontade.',
    it: 'Benvenuto nel mio studio, fai come se fossi a casa tua.',
    zh: '欢迎来到我的录音室，就像在家一样。',
  },
  "I'm mixing a new track, can you hear that bassline?": {
    es: 'Estoy mezclando un tema nuevo, ¿oyes ese bajo?',
    fr: "Je mixe un nouveau morceau, tu entends cette ligne de basse ?",
    de: 'Ich mische gerade einen neuen Track, hörst du die Basslinie?',
    pt: 'Estou mixando uma faixa nova, está ouvindo essa linha de baixo?',
    it: 'Sto mixando un nuovo brano, senti quella linea di basso?',
    zh: '我在混一首新曲子，你听到那个贝斯线了吗？',
  },
  "Door's open — take a seat, I was just reviewing numbers.": {
    es: 'La puerta está abierta, siéntate, estaba revisando números.',
    fr: "La porte est ouverte, assieds-toi, je révisais des chiffres.",
    de: 'Die Tür ist offen, setz dich, ich habe gerade Zahlen durchgesehen.',
    pt: 'A porta está aberta, sente-se, eu estava revisando números.',
    it: 'La porta è aperta, siediti, stavo controllando dei numeri.',
    zh: '门开着呢，坐吧，我正在看数据。',
  },
  'Make yourself comfortable. The view from here never gets old.': {
    es: 'Ponte cómodo. La vista desde aquí nunca aburre.',
    fr: "Installe-toi confortablement. La vue d'ici ne lasse jamais.",
    de: 'Mach es dir bequem. Die Aussicht von hier wird nie langweilig.',
    pt: 'Fique à vontade. A vista daqui nunca cansa.',
    it: 'Mettiti comodo. La vista da qui non stanca mai.',
    zh: '随便坐。这里的景色百看不厌。',
  },
  'Love having people see the design studio mid-process.': {
    es: 'Me encanta que la gente vea el estudio de diseño a medio proceso.',
    fr: "J'adore que les gens voient le studio de design en plein travail.",
    de: 'Ich liebe es, wenn Leute das Designstudio mitten im Prozess sehen.',
    pt: 'Adoro que as pessoas vejam o estúdio de design no meio do processo.',
    it: 'Adoro che la gente veda lo studio di design a lavori in corso.',
    zh: '我很喜欢让大家看到设计工作室进行中的样子。',
  },
  'Grab a seat — I was just sketching the next collection.': {
    es: 'Siéntate, estaba bocetando la próxima colección.',
    fr: "Prends une chaise, j'étais en train d'esquisser la prochaine collection.",
    de: 'Setz dich, ich habe gerade die nächste Kollektion skizziert.',
    pt: 'Sente-se, eu estava esboçando a próxima coleção.',
    it: 'Siediti, stavo abbozzando la prossima collezione.',
    zh: '坐吧，我正在构思下一个系列。',
  },
  'Welcome to my little creative corner.': {
    es: 'Bienvenido a mi pequeño rincón creativo.',
    fr: 'Bienvenue dans mon petit coin créatif.',
    de: 'Willkommen in meiner kleinen kreativen Ecke.',
    pt: 'Bem-vindo ao meu cantinho criativo.',
    it: 'Benvenuto nel mio piccolo angolo creativo.',
    zh: '欢迎来到我的创意小天地。',
  },
  "I'm always happiest with paint on my hands.": {
    es: 'Siempre soy más feliz con pintura en las manos.',
    fr: 'Je suis toujours plus heureuse avec de la peinture sur les mains.',
    de: 'Am glücklichsten bin ich immer mit Farbe an den Händen.',
    pt: 'Sou sempre mais feliz com tinta nas mãos.',
    it: 'Sono sempre più felice con la vernice sulle mani.',
    zh: '手上沾满颜料的时候我最开心。',
  },
  'Welcome to The Pink Standard, darling.': {
    es: 'Bienvenido a The Pink Standard, cariño.',
    fr: 'Bienvenue chez The Pink Standard, chéri.',
    de: 'Willkommen bei The Pink Standard, Schatz.',
    pt: 'Bem-vindo ao The Pink Standard, querido.',
    it: 'Benvenuto a The Pink Standard, tesoro.',
    zh: '欢迎来到 The Pink Standard，亲爱的。',
  },
  'Feel free to look around — glamour is a lifestyle here.': {
    es: 'Siéntete libre de mirar, el glamour es un estilo de vida aquí.',
    fr: "N'hésite pas à regarder, le glamour est un style de vie ici.",
    de: 'Schau dich ruhig um, Glamour ist hier ein Lebensstil.',
    pt: 'Fique à vontade para olhar, glamour é um estilo de vida aqui.',
    it: "Sentiti libero di guardarti intorno, qui il glamour è uno stile di vita.",
    zh: '随便看看吧，这里的生活方式就是魅力本身。',
  },
}

/** Translate a known English line into `locale` (defaults to the current one). Unknown lines,
 *  or locales with no entry for that line, fall back to the English original. */
export function translate(enText, locale = currentLocale()) {
  if (locale === 'en') return enText
  return DICT[enText]?.[locale] || enText
}
