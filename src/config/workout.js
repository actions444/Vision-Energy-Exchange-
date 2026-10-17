// Shared by the avatar (poses), the gym equipment (moving parts) and the workout tracker.
// Every workout is a repeating cycle driven by one global clock, so a person and the machine they are using
// stay in step without sending any state between them. OMEGA is radians per second (2π = one repetition).

export const OMEGA = {
  run: 11.5,      // stride cycle: about 1.8 strides per second
  bike: 8.5,      // pedal cycle: about 80 rpm
  ellip: 6.5,
  row: 3.1,       // one stroke every ~2 s
  press: 2.7,     // chest press
  shoulder: 2.5,
  pull: 2.4,      // lat pulldown
  legpress: 2.3,
  squat: 1.9,
  curl: 2.9,
  bag: 7.5,       // alternating punches
}

// Metabolic equivalents (MET) from the Compendium of Physical Activities, used for the calorie estimate:
// kcal per minute = MET * 3.5 * body mass (kg) / 200. The avatar's body mass is a fixed 70 kg.
export const MET = { run: 9.8, bike: 7.5, ellip: 5.0, row: 7.0, press: 5.0, shoulder: 5.0, pull: 5.0, legpress: 5.0, squat: 6.0, curl: 3.5, bag: 7.8 }
export const BODY_KG = 70

export const KIND = {
  run: { name: 'Treadmill run', unit: 'km', perRep: 0.00137 },   // km per stride cycle: ~9 km/h
  bike: { name: 'Spin bike', unit: 'km', perRep: 0.0051 },
  ellip: { name: 'Elliptical', unit: 'km', perRep: 0.0016 },
  row: { name: 'Rowing machine', unit: 'm', perRep: 8.5 },
  press: { name: 'Chest press' },
  shoulder: { name: 'Shoulder press' },
  pull: { name: 'Lat pulldown' },
  legpress: { name: 'Leg press' },
  squat: { name: 'Barbell squat' },
  curl: { name: 'Dumbbell curl' },
  bag: { name: 'Heavy bag' },
}

/** Seconds on the shared clock (the same value on every client and for every avatar and machine). */
export const clockT = () => performance.now() / 1000
