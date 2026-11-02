// Account sync scenarios against a stand-in for the hosted backend (same interface: userId, getDoc, set, subDoc).
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { useStore } from '../src/state/store.js'
import { startProfileSync, useAccount, _resetProfileSyncForTests } from '../src/state/profileSync.js'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

function fakeHosted({ id = 'player-1', docs = {}, canWrite = true } = {}) {
  const subs = new Map()
  const writes = []
  return {
    kind: 'hosted',
    writes,
    docs,
    async userId() { return id },
    async getDoc(path) { return docs[path] ?? null },
    async set(path, data) {
      if (!canWrite) { const e = new Error('invalid_argument'); e.code = 'invalid_argument'; throw e }
      docs[path] = data
      writes.push({ path, data })
    },
    subDoc(path, cb) { subs.set(path, cb); return () => subs.delete(path) },
    // simulate the same player saving on another device
    remoteWrite(path, data) { docs[path] = data; subs.get(path)?.(data) },
  }
}

const freshGuest = { name: 'Guest', accent: '#a33cff', skin: '#d9a37a' }

beforeEach(() => {
  _resetProfileSyncForTests()
  useStore.setState({ profile: { ...freshGuest } })
  useAccount.setState({ status: 'checking', reason: '' })
})

test('a new device loads the avatar saved in the account', async () => {
  const api = fakeHosted({ docs: { 'data/users/player-1/avatar': { name: 'Trinity', build: 'f', preset: 'ceo', accent: '#2fd0c4', skin: '#8a5a3b', updatedAt: 1000 } } })
  await startProfileSync(api)
  const p = useStore.getState().profile
  assert.equal(p.name, 'Trinity')
  assert.equal(p.preset, 'ceo')
  assert.equal(p.skin, '#8a5a3b')
  assert.equal(useAccount.getState().status, 'account')
  assert.equal(api.writes.length, 0, 'loading must not write back')
})

test('first sign-in saves this device avatar into the private account folder', async () => {
  useStore.getState().setProfile({ name: 'Trinity', build: 'f' })
  const api = fakeHosted()
  await startProfileSync(api)
  assert.equal(api.writes.length, 1)
  assert.equal(api.writes[0].path, 'data/users/player-1/avatar')
  assert.equal(api.writes[0].data.name, 'Trinity')
  assert.equal(useAccount.getState().status, 'account')
})

test('edits after start are saved to the account (once, after a short pause)', async () => {
  const api = fakeHosted({ docs: { 'data/users/player-1/avatar': { name: 'Trinity', updatedAt: 1000 } } })
  await startProfileSync(api)
  useStore.getState().setProfile({ accent: '#e0559f' })
  useStore.getState().setProfile({ skin: '#5c3b28' })
  await wait(1000)
  assert.equal(api.writes.length, 1, 'two quick edits become one save')
  assert.equal(api.writes[0].data.accent, '#e0559f')
  assert.equal(api.writes[0].data.skin, '#5c3b28')
})

test('a view-only player stays device-only and is told why', async () => {
  useStore.getState().setProfile({ name: 'Visitor' })
  const api = fakeHosted({ canWrite: false })
  await startProfileSync(api)
  assert.equal(useAccount.getState().status, 'device')
  assert.match(useAccount.getState().reason, /Contributor/)
  assert.equal(useStore.getState().profile.name, 'Visitor', 'the local avatar is kept')
})

test('a signed-out visitor stays device-only', async () => {
  const api = fakeHosted({ id: null })
  await startProfileSync(api)
  assert.equal(useAccount.getState().status, 'device')
  assert.match(useAccount.getState().reason, /Sign in/)
})

test('a self-hosted or offline copy stays device-only', async () => {
  await startProfileSync({ kind: 'server' })
  assert.equal(useAccount.getState().status, 'device')
  _resetProfileSyncForTests()
  await startProfileSync(null)
  assert.equal(useAccount.getState().status, 'device')
})

test('a change saved on another device shows up here, without echoing back', async () => {
  const api = fakeHosted({ docs: { 'data/users/player-1/avatar': { name: 'Trinity', updatedAt: 1000 } } })
  await startProfileSync(api)
  api.remoteWrite('data/users/player-1/avatar', { name: 'Trinity', preset: 'ceo', updatedAt: Date.now() + 5000 })
  assert.equal(useStore.getState().profile.preset, 'ceo')
  await wait(1000)
  assert.equal(api.writes.length, 0)
})

test('junk fields in a stored document never reach the game', async () => {
  const api = fakeHosted({ docs: { 'data/users/player-1/avatar': { name: 'Trinity', admin: true, credits: 999999, updatedAt: 1000 } } })
  await startProfileSync(api)
  const p = useStore.getState().profile
  assert.equal(p.admin, undefined)
  assert.equal(p.credits, undefined)
})
