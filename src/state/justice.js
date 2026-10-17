import { create } from 'zustand'
import { useStore } from './store.js'

// Justice & Rehabilitation District: optional, fictional roleplay with NPCs.
// Rules baked into the data model:
//  - every scenario is NPC-only: other players are never cast, detained or imprisoned
//  - a scenario only runs after the player starts it, and can be ended at any step
//  - nothing here touches the player's account, wallet or any real record

export const SCENARIOS = [
  {
    id: 'booking',
    title: 'Booking walk-through',
    place: 'Police HQ',
    blurb: 'Follow a fictional person through intake: what officers do and what rights apply, step by step.',
    roles: [
      { id: 'observer', name: 'Observer', note: 'Watch the process and ask questions.' },
      { id: 'officer', name: 'Booking officer (trainee)', note: 'Make the calls an officer makes at each step.' },
    ],
    steps: [
      { speaker: 'Narrator', text: 'A fictional person, "Alex Doe", arrives at the front desk after a misdemeanour citation. Nobody is detained for real: Alex is an NPC.' },
      { speaker: 'Desk Sergeant', text: 'First we confirm identity and read the person their rights. Rights are explained before any questioning begins.' },
      { speaker: 'Booking Officer', text: 'Next: a property inventory, photo and fingerprints. Everything taken is logged and returned on release.' },
      { speaker: 'Medical Staff', text: 'A quick health screening. Anyone who needs medication or care gets it, whatever the charge.' },
      { speaker: 'Narrator', text: 'Alex is offered a phone call to a lawyer or family, then given a hearing date. Scenario complete. Visit the courthouse to see what happens at a hearing.' },
    ],
  },
  {
    id: 'smallclaims',
    title: 'Small claims: the broken drone',
    place: 'Courthouse',
    blurb: 'A civil case about a drone that was returned broken. Hear both sides and reach a verdict.',
    roles: [
      { id: 'juror', name: 'Juror', note: 'Listen to the evidence and vote.' },
      { id: 'observer', name: 'Public gallery', note: 'Watch from the benches.' },
      { id: 'attorney', name: 'Attorney (trainee)', note: 'Choose which question to ask.' },
    ],
    steps: [
      { speaker: 'Bailiff', text: 'All rise. The court of Vision Storms County is now in session. The Honorable Judge Reyes presiding. Please be seated.' },
      { speaker: 'Judge Reyes', text: 'This is a civil matter. Ms. Park says Mr. Cole borrowed her drone and returned it with a cracked frame. The question is who pays for the repair.' },
      { speaker: 'Attorney for Ms. Park', text: 'Your Honor, Exhibit A is the receipt: the drone was fine when lent and the repair quote is $240. Mr. Cole was the only person who flew it.' },
      { speaker: 'Attorney for Mr. Cole', text: 'Your Honor, Exhibit B is the weather report. A gust of wind forced the landing. It was an accident, not carelessness.' },
      { speaker: 'Judge Reyes', text: 'Both sides have been heard. In a real civil case the standard is "more likely than not". Is the borrower responsible for damage that happens while it is in his care?' },
      { speaker: 'Narrator', text: 'Reasonable people can disagree here: borrowers often owe care, but accidents happen. Verdict in this story: the repair cost is split. Scenario complete.' },
    ],
  },
  {
    id: 'traffic',
    title: 'Traffic court: the yellow light',
    place: 'Courthouse',
    blurb: 'A short hearing about a ticket. Learn how evidence, testimony and a ruling fit together.',
    roles: [
      { id: 'observer', name: 'Public gallery', note: 'Watch from the benches.' },
      { id: 'witness', name: 'Witness (trainee)', note: 'Practice answering questions truthfully and briefly.' },
    ],
    steps: [
      { speaker: 'Clerk', text: 'Case 41-B, a traffic citation. Parties please come forward.' },
      { speaker: 'Judge Reyes', text: 'The citation says the light was red. The driver says it was yellow. The officer will testify first.' },
      { speaker: 'Officer (NPC)', text: 'I observed the vehicle enter the intersection after the signal had turned red. My report was written the same hour.' },
      { speaker: 'Driver (NPC)', text: 'The light was yellow when I entered. I have dashcam footage.' },
      { speaker: 'Judge Reyes', text: 'The footage shows the light still yellow at entry. Ruling in this story: citation dismissed. Scenario complete.' },
    ],
  },
  {
    id: 'rehab',
    title: 'Rehabilitation: a day in the program',
    place: 'County Jail',
    blurb: 'Follow a fictional resident through classes, counseling and library time, and see how programs aim to reduce repeat offenses.',
    roles: [
      { id: 'observer', name: 'Visitor', note: 'Walk the program day and listen.' },
      { id: 'counselor', name: 'Counselor (trainee)', note: 'Choose how to support the resident at each step.' },
    ],
    steps: [
      { speaker: 'Narrator', text: 'A fictional resident, "Sam Doe", is a few weeks into a county program. Sam is an NPC; nobody is held or judged for real.' },
      { speaker: 'Teacher', text: 'Morning class is workplace skills: reading a pay stub, writing a resume, and what to say in an interview. Programs like this help people find steady work after release.' },
      { speaker: 'Librarian', text: 'Library time: Sam is working toward a high-school equivalency. Reading and study hours count toward the program.' },
      { speaker: 'Counselor', text: 'Afternoon counseling is about handling stress and making a plan: housing, work and who to call for support. Everything said in a session is confidential, with narrow safety exceptions.' },
      { speaker: 'Narrator', text: 'Staff and the court review Sam\'s progress, and a release plan is written. Scenario complete. The rehabilitation center is planned for this district next.' },
    ],
  },
  {
    id: 'reentry',
    title: 'Reentry: preparing for release',
    place: 'State Prison',
    blurb: 'Follow a fictional person through the months before release: skills, health care and a plan for housing and work.',
    roles: [
      { id: 'observer', name: 'Visitor', note: 'Walk the reentry process and listen.' },
      { id: 'caseworker', name: 'Caseworker (trainee)', note: 'Choose how to help build the release plan.' },
    ],
    steps: [
      { speaker: 'Narrator', text: 'A fictional person, "Jordan Doe", is six months from release after a long sentence. Jordan is an NPC; nobody is held or judged for real.' },
      { speaker: 'Caseworker', text: 'We start with documents: an ID, a birth certificate and a Social Security card. Without them, getting a job or housing is close to impossible.' },
      { speaker: 'Vocational Instructor', text: 'Jordan has finished a welding certificate in the workshop. Certificates like this, recognized by employers outside, are among the strongest predictors of steady work.' },
      { speaker: 'Nurse', text: 'Medical staff set up a supply of any needed medication and a first appointment with a clinic in the community, so care doesn\'t stop at the gate.' },
      { speaker: 'Caseworker', text: 'The plan: a room at a transition house, a job interview already scheduled, and a check-in with a counselor each week. Scenario complete.' },
    ],
  },
  {
    id: 'support',
    title: 'Support group: your first session',
    place: 'Rehabilitation Center',
    blurb: 'Sit in on a fictional first meeting and see how support groups work: listening, confidentiality, and taking it one day at a time.',
    roles: [
      { id: 'observer', name: 'Visitor', note: 'Listen from the edge of the circle.' },
      { id: 'participant', name: 'Participant (trainee)', note: 'Practice how to share, and how to pass.' },
    ],
    steps: [
      { speaker: 'Narrator', text: 'Everyone in this group is a fictional NPC. Nobody is asked to share anything real, and you can leave the room at any time.' },
      { speaker: 'Facilitator', text: 'Welcome. Three ground rules: what is said here stays here, one person speaks at a time, and anyone can pass. Passing is always okay.' },
      { speaker: 'Maria (NPC)', text: 'I\'m Maria. I\'m forty days into a new routine. The hard part is evenings, so I started walking with my neighbor. That\'s all I have today.' },
      { speaker: 'Facilitator', text: 'Thank you, Maria. Notice we don\'t give advice unless asked. We say what worked for us, and we listen.' },
      { speaker: 'Narrator', text: 'The group closes by naming one small thing each person will do tomorrow. If you ever need urgent help in real life, contact local emergency services or a crisis line. Scenario complete.' },
    ],
  },
]

export const scenarioById = (id) => SCENARIOS.find((s) => s.id === id)

export const useJustice = create((set, get) => ({
  // 'closed' | 'menu' | 'running' | 'done'
  view: 'closed',
  scenarioId: null,
  roleId: null,
  step: 0,
  reported: false,

  openMenu: (scenarioId) => set({ view: 'menu', scenarioId: scenarioId || null, roleId: null, step: 0, reported: false }),
  pick: (scenarioId) => set({ scenarioId, roleId: null, step: 0 }),
  setRole: (roleId) => set({ roleId }),
  start: () => { const s = get(); if (s.scenarioId && s.roleId) set({ view: 'running', step: 0 }) },
  next: () => {
    const s = get()
    const sc = scenarioById(s.scenarioId)
    if (!sc) return
    if (s.step + 1 >= sc.steps.length) set({ view: 'done' })
    else set({ step: s.step + 1 })
  },
  // ending is always available and takes effect immediately
  end: () => { set({ view: 'closed', scenarioId: null, roleId: null, step: 0 }); useStore.getState().closePanel() },
  report: () => set({ reported: true }),
}))
