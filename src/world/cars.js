// Generic elevator controller. One instance per car in config/elevators.js; the Plaza keeps its
// own controller in elevator.js. Plain state machine (no React) updated every frame by the car's
// component. The player controller asks `findRidingCar` which car (if any) is carrying the player.
import { create } from 'zustand'
import { carFloorY } from '../config/elevators.js'

const DOOR_TIME = 0.9
const SPEED = 1.8

const cars = new Map() // id -> controller

export function createCar(cfg) {
  // floor/moving/direction for the displays; `lit` = floors whose buttons are lit
  const useUI = create(() => ({ floor: 0, moving: false, direction: 0, lit: [], arrival: null }))
  const arrivalListeners = new Set()
  const Y = (f) => carFloorY(cfg, f)
  const syncLit = (e) => useUI.setState({ lit: [...new Set([...(e.state === 'moving' || e.state === 'closing' ? [e.target] : []), ...e.queue])] })

  const car = {
    cfg, useUI, arrivalListeners, Y,
    y: Y(0), prevY: Y(0), floor: 0, target: 0, queue: [], state: 'idle', door: 1, carHandles: new Set(),
    lastDir: 0, idleSince: 0,

    contains(p) {
      return p.x > cfg.x0 + 0.05 && p.x < cfg.x1 - 0.05 && p.z > cfg.z0 + 0.1 && p.z < cfg.z1 - 0.1 && Math.abs(p.y - this.y) < 0.7
    },
    call(f) {
      f = Math.max(0, Math.min(cfg.floors - 1, f))
      if (this.state === 'idle' && f === this.floor) { this.state = 'opening'; return }
      if (!this.queue.includes(f) && !(f === this.target && this.state !== 'idle')) this.queue.push(f)
      if (this.state === 'idle') this.next()
      syncLit(this)
    },
    next() {
      if (!this.queue.length) return
      this.target = this.queue.shift()
      this.state = 'closing'
      syncLit(this)
    },
    update(dt) {
      this.prevY = this.y
      switch (this.state) {
        case 'closing':
          this.door = Math.max(0, this.door - dt / DOOR_TIME)
          if (this.door === 0) this.state = this.target === this.floor ? 'opening' : 'moving'
          break
        case 'moving': {
          const ty = Y(this.target)
          const d = ty - this.y
          const sp = Math.min(SPEED, 0.6 + Math.abs(d) * 1.2) // ease into the stop
          this.y += Math.sign(d) * Math.min(Math.abs(d), sp * dt)
          useUI.setState({ moving: true, direction: Math.sign(d), floor: Math.round((this.y - cfg.baseY) / cfg.floorH) })
          if (Math.abs(ty - this.y) < 0.001) {
            this.y = ty
            const dir = Math.sign(d) || this.lastDir || 0
            this.floor = this.target
            this.state = 'opening'
            this.lastDir = dir
            const nextDir = this.queue.length ? Math.sign(this.queue[0] - this.floor) : dir
            const arrival = { floor: this.floor, dir: nextDir, at: performance.now() }
            useUI.setState({ moving: false, direction: 0, floor: this.floor, arrival })
            syncLit(this)
            arrivalListeners.forEach((fn) => fn(arrival))
          }
          break
        }
        case 'opening':
          this.door = Math.min(1, this.door + dt / DOOR_TIME)
          if (this.door === 1) { this.state = 'idle'; this.idleSince = performance.now() }
          break
        default:
          if (this.queue.length && performance.now() - this.idleSince > 2500) this.next()
      }
    },
  }
  return car
}

export function registerCar(car) {
  cars.set(car.cfg.id, car)
  return () => { if (cars.get(car.cfg.id) === car) cars.delete(car.cfg.id) }
}
export const getCar = (id) => cars.get(id)
export const allCars = () => [...cars.values()]
/** The car (if any) that the player is standing inside. */
export function findRidingCar(p) {
  for (const c of cars.values()) if (c.contains(p)) return c
  return null
}
