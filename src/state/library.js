import { create } from 'zustand'
import { PROJECTS, TEACHERS, LIBRARIAN, FALLBACK_TIPS, BOOKS } from '../config/library.js'

// Library progress: which projects you joined, which steps you ticked, the badges you earned.
// Saved on this device only (localStorage), like the jobs wallet.
const KEY = 'vsw-library'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null } }
const saved = load() || {}

export const useLibrary = create((set, get) => {
  const persist = () => { const { progress, badges, visits } = get(); try { localStorage.setItem(KEY, JSON.stringify({ progress, badges, visits })) } catch {} }
  return {
    progress: saved.progress || {}, // { [projectId]: { steps: boolean[], done: boolean } }
    badges: saved.badges || [],
    visits: saved.visits || 0,
    teacherId: null,
    view: 'teacher', // 'teacher' | 'projects'
    open: (teacherId, view = 'teacher') => set({ teacherId, view }),
    join: (pid) => {
      const p = PROJECTS[pid]
      if (!p || get().progress[pid]) return
      set({ progress: { ...get().progress, [pid]: { steps: p.steps.map(() => false), done: false } } }); persist()
    },
    toggleStep: (pid, i) => {
      const p = PROJECTS[pid], cur = get().progress[pid]
      if (!p || !cur) return null
      const steps = cur.steps.slice(); steps[i] = !steps[i]
      const done = steps.every(Boolean)
      const badges = done && !get().badges.includes(p.badge) ? [...get().badges, p.badge] : get().badges
      set({ progress: { ...get().progress, [pid]: { steps, done } }, badges }); persist()
      return { done, justDone: done && !cur.done, ticked: steps[i] }
    },
    reset: (pid) => { const pr = { ...get().progress }; delete pr[pid]; set({ progress: pr }); persist() },
    visit: () => { set({ visits: get().visits + 1 }); persist() },
  }
})

/** What each NPC is doing right now ("reading", "teaching"...), written by the NPC controller, read by the panel. */
export const live = {}

export const personOf = (id) => TEACHERS.find((t) => t.id === id) || (id === LIBRARIAN.id ? LIBRARIAN : null)

const pick = (arr, n) => arr[Math.abs(n) % arr.length]
let tipN = 0
export const fallbackTip = (id) => pick(FALLBACK_TIPS[id] || FALLBACK_TIPS.okafor, tipN++)

/** True when this page can ask Claude (the published artifact, with the `sample` capability). */
export async function canAsk() {
  try { return !!(await window.claude?.use?.('sample')) } catch { return false }
}

/**
 * Ask a teacher a free-form question. Uses the viewer's own Claude through the artifact `sample` capability when
 * it is available; otherwise rejects { code: 'unavailable' } and the panel falls back to a pre-written tip.
 * `history` is [{ role: 'user' | 'assistant', content }] ending with the new question.
 */
export async function askTeacher(teacher, history, ctx = {}, opts = {}) {
  const sample = await window.claude?.use?.('sample').catch(() => null)
  if (!sample) throw { code: 'unavailable', message: 'Not available here' }
  const proj = ctx.project
  const book = BOOKS[teacher.book]
  const persona = [
    `You are ${teacher.name}, ${teacher.subject.toLowerCase()} teacher at the Vision Storms Public Library, in a 3D virtual city.`,
    teacher.bio ? `About you: ${teacher.bio}` : '',
    book ? `You are currently reading "${book.title}" by ${book.by}.` : '',
    proj ? `The visitor is working on the project "${proj.title}" (${proj.steps.length} steps: ${proj.steps.map((s, i) => `${i + 1}. ${s[0]}`).join('; ')}). They have finished ${ctx.stepsDone || 0} step(s).` : '',
    'Speak as this teacher: warm, patient, practical, at most 4 short sentences, no lists unless asked.',
    'The visitors are community members of all ages, so keep everything family-friendly. Do not give medical, legal or investment advice; point to a professional instead.',
    'Stay in character as a library teacher. If asked something unsafe, hateful or sexual, kindly decline and steer back to learning. Do not claim to be human if sincerely asked: you are an AI teacher character in this world.',
    'Never reproduce long passages of copyrighted books; summarise and suggest where to find them instead.',
  ].filter(Boolean).join('\n')
  const turns = history.map((h, i) => (i === 0 && h.role === 'user' ? { role: 'user', content: `${persona}\n\nVisitor says: ${h.content}` } : h))
  const { text } = await sample(turns, { modelTier: 'quick', cache: false, signal: opts.signal, onText: opts.onText })
  return text
}
