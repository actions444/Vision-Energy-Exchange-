// Vision Storms Public Library: layout, the teacher cast, the books they read and the projects they run.
// World metres. The building sits on the raised sidewalk (CURB) in the south-west block, front door facing the
// avenue (east). Everything here is original: names, bios, project plans and short feedback lines are written
// for this world; book titles are just titles.
export const CURB = 0.15
export const LIB = { x0: -92, x1: -48, z0: -76, z1: -40 }
export const LIB_H = 5.8
export const LIB_DOOR_Z = -58
export const LIB_ZONE = 'library'

/** Four project tables in the Project Lab. `t` is the table centre; the teacher stands on its north side. */
export const STATIONS = {
  writing: { id: 'writing', name: 'Writing Lab', t: [-67, -53], size: [3.6, 1.3] },
  maker: { id: 'maker', name: 'Maker Bench', t: [-58, -53], size: [3.6, 1.3] },
  art: { id: 'art', name: 'Art Studio', t: [-67, -45], size: [3.6, 1.3] },
  code: { id: 'code', name: 'Code & Media Desk', t: [-58, -45], size: [3.6, 1.3] },
}
export const teacherSpot = (st) => [st.t[0], st.t[1] + 1.25]
export const BOARD_SIDE = { writing: -1, art: -1, maker: 1, code: 1 } // which side of the table the whiteboard stands on
export const patronSeat = (st) => [st.t[0] - 1.2, st.t[1] - 1.0] // south side, facing north (yaw 0)

/** Reading room: three long tables along the south windows. NPC-only end chairs face the table. */
export const READING = [-70, -63, -56].map((x) => ({ t: [x, -70.5], size: [4.2, 1.3] }))

/** Stack rows: [x0, x1, z, yawFacing] (shelves are 0.4 deep, books face `yaw`). */
export const STACK_X = [-90.6, -77.0]
export const STACK_ROWS = [
  [-75.2, 0], // against the south wall, faces north (+z)
  [-67.2, Math.PI], [-66.8, 0], // back-to-back pairs: the lower-z shelf faces south, the higher-z one faces north
  [-62.2, Math.PI], [-61.8, 0],
  [-57.2, Math.PI], [-56.8, 0],
  [-52.2, Math.PI], [-51.8, 0],
]
export const AISLES = [-71.2, -64.5, -59.5, -54.5] // aisle centre lines (z)
export const STACK_SIGNS = ['FICTION', 'SCIENCE', 'HISTORY', 'ART & MUSIC']

export const STORY = { x0: -91, x1: -78, z0: -47, z1: -41.2 } // children's corner (NW)

/** Where NPCs sit to read in the reading room: [x, z, yaw] */
export const READ_SEATS = [
  [READING[0].t[0] - 2.65, READING[0].t[1], Math.PI / 2],
  [READING[1].t[0] + 2.65, READING[1].t[1], -Math.PI / 2],
  [READING[2].t[0] - 2.65, READING[2].t[1], Math.PI / 2],
  [READING[2].t[0] + 2.65, READING[2].t[1], -Math.PI / 2],
]

export const BOOKS = {
  okafor: { title: 'Things Fall Apart', by: 'Chinua Achebe', note: 'Re-reading the opening chapters for the next book circle.' },
  bell: { title: 'A Brief History of Time', by: 'Stephen Hawking', note: 'Looking for the clearest way to explain it to a ten-year-old.' },
  vargas: { title: 'The Story of Art', by: 'E. H. Gombrich', note: 'Flipping to the colour plates for inspiration.' },
  kim: { title: 'Eloquent JavaScript', by: 'Marijn Haverbeke', note: 'Checking the chapter on events before the game-making session.' },
  whitfield: { title: 'Where the Wild Things Are', by: 'Maurice Sendak', note: 'Practising the voices for story hour.' },
  brooks: { title: 'The Richest Man in Babylon', by: 'George S. Clason', note: 'Reading the savings parables aloud to a student.' },
  carter: { title: 'The Library Book', by: 'Susan Orlean', note: 'On her lunch break.' },
}

/** The teachers. look = Avatar social look fields; `ride` etc. are filled in by the NPC controller. */
export const TEACHERS = [
  {
    id: 'okafor', name: 'Prof. Amara Okafor', short: 'Prof. Okafor', subject: 'Literature & Creative Writing', station: 'writing', skin: '#7a4a32',
    look: { build: 'f', hairStyle: 'bun', hair: '#0e0807', eyes: '#3a2316', lips: '#8a2f44', modest: true, glasses: true, glassesColor: '#7a4a1e', top: '#f1ece2', coat: '#6e3b6b', bottom: '#26262e', shoe: '#2b1a12', hoops: true },
    bio: 'Twenty years of teaching writing. She believes every neighbour has a book in them and that the first draft is allowed to be bad.',
    greeting: 'Welcome in. Pull up a chair at the Writing Lab: we are binding a mini-book today.',
    book: 'okafor', project: 'minibook',
  },
  {
    id: 'bell', name: 'Dr. Marcus Bell', short: 'Dr. Bell', subject: 'Science & Making', station: 'maker', skin: '#8a5a3c',
    look: { build: 'm', hair: '#0f0b09', beard: true, eyes: '#2f1d12', glasses: true, top: '#415f86', casual: true, coat: '#f4f5f7', bottom: '#2b2e35', shoe: '#e9e9ec' },
    bio: 'A former lab engineer who runs the Maker Bench. Loves anything with a battery, a magnet or a good question attached.',
    greeting: 'Safety glasses on, curiosity up. Today we are building a solar night-light.',
    book: 'bell', project: 'nightlight',
  },
  {
    id: 'vargas', name: 'Ms. Elena Vargas', short: 'Ms. Vargas', subject: 'Art & Design', station: 'art', skin: '#c58d66',
    look: { build: 'f', hair: '#2a130d', eyes: '#3b2314', lips: '#b04a4a', modest: true, top: '#cf5a36', coat: '#2f5d5a', bottom: '#202a40', shoe: '#6b4a2f', hoops: true, chain: 'gold' },
    bio: 'A painter turned community art teacher. Her rule: look twice, then make something that is yours.',
    greeting: 'Hello! Grab a brush or a pair of scissors. We are mapping our neighbourhood in collage.',
    book: 'vargas', project: 'collage',
  },
  {
    id: 'kim', name: 'Mr. Daniel Kim', short: 'Mr. Kim', subject: 'Coding & Digital Media', station: 'code', skin: '#dfb590',
    look: { build: 'm', hair: '#0b0b0e', eyes: '#1d130d', glasses: true, glassesColor: '#2a2a31', top: '#2f3442', casual: true, bottom: '#59607a', shoe: '#f1f1f3' },
    bio: 'Builds small games and websites with beginners. He keeps a jar of rubber ducks for debugging and he is not joking.',
    greeting: 'Hey! Laptop open? Today we make a tiny game from scratch.',
    book: 'kim', project: 'tinygame',
  },
  {
    id: 'whitfield', name: 'Ms. Grace Whitfield', short: 'Ms. Whitfield', subject: 'Story Hour & Early Learning', station: null, skin: '#efc6a6',
    look: { build: 'f', hairStyle: 'bob', hair: '#c4bdb2', eyes: '#5c7a8a', lips: '#b0626a', modest: true, glasses: true, glassesColor: '#a65a5a', top: '#8fb79b', coat: '#e8d9a8', bottom: '#39414f', shoe: '#7d5b3a' },
    bio: 'The voice of the Story Circle. Forty years of reading aloud to every kind of listener, and still does all the voices.',
    greeting: 'Come sit on the rug. We are reading and then retelling the story in our own words.',
    book: 'whitfield', project: 'retell',
  },
  {
    id: 'brooks', name: 'Mr. Theo Brooks', short: 'Mr. Brooks', subject: 'History, Civics & Money Skills', station: null, skin: '#5c3b29',
    look: { build: 'm', hair: '#dedede', beard: true, eyes: '#2a1a10', glasses: true, glassesColor: '#3a3a42', top: '#6b4d2e', blazer: true, shirt: '#e8e2d2', tie: '#7a2a2a', bottom: '#2f3035', shoe: '#2a1a12' },
    bio: 'A retired city clerk who teaches how neighbourhoods and household budgets actually work. Patient, funny, and he always has a story.',
    greeting: 'Good to see you. Want to learn how a small budget can run a whole block party?',
    book: 'brooks', project: 'budget',
  },
]

export const LIBRARIAN = {
  id: 'carter', name: 'Ms. Nia Carter', short: 'Ms. Carter', subject: 'Head Librarian', skin: '#6b4332',
  look: { build: 'f', hairStyle: 'afro', hair: '#0c0706', eyes: '#2a170e', lips: '#8a3248', modest: true, top: '#2f6a6a', blazer: true, bottom: '#1f2330', shoe: '#1a1a1d', pendant: '#d4af5a', glasses: true, glassesColor: '#c9a24a' },
  greeting: 'Welcome to the Vision Storms Public Library. Library cards are free: ask any teacher about a project.',
  book: 'carter',
}

/** Community visitors who come in to read and work on projects with the teachers (the people of the city). */
export const PATRONS = [
  { id: 'jordan', name: 'Jordan', skin: '#a86f4c', look: { build: 'm', hair: '#0d0908', casual: true, top: '#c8a02a', bottom: '#3a4358', shoe: '#f2f2f2' }, home: 'writing' },
  { id: 'priya', name: 'Priya', skin: '#b9794f', look: { build: 'f', hair: '#120a07', modest: true, top: '#7a3f8f', bottom: '#2a2c36', shoe: '#e8e8ea' }, home: 'maker' },
  { id: 'mateo', name: 'Mateo', skin: '#cf9a74', look: { build: 'm', hair: '#1a0f0a', casual: true, top: '#3b7a5a', bottom: '#232733', shoe: '#c9c9cc' }, home: 'art' },
  { id: 'lily', name: 'Lily', skin: '#f0cfb2', look: { build: 'f', hairStyle: 'bob', hair: '#6b4a2a', modest: true, top: '#d9718a', bottom: '#3b4458', shoe: '#f1f1f3' }, home: 'code' },
  { id: 'hall', name: 'Mr. Hall', skin: '#7b5038', look: { build: 'm', hair: '#d6d6d6', beard: true, casual: true, top: '#8a3d3d', bottom: '#3d3f45', shoe: '#2b2b30' }, home: 'read' },
  { id: 'mei', name: 'Mei', skin: '#e1b890', look: { build: 'f', hair: '#0a0a0c', modest: true, top: '#e8e2d0', coat: '#a3c2d6', bottom: '#2b2e3a', shoe: '#2f2f35' }, home: 'story' },
]

/** Projects. Each has plain-language steps; the teacher gives a feedback line when a step is ticked. */
export const PROJECTS = {
  minibook: {
    id: 'minibook', title: 'Write & Bind a Mini-Book', teacher: 'okafor', time: '45 min', badge: 'Author',
    blurb: 'Make a real 8-page book about your street, your family or something you imagined, then fold and bind it.',
    steps: [
      ['Pick your idea', 'Choose one subject you could talk about for ten minutes. Browse Fiction for how other writers start.', 'Good. A small, specific idea beats a big, vague one every time.'],
      ['Outline eight pages', 'One sentence per page: beginning, a problem, three attempts, a turn, an ending.', 'Eight pages is plenty. Notice where the turn lands, that is your story.'],
      ['Draft fast', 'Write each page without stopping to fix it. Bad first drafts are allowed.', 'You finished a draft. Most people never get that far, so enjoy it.'],
      ['Read it aloud and edit', 'Read to a neighbour at the table. Cut one thing, sharpen one thing.', 'Reading aloud finds what your eyes skip. Nice trims.'],
      ['Fold, bind and share', 'Fold the sheet into a booklet, stitch the spine, and leave a copy on the Local Authors shelf.', 'Your book is on the shelf now. You are an author in this library.'],
    ],
  },
  nightlight: {
    id: 'nightlight', title: 'Build a Solar Night-Light', teacher: 'bell', time: '60 min', badge: 'Maker',
    blurb: 'Wire a small solar panel, a rechargeable cell and an LED so it charges by day and glows at night.',
    steps: [
      ['Safety and parts check', 'Glasses on. Lay out the panel, cell holder, switch, LED and wires. Count them.', 'Good habit. Every project starts with knowing what is on the table.'],
      ['Draw the circuit', 'Sketch panel to cell, cell to switch, switch to LED. Add one resistor to protect the LED.', 'That sketch is the whole project. The rest is following it.'],
      ['Connect and test in the light', 'Join the wires, set the panel by the window, and check the charge indicator.', 'It charges. You made electricity do a job.'],
      ['Mount it in a shade', 'Fit the LED inside a paper or card lampshade so the light spreads evenly.', 'Nice. The shade matters as much as the circuit.'],
      ['Test at dusk', 'Ask a teacher to dim the lights, or wait for evening, and see it glow.', 'It glowed. Now explain to someone how it works, that is the real test.'],
    ],
  },
  collage: {
    id: 'collage', title: 'Collage Your Neighbourhood Map', teacher: 'vargas', time: '50 min', badge: 'Artist',
    blurb: 'Build a map of the places that matter to you using paper, fabric scraps, magazine cut-outs and paint.',
    steps: [
      ['Walk it in your head', 'List five places you love and one you would change. Sketch their rough positions.', 'Good list. Notice the one you would change, that is interesting.'],
      ['Choose a colour story', 'Pick three main colours and one accent from the palette trays.', 'Limiting your colours makes the picture feel confident.'],
      ['Tear and place', 'Tear paper for buildings and parks. Place everything before gluing.', 'Torn edges look warmer than cut ones. Good eye.'],
      ['Glue, layer and paint details', 'Glue from back to front, then add windows, trees and paths in paint.', 'Layers give it depth. Step back and look.'],
      ['Title and display', 'Name your map and pin it on the Community Wall by the entrance.', 'Your work is on the wall. People will find their own streets in it.'],
    ],
  },
  tinygame: {
    id: 'tinygame', title: 'Make a Tiny Game', teacher: 'kim', time: '60 min', badge: 'Coder',
    blurb: 'Build a one-button game with a score: a character, a goal, an obstacle and a way to win or lose.',
    steps: [
      ['Define the game in one line', 'Write: "You are ___, you want ___, but ___ gets in the way."', 'Clear premise. Everything else follows from that line.'],
      ['Draw the screen and rules', 'Sketch the screen, list what moves, and what happens on a hit.', 'Good. Notice how few rules you actually need.'],
      ['Make it move', 'Open the starter project and make the character respond to one key.', 'It moves. That moment never gets old.'],
      ['Add the goal and the obstacle', 'Create something to collect and something to avoid, then add a score.', 'You have a game now. Playtest it before you touch anything else.'],
      ['Playtest with a neighbour', 'Let someone else play without instructions. Change one thing they got stuck on.', 'Watching someone else play is the best debugging there is.'],
    ],
  },
  retell: {
    id: 'retell', title: 'Read-Along & Retell', teacher: 'whitfield', time: '30 min', badge: 'Storyteller',
    blurb: 'Listen to a picture book on the Story Circle rug, then retell it with puppets or your own drawings.',
    steps: [
      ['Settle on the rug', 'Find a spot on the Story Circle rug and listen to the first read-through.', 'Wonderful listening. Ears and eyes both count.'],
      ['Notice three things', 'What was the problem? Who helped? How did it end?', 'You caught the shape of the story. That is the skill.'],
      ['Make puppets or draw scenes', 'Use paper puppets or three drawings for beginning, middle and end.', 'Lovely. Your characters look like they could walk off the page.'],
      ['Retell it in your own words', 'Tell it to a friend, changing one thing on purpose.', 'You told it your way. That is how stories stay alive.'],
    ],
  },
  budget: {
    id: 'budget', title: 'Plan a Block-Party Budget', teacher: 'brooks', time: '40 min', badge: 'Planner',
    blurb: 'Plan a neighbourhood party with 500 credits: what to buy, what to share and how to keep a reserve.',
    steps: [
      ['List every need', 'Food, music, tables, permits and clean-up. Write them all down before pricing anything.', 'A complete list is half the budget. Good start.'],
      ['Price the list', 'Give each item a realistic price and sort needs from wants.', 'Notice how much the wants add up to. That is normal.'],
      ['Split it into three jars', 'Spend, save and share: set a percentage for each, with a 10 percent reserve.', 'The reserve is the grown-up part. Well done.'],
      ['Find free help', 'Which items can neighbours donate or lend? Update the numbers.', 'Communities do this naturally. You just made it a plan.'],
      ['Present the plan', 'Explain it to Mr. Brooks in two minutes and answer one question.', 'Clear and honest. You could present this to a real neighbourhood board.'],
    ],
  },
}

export const FALLBACK_TIPS = {
  okafor: ['Start in the middle of the action and come back for the background later.', 'Read your sentence out loud. If you run out of breath, split it.', 'Specific nouns beat adjectives: say "a cracked blue mug" not "a nice cup".'],
  bell: ['Change one thing at a time and write down what happened.', 'If it does not work, check the connections before you blame the design.', 'A wrong answer in an experiment is still data.'],
  vargas: ['Squint at your picture: if the shapes still read, the composition works.', 'Put your darkest dark next to your lightest light to make it pop.', 'Start with the big shapes and let the details wait.'],
  kim: ['Make it work, then make it nice. In that order.', 'Explain the bug to a rubber duck. It works more often than you would think.', 'Small steps and run it every time you change something.'],
  whitfield: ['Slow down on the exciting parts and let the pause do the work.', 'Use a different voice for every character, even a silly one.', 'Ask: what do you think happens next?'],
  brooks: ['Pay yourself first: save before you spend.', 'A budget is a plan, not a punishment.', 'Ask what each coin is for before it leaves your hand.'],
}
