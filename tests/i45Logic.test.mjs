import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stepLane, inBox, TRAFFIC } from '../src/world/i45Logic.js'

const span = { xMin: 120, xMax: 330 }

test('a car never passes the car ahead of it', () => {
  const lead = { x: 200, v: 0 }
  const follower = { x: 180, v: 20 }
  const cars = [lead, follower]
  for (let i = 0; i < 2000; i++) stepLane(cars, 1 / 60, { dir: 1, ...span })
  assert.ok(follower.x < lead.x, `follower ${follower.x} overtook leader ${lead.x}`)
  assert.ok(lead.x - follower.x >= TRAFFIC.carLen, 'cars overlap')
})

test('speed stays within the limit', () => {
  const cars = [{ x: 130, v: 0 }]
  for (let i = 0; i < 1000; i++) stepLane(cars, 1 / 60, { dir: 1, ...span })
  assert.ok(cars[0].v <= TRAFFIC.vMax + 1e-9)
  assert.ok(cars[0].v > 0, 'free car should accelerate')
})

test('cars loop back to the near end at the far end of the lane', () => {
  const car = { x: 329, v: TRAFFIC.vMax }
  stepLane([car], 0.5, { dir: 1, ...span })
  assert.equal(car.x, span.xMin)
})

test('westbound cars enter at xMax and exit at xMin', () => {
  const car = { x: 121, v: TRAFFIC.vMax }
  stepLane([car], 0.5, { dir: -1, ...span })
  assert.equal(car.x, span.xMax)
})

test('inBox detects the Galveston arrival zone', () => {
  const box = { x0: 372, x1: 430, z0: -40, z1: 40 }
  assert.equal(inBox(392, 0, box), true)
  assert.equal(inBox(350, 0, box), false)
  assert.equal(inBox(392, 50, box), false)
})
