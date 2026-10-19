import { useMemo } from 'react'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import { surface } from '../materials.js'
import { assetMats } from '../assets/materials.js'
import { StreetSign } from '../signs.jsx'

// Beltway 8 (the Sam Houston Tollway): a real elevated freeway, Houston-style - a short run of
// genuinely elevated, pier-supported highway with solid earthen ramps up to it at each end,
// placed along the open ground south of the airport (z 65-124), which nothing else in this
// project's config (config/westend.js) or world/westend/Airport.jsx claims - Airport.jsx's own
// geometry never goes past z=30 (checked directly: no z reference past 30 anywhere in that
// file), so this sits on open, already-driveable ground with nothing nearby to clip into.
//
// Shape, kept deliberately simple so every piece of it is geometry I can verify by hand rather
// than guess at: a straight line, not a loop or a cloverleaf (multiple crossing ramps at
// different heights is exactly the kind of thing that goes wrong invisibly). Ramp A rises at a
// constant ~8% grade (a real, drivable highway grade) from the ground up to deck height; a flat
// pier-supported deck runs for a stretch at that height (the actual "elevated freeway" look -
// the part with piers you can see daylight under); ramp B brings it back down the same way.
const CENTER_Z = 95
const WIDTH = 12
const DECK_H = 5.0
const RAMP_LEN = 60
const DECK_LEN = 80
const X0 = -600 // ramp A base (ground level)
const X1 = X0 + RAMP_LEN // -540: top of ramp A / start of the flat deck
const X2 = X1 + DECK_LEN // -460: end of the flat deck / start of ramp B
const X3 = X2 + RAMP_LEN // -400: ramp B base (ground level)
const RAMP_ANGLE = Math.atan2(DECK_H, RAMP_LEN) // ~4.76°, an 8.3% grade
const THICK = 0.6 // ramp slab half-thickness, measured perpendicular to the slope

function Ramp({ x0, up }) {
  const A = assetMats()
  const asphalt = useMemo(() => surface('asphalt', RAMP_LEN / 4, WIDTH / 4), [])
  const hyp = Math.hypot(RAMP_LEN, DECK_H)
  const angle = up ? RAMP_ANGLE : -RAMP_ANGLE
  // The drivable surface is the dead-straight line from (x0, 0) to (x0+RAMP_LEN, DECK_H) (or its
  // mirror) - that line's own midpoint, NOT the slab's centre, is what has to come out exactly
  // right. A box rotated by `angle` about Z has its local +Y face (the top) land on world point
  // `boxCentre + THICK*(nx,ny)`, where (nx,ny) = (-sin angle, cos angle) is that face's own
  // outward direction. So the slab centre has to sit `THICK` back from the line's midpoint along
  // that same direction: `topMid - THICK*(nx,ny)`. Hand-verified: plugging lx=±hyp/2 into
  // `boxCentre + lx*(cos,sin) + THICK*(nx,ny)` gives exactly (x0,0) and (x0+RAMP_LEN,DECK_H) at
  // the two ends, for both the rising and descending case - no step at either end.
  const topMidX = x0 + RAMP_LEN / 2
  const topMidY = DECK_H / 2
  const nx = -Math.sin(angle), ny = Math.cos(angle)
  const midX = topMidX - THICK * nx
  const midY = topMidY - THICK * ny
  return (
    <group>
      <RigidBody type="fixed" colliders={false} position={[midX, midY, CENTER_Z]} rotation={[0, 0, angle]}>
        <CuboidCollider args={[hyp / 2, THICK, WIDTH / 2]} />
      </RigidBody>
      <mesh position={[midX, midY, CENTER_Z]} rotation={[0, 0, angle]} material={asphalt} castShadow receiveShadow>
        <boxGeometry args={[hyp, THICK * 2, WIDTH]} />
      </mesh>
    </group>
  )
}

function Deck() {
  const A = assetMats()
  const asphalt = useMemo(() => surface('asphalt', DECK_LEN / 4, WIDTH / 4), [])
  const concrete = useMemo(() => surface('concrete', 2, 2), [])
  const cx = (X1 + X2) / 2
  const pierXs = useMemo(() => {
    const n = 4
    const out = []
    for (let i = 0; i < n; i++) out.push(X1 + (DECK_LEN / (n + 1)) * (i + 1))
    return out
  }, [])
  const dashes = useMemo(() => {
    const out = []
    for (let x = X1 + 2; x < X2 - 2; x += 6) out.push(x)
    return out
  }, [])
  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[DECK_LEN / 2, 0.25, WIDTH / 2]} position={[cx, DECK_H, CENTER_Z]} />
        {/* edge barriers: the one place on this structure where driving off the side means an
            actual fall, so (unlike the ramps) it gets real Jersey-barrier colliders */}
        <CuboidCollider args={[DECK_LEN / 2, 0.4, 0.25]} position={[cx, DECK_H + 0.65, CENTER_Z - WIDTH / 2 + 0.25]} />
        <CuboidCollider args={[DECK_LEN / 2, 0.4, 0.25]} position={[cx, DECK_H + 0.65, CENTER_Z + WIDTH / 2 - 0.25]} />
      </RigidBody>
      <mesh position={[cx, DECK_H, CENTER_Z]} material={asphalt} castShadow receiveShadow>
        <boxGeometry args={[DECK_LEN, 0.5, WIDTH]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[cx, DECK_H + 0.65, CENTER_Z + s * (WIDTH / 2 - 0.25)]} material={concrete} castShadow>
          <boxGeometry args={[DECK_LEN, 0.8, 0.5]} />
        </mesh>
      ))}
      {dashes.map((x) => (
        <mesh key={x} position={[x, DECK_H + 0.26, CENTER_Z]} rotation={[-Math.PI / 2, 0, 0]} material={A.paintWhite}>
          <planeGeometry args={[3, 0.15]} />
        </mesh>
      ))}
      {/* piers: the same thin-post + CylinderCollider pattern already shipped for every
          StreetLamp and the Tomball Pkwy toll gantry, just taller and a few of them in a row */}
      {pierXs.map((x) => (
        <RigidBody key={x} type="fixed" colliders={false} position={[x, 0, CENTER_Z]}>
          <CylinderCollider args={[(DECK_H - 0.25) / 2, 0.55]} position={[0, (DECK_H - 0.25) / 2, 0]} />
          <mesh position={[0, (DECK_H - 0.25) / 2, 0]} material={concrete} castShadow>
            <cylinderGeometry args={[0.5, 0.6, DECK_H - 0.25, 12]} />
          </mesh>
          <mesh position={[0, DECK_H - 0.35, 0]} material={concrete}>
            <boxGeometry args={[WIDTH - 1, 0.3, 1.4]} />
          </mesh>
        </RigidBody>
      ))}
    </group>
  )
}

export default function AirportFreeway() {
  return (
    <group>
      <Ramp x0={X0} up />
      <Deck />
      <Ramp x0={X2} up={false} />
      <StreetSign position={[X0 - 6, 0, CENTER_Z - WIDTH / 2 - 1]} text="BELTWAY 8" num="ELEVATED FWY" />
      <StreetSign position={[X3 + 6, 0, CENTER_Z + WIDTH / 2 + 1]} text="BELTWAY 8" num="SAM HOUSTON TOLLWAY" yaw={Math.PI} />
    </group>
  )
}
