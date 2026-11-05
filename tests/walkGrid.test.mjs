import { test } from 'node:test'
import assert from 'node:assert/strict'
import { groundAt, nearestStandable, CAR_STREET } from '../src/npc/walkGrid.js'

test('nobody stands on the traffic street', () => {
  for (const z of [15, 17, 20, 23, 25]) for (const x of [-60, 0, 40, 90]) assert.equal(groundAt(x, z), null)
})

test('nearestStandable always lands on standable ground, off the traffic street', () => {
  for (let x = -120; x <= 110; x += 23) for (let z = -120; z <= 120; z += 19) {
    const s = nearestStandable(x, z)
    if (!s) continue
    assert.notEqual(groundAt(s.x, s.z), null)
    assert.ok(!(s.z > CAR_STREET.z0 && s.z < CAR_STREET.z1))
    assert.ok(s.y > -0.5 && s.y < 3, 'ground height is sensible: ' + s.y)
  }
})

test('outside the mapped area is not standable', () => {
  assert.equal(groundAt(500, 0), null)
  assert.equal(groundAt(0, -500), null)
})
