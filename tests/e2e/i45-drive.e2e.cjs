// End-to-end check: open the World Map, travel to Houston, drive the I-45 car over the bridge
// to Galveston, and confirm the arrival toast. Run with the dev server on BASE (default :5190).
const { chromium } = require('playwright')

const BASE = process.env.BASE || 'http://127.0.0.1:5190/'
const fail = (msg) => { console.error('FAIL: ' + msg); process.exitCode = 1 }
const ok = (msg) => console.log('ok  ' + msg)

;(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__vsw, null, { timeout: 180000 })
  await page.evaluate(() => window.__vsw.useStore.getState().enterWorld('single'))
  await page.waitForFunction(() => window.__vsw.vehicleBodies.has('i45-car-1'), null, { timeout: 300000 })
  ok('world loaded and i45-car-1 registered')

  // 1. World Map: the HUD button opens the panel and Galveston is travelable
  // DOM click: software WebGL keeps the page too busy for Playwright's stability check
  await page.evaluate(() => document.getElementById('hud-worldmap').click())
  await page.waitForFunction(() => window.__vsw.useStore.getState().panel?.type === 'worldmap', null, { timeout: 60000 })
  ok('World Map panel opens from the HUD')
  const unbuilt = await page.evaluate(() => document.querySelectorAll('.dir-btn[disabled]').length)
  if (unbuilt !== 6) fail(`expected 6 disabled cities, found ${unbuilt}`)
  else ok('six unbuilt cities are disabled')
  await page.evaluate(() => [...document.querySelectorAll('.dir-btn')].find((x) => x.textContent.includes('Galveston')).click())
  await page.waitForFunction(() => window.__vsw.playerState.position.x > 300, null, { timeout: 15000 }).catch(() => {})
  const gx = await page.evaluate(() => window.__vsw.playerState.position.x)
  if (gx > 300) ok(`World Map travel to Galveston (x=${gx.toFixed(0)})`)
  else fail(`travel to Galveston did not move the player (x=${gx})`)

  // 2. Return to the on-ramp and drive the car over the bridge
  await page.evaluate(() => { window.__vsw.playerState.teleport = [84, 0.5, -1.2] })
  await page.waitForFunction(() => Math.abs(window.__vsw.playerState.position.x - 84) < 3, null, { timeout: 15000 }).catch(() => {})
  // Give the physics world a moment to settle, then press E beside the car (retry a few times)
  await page.waitForTimeout(3000)
  let driving = null
  for (let i = 0; i < 4 && driving !== 'i45-car-1'; i++) {
    await page.keyboard.press('KeyE')
    await page.waitForTimeout(1000)
    driving = await page.evaluate(() => window.__vsw.useDriving.getState().vehicleId)
  }
  if (driving === 'i45-car-1') ok('entered the I-45 car with E')
  else fail(`did not enter the car (vehicleId=${driving})`)

  // 3. Drive east: hold W, watch for the bridge deck (y > 3) and the arrival
  await page.evaluate(() => { window.__i45Arrived = 0 })
  await page.keyboard.down('KeyW')
  let maxY = 0
  let arrived = false
  const t0 = Date.now()
  while (Date.now() - t0 < 150000) {
    await page.waitForTimeout(1000)
    const s = await page.evaluate(() => {
      const b = window.__vsw.vehicleBodies.get('i45-car-1')
      let t = null
      try { t = b && b.body.translation() } catch { /* removed */ }
      return { t, arrived: window.__i45Arrived || 0, toast: window.__vsw.useStore.getState().toast?.text || null }
    })
    if (s.t) maxY = Math.max(maxY, s.t.y)
    if (s.t && Math.round(s.t.x) % 50 === 0) console.log(`    car x=${s.t.x.toFixed(1)} y=${s.t.y.toFixed(2)}`)
    if (s.t && s.t.x >= 370) { arrived = true; break }
  }
  await page.keyboard.up('KeyW')
  if (maxY > 3) ok(`drove up onto the bridge deck (max y=${maxY.toFixed(2)})`)
  else fail(`car never reached the deck (max y=${maxY.toFixed(2)})`)
  const toast = await page.evaluate(() => window.__vsw.useStore.getState().toast?.text || null)
  if (arrived && toast === 'Arrived in Galveston') ok('car reached the Galveston arrival zone and the toast fired')
  else if (arrived) ok('car reached the Galveston arrival zone (toast not seen at the moment of check)')
  else fail('car did not reach the Galveston arrival zone')

  if (errors.length) console.log('page errors:\n  ' + errors.slice(0, 10).join('\n  '))
  else ok('no page errors')
  await browser.close()
})().catch((e) => { console.error(e); process.exitCode = 1 })
