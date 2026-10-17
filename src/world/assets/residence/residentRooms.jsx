import * as THREE from 'three'
import { Sofa, Table, Rug, Plant, Chair, Counter, Shelf, ClothingRack, Mannequin, WallScreen, Speaker, Microphone, AcousticPanels, CeilingLight, PendantLight, Stool } from '../../furniture.jsx'
import { Vanity } from '../../Interior.jsx'
import { getMaterials } from '../../materials.js'

// One signature-room furniture set per character (`resident.signature` in src/config/residences.js),
// built entirely from the shared furniture kit (src/world/furniture.jsx, src/world/Interior.jsx) and
// tinted with that character's own colors. `P(u, v, y)` places things in the signature room's own
// local coordinates (u: 0..14 across, v: 0..18 deep); `zone` powers the room's lights.

export function StudioRoom({ P, colors, zone }) {
  // Trinity Reign: recording studio - booth, mics, monitors, mixing desk, acoustic treatment
  return (
    <group>
      <Rug position={P(7, 13, 0)} size={[6, 5]} color={colors.dark} />
      <AcousticPanels position={P(0.08, 9, 1.6)} yaw={Math.PI / 2} cols={3} rows={4} color={colors.primary} />
      <AcousticPanels position={P(13.92, 9, 1.6)} yaw={-Math.PI / 2} cols={3} rows={4} color={colors.teal} />
      <Counter position={P(7, 5.2, 0)} yaw={0} length={5.2} height={1.0} depth={0.9} top="marble" face={colors.dark} />
      <Stool position={P(5.6, 6.4)} />
      <Stool position={P(8.4, 6.4)} />
      <Microphone position={P(7, 11.5, 1.05)} yaw={Math.PI} />
      <Speaker position={P(4.6, 4.9, 1.5)} yaw={0.4} scale={1.1} />
      <Speaker position={P(9.4, 4.9, 1.5)} yaw={-0.4} scale={1.1} />
      <Shelf position={P(1.0, 15.6)} yaw={0} width={2.6} height={2.1} />
      <Plant position={P(12.6, 16.2)} scale={1.1} kind="fiddle" />
      <PendantLight position={P(7, 0, 3.1)} color={colors.accent} zone={zone} />
      <CeilingLight position={P(7, 0, 13)} size={[1.3, 0.8]} color={colors.gold} zone={zone} intensity={18} distance={9} />
    </group>
  )
}

export function OfficeRoom({ P, colors, zone }) {
  // Zion Reign: private office + entertainment corner
  return (
    <group>
      <Rug position={P(4, 4.5, 0)} size={[5, 4]} color={colors.dark} />
      <Counter position={P(3.2, 2.0)} yaw={0} length={2.6} height={0.78} depth={0.8} top="marble" face={colors.dark} />
      <Chair position={P(3.2, 3.3)} yaw={Math.PI} color={colors.primary} />
      <Shelf position={P(0.1, 2.0)} yaw={Math.PI / 2} width={3.6} height={2.3} />
      <Plant position={P(6.6, 1.2)} scale={1.1} kind="fiddle" />
      {/* entertainment corner */}
      <Sofa position={P(7.8, 12.5)} yaw={-Math.PI / 2} length={2.6} color={colors.primary} />
      <WallScreen position={P(13.8, 0, 12.5)} yaw={-Math.PI / 2} size={[2.8, 1.6]} id="zion-office-tv" zone={zone} name="Zion's screen" />
      <Rug position={P(9.5, 12.5, 0)} size={[4, 3.4]} color={colors.accent} />
      <Plant position={P(1.0, 16.4)} scale={1.1} kind="snake" />
      <PendantLight position={P(3.2, 0, 2.0)} color={colors.accent} zone={zone} />
      <CeilingLight position={P(8.5, 0, 12)} size={[1.2, 0.8]} color={colors.gold} zone={zone} intensity={16} distance={8} />
    </group>
  )
}

export function DesignRoom({ P, colors, zone }) {
  // Sage Green: fashion displays + design studio + gaming corner
  return (
    <group>
      <Rug position={P(4, 4, 0)} size={[5, 4]} color={colors.dark} />
      <ClothingRack position={P(1.6, 2.0)} yaw={0} seed={2} />
      <ClothingRack position={P(5.0, 2.0)} yaw={0} seed={5} />
      <Mannequin position={P(7.6, 2.0)} color={colors.primary} />
      <Mannequin position={P(8.6, 2.0)} color={colors.accent} />
      <Counter position={P(3.2, 5.6)} yaw={0} length={4.0} height={0.85} depth={1.0} top="marble" face={colors.dark} />
      <Stool position={P(2.0, 6.8)} />
      <Stool position={P(4.4, 6.8)} />
      {/* gaming area */}
      <Sofa position={P(10.6, 13.2)} yaw={-Math.PI / 2} length={2.4} color={colors.primary} />
      <WallScreen position={P(13.8, 0, 13.2)} yaw={-Math.PI / 2} size={[2.6, 1.5]} id="sage-game-tv" zone={zone} name="Sage's screen" />
      <Table position={P(10.6, 10.4)} yaw={0} size={[1.1, 0.6]} height={0.42} />
      <Plant position={P(1.0, 16.4)} scale={1.1} kind="monstera" />
      <PendantLight position={P(3.2, 0, 4.0)} color={colors.teal} zone={zone} />
      <CeilingLight position={P(10.5, 0, 12.8)} size={[1.2, 0.8]} color={colors.gold} zone={zone} intensity={16} distance={8} />
    </group>
  )
}

export function ArtRoom({ P, colors, zone }) {
  // Jade Green: fashion studio + art room + creative workspace
  const m = getMaterials()
  return (
    <group>
      <Rug position={P(4.5, 4.5, 0)} size={[5.5, 4.5]} color={colors.dark} />
      <ClothingRack position={P(1.6, 2.0)} yaw={0} seed={3} />
      <Mannequin position={P(4.4, 2.0)} color={colors.primary} />
      <Table position={P(3.2, 6.0)} yaw={0} size={[2.0, 1.0]} height={0.78} />
      <Stool position={P(3.2, 7.2)} />
      {/* a leaning canvas, propped against the wall */}
      <mesh position={P(0.12, 1.1, 10.5)} rotation={[0, Math.PI / 2, 0.12]} material={m.fabric(colors.accent)} castShadow>
        <boxGeometry args={[0.04, 1.4, 1.0]} />
      </mesh>
      <mesh position={P(0.14, 1.1, 10.5)} rotation={[0, Math.PI / 2, 0.12]}><boxGeometry args={[0.01, 1.0, 0.7]} /><meshStandardMaterial color={colors.teal} roughness={0.9} /></mesh>
      <Shelf position={P(0.1, 13.0)} yaw={Math.PI / 2} width={3.4} height={2.0} />
      <Table position={P(9.2, 13.0)} yaw={0} size={[2.4, 1.1]} height={0.42} />
      <Chair position={P(9.2, 14.3)} yaw={Math.PI} color={colors.primary} />
      <Chair position={P(10.6, 11.9)} yaw={0} color={colors.teal} />
      <Plant position={P(12.6, 16.2)} scale={1.1} kind="areca" />
      <PendantLight position={P(3.2, 0, 4.5)} color={colors.accent} zone={zone} />
      <CeilingLight position={P(9.2, 0, 12.8)} size={[1.2, 0.8]} color={colors.gold} zone={zone} intensity={16} distance={8} />
    </group>
  )
}

export function BeautyRoom({ P, colors, zone }) {
  // Soleia Monroe: beauty room, designer closet extras, travel decor
  const m = getMaterials()
  return (
    <group>
      <Rug position={P(4, 4, 0)} size={[5, 4]} color={colors.dark} />
      <Vanity position={P(3.0, 1.4)} yaw={Math.PI} width={1.6} zone={zone} />
      <mesh position={P(3.0, 1.7, 0.3)} rotation={[0, Math.PI, 0]} material={m.shared('mirror', () => new THREE.MeshStandardMaterial({ color: '#c9d4e0', roughness: 0.03, metalness: 1, envMapIntensity: 1.6 }))}>
        <planeGeometry args={[1.3, 1.5]} />
      </mesh>
      <Stool position={P(3.0, 2.7)} />
      <Shelf position={P(7.0, 0.5)} yaw={0} width={2.6} height={1.8} books={false} />
      <ClothingRack position={P(1.4, 7.0)} yaw={Math.PI / 2} seed={4} />
      <ClothingRack position={P(1.4, 9.2)} yaw={Math.PI / 2} seed={6} />
      <Mannequin position={P(4.0, 8.0)} color={colors.primary} />
      {/* travel decor: a stack of trunks by the window */}
      {[[0, '#2a0f16'], [0.42, colors.accent], [0.8, '#2a0f16']].map(([dy, c], i) => (
        <mesh key={i} position={P(12.4, 0.26 + dy, 1.4)} material={m.leather(c)} castShadow>
          <boxGeometry args={[0.9 - i * 0.12, 0.38, 0.6 - i * 0.08]} />
        </mesh>
      ))}
      <Table position={P(10.4, 12.5)} yaw={0} size={[1.3, 0.7]} height={0.42} />
      <Chair position={P(10.4, 13.9)} yaw={Math.PI} color={colors.primary} />
      <Chair position={P(11.8, 11.2)} yaw={0} color={colors.accent} />
      <Plant position={P(12.8, 16.2)} scale={1.1} kind="fern" />
      <PendantLight position={P(3.0, 0, 1.4)} color={colors.accent} zone={zone} />
      <CeilingLight position={P(9, 0, 12.8)} size={[1.2, 0.8]} color={colors.gold} zone={zone} intensity={16} distance={8} />
    </group>
  )
}

export const SIGNATURE_ROOMS = {
  studio: StudioRoom,
  office: OfficeRoom,
  design: DesignRoom,
  art: ArtRoom,
  beauty: BeautyRoom,
}
