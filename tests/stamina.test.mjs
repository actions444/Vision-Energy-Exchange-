import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canSprint, stepStamina, STAMINA } from '../src/player/stamina.js'

test('sprint needs the minimum stamina to start', () => {
  assert.equal(canSprint(STAMINA.minToSprint - 1, true, false), false)
  assert.equal(canSprint(STAMINA.minToSprint, true, false), true)
})

test('an ongoing sprint continues until stamina runs out', () => {
  assert.equal(canSprint(1, true, true), true)
  assert.equal(canSprint(0, true, true), false)
})

test('no sprint when the run input is off', () => {
  assert.equal(canSprint(100, false, false), false)
})

test('sprinting drains and resting recovers, within bounds', () => {
  assert.ok(stepStamina(50, true, 1) < 50)
  assert.ok(stepStamina(50, false, 1) > 50)
  assert.equal(stepStamina(1, true, 10), 0)
  assert.equal(stepStamina(99, false, 10), STAMINA.max)
})
