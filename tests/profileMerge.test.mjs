import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanProfile, chooseProfile } from '../src/state/profileMerge.js'

test('cleanProfile keeps known fields and drops everything else', () => {
  const p = cleanProfile({ name: 'Trinity', build: 'f', preset: 'ceo', accent: '#a33cff', skin: '#8a5a3b', updatedAt: 5, admin: true, script: '<x>' })
  assert.deepEqual(p, { name: 'Trinity', build: 'f', preset: 'ceo', accent: '#a33cff', skin: '#8a5a3b', updatedAt: 5 })
})

test('cleanProfile rejects bad values and empty input', () => {
  assert.equal(cleanProfile(null), null)
  assert.equal(cleanProfile('x'), null)
  const p = cleanProfile({ name: 'A'.repeat(50), build: 'x', accent: 'red', skin: '#12', preset: 'bad preset!', updatedAt: -1 })
  assert.deepEqual(p, { name: 'A'.repeat(20) })
})

test('a new device takes the account avatar', () => {
  const local = { name: 'Guest', accent: '#111111', skin: '#222222' } // never edited: no updatedAt
  const cloud = { name: 'Trinity', accent: '#a33cff', skin: '#8a5a3b', updatedAt: 1000 }
  const r = chooseProfile(local, cloud)
  assert.equal(r.push, false)
  assert.equal(r.profile.name, 'Trinity')
})

test('first sign-in saves this device avatar to the account', () => {
  const local = { name: 'Trinity', accent: '#a33cff', skin: '#8a5a3b' }
  const r = chooseProfile(local, null)
  assert.equal(r.push, true)
  assert.equal(r.profile.name, 'Trinity')
})

test('the newer copy wins', () => {
  const older = { name: 'Old', updatedAt: 100 }
  const newer = { name: 'New', updatedAt: 200 }
  assert.deepEqual(chooseProfile(newer, older), { profile: newer, push: true })
  assert.deepEqual(chooseProfile(older, newer), { profile: newer, push: false })
})
