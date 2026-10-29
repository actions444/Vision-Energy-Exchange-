// I-45 "compressed route": Houston's east edge across Galveston Bay to Galveston Island.
// Units are the game's meters. Houston hub is x=0, z=0. Forward (+x) is east.
export const I45 = {
  deckY: 4.5, // top surface of the bridge deck
  landRampX: 86, // ground level where the on-ramp starts
  deckStartX: 116, // deck begins once the ramp has risen
  deckEndX: 344, // deck ends at the island shore
  downRampEndX: 362, // off-ramp reaches island ground here
  deckHalfWidth: 12.5, // lanes + median + shoulders
  eastLanes: [2.0, 5.6, 9.2], // z centres, travelling +x
  westLanes: [-2.0, -5.6, -9.2], // z centres, travelling -x
  island: { x0: 345, x1: 440, z0: -60, z1: 60 },
  wallGap: 22, // half-width of the gap cut in the city's east boundary wall
  arrival: { x0: 372, x1: 430, z0: -40, z1: 40 },
  start: [70, 2, 2], // teleport target on land beside the on-ramp
  arrivalTeleport: [392, 3, 0], // teleport target on Galveston
  carSpawn: { id: 'i45-car-1', type: 'luxury-sedan', position: [84, 0.9, 2.0], heading: 0, paint: '#e8e4dc', accent: '#2a6fd6' },
  exits: [
    { id: '1A', label: 'Seawall Blvd', from: [336, 9.2], to: [354, 22] },
    { id: '1B', label: 'Broadway', from: [336, -9.2], to: [354, -22] },
  ],
  gantries: [
    { x: 150, text: 'GALVESTON  50 MI' },
    { x: 210, text: 'GALVESTON  30 MI' },
    { x: 270, text: 'GALVESTON  10 MI' },
    { x: 326, text: 'EXIT 1A SEAWALL  ·  EXIT 1B BROADWAY' },
  ],
  trafficPerLane: 4,
}
