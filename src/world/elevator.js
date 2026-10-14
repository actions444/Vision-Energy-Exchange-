// Elevator controller for Vision Storms Plaza. Plain state machine (no React) updated every
// frame by the building; the player controller reads it to ride the car between floors.
import { create } from 'zustand'
import { PLAZA, P, ELEVATOR } from '../config/plaza.js'

const DOOR_TIME = 0.9
const SPEED = 1.8

export const useElevatorUI = create(() => ({ floor: 0, moving: false, direction: 0 }))

export const elevator = {
  y: P.Y(0), // top of the car floor (world)
  prevY: P.Y(0),
  floor: 0,
  target: 0,
  queue: [],
  state: 'idle', // idle | closing | moving | opening
  door: 1, // 0 closed .. 1 open (only on the floor the car is at)
  carHandles: new Set(),

  /** World-space car interior. */
  bounds() {
    return { x0: P.X(ELEVATOR.u0), x1: P.X(ELEVATOR.u1), z0: P.Z(ELEVATOR.v0), z1: P.Z(ELEVATOR.v1) }
  },
  /** Is a foot position standing in the car? */
  contains(p) {
    const b = this.bounds()
    return p.x > b.x0 + 0.05 && p.x < b.x1 - 0.05 && p.z > b.z0 + 0.1 && p.z < b.z1 - 0.05 && Math.abs(p.y - this.y) < 0.7
  },
  call(f) {
    f = Math.max(0, Math.min(PLAZA.floors - 1, f))
    if (this.state === 'idle' && f === this.floor) { this.state = 'opening'; return }
    if (!this.queue.includes(f) && f !== this.target) this.queue.push(f)
    if (this.state === 'idle') this.next()
  },
  next() {
    if (!this.queue.length) return
    this.target = this.queue.shift()
    this.state = 'closing'
  },
  update(dt) {
    this.prevY = this.y
    switch (this.state) {
      case 'closing':
        this.door = Math.max(0, this.door - dt / DOOR_TIME)
        if (this.door === 0) this.state = this.target === this.floor ? 'opening' : 'moving'
        break
      case 'moving': {
        const ty = P.Y(this.target)
        const d = ty - this.y
        const sp = Math.min(SPEED, 0.6 + Math.abs(d) * 1.2) // ease into the stop
        const step = Math.sign(d) * Math.min(Math.abs(d), sp * dt)
        this.y += step
        useElevatorUI.setState({ moving: true, direction: Math.sign(d), floor: Math.round((this.y - PLAZA.base) / PLAZA.floorH) })
        if (Math.abs(ty - this.y) < 0.001) {
          this.y = ty
          this.floor = this.target
          this.state = 'opening'
          useElevatorUI.setState({ moving: false, direction: 0, floor: this.floor })
        }
        break
      }
      case 'opening':
        this.door = Math.min(1, this.door + dt / DOOR_TIME)
        if (this.door === 1) {
          this.state = 'idle'
          this.idleSince = performance.now()
        }
        break
      default:
        if (this.queue.length && performance.now() - (this.idleSince || 0) > 2500) this.next()
    }
  },
}
