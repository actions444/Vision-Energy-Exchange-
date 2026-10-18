import * as THREE from 'three'
import { Sofa, Table, Rug, Plant, Chair, Counter, Shelf, ClothingRack, Mannequin, WallScreen, Speaker, Microphone, AcousticPanels, CeilingLight, PendantLight, Stool } from '../../furniture.jsx'
import { Vanity } from '../../Interior.jsx'
import { PottedPlant } from '../../Vegetation.jsx'
import { Chandelier } from '../../Chandelier.jsx'
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

export function TropicalRoom({ P, colors, zone }) {
  // Zaviont Everaux: luxury tropical residence, botanical surroundings
  return (
    <group>
      <Rug position={P(7, 9, 0)} size={[6, 10]} color={colors.dark} />
      <Sofa position={P(3.0, 13.4)} yaw={Math.PI / 2} length={2.6} color={colors.primary} />
      <Table position={P(5.4, 13.4)} yaw={0} size={[1.2, 0.9]} height={0.4} />
      {[[1.4, 2.0, 'areca'], [12.6, 2.0, 'monstera'], [1.4, 8.4, 'fiddle'], [12.6, 8.4, 'areca'], [1.4, 15.8, 'monstera'], [12.6, 15.8, 'fiddle']].map(([u, v, kind], i) => (
        <PottedPlant key={i} position={P(u, v)} kind={kind} scale={1.5} />
      ))}
      <WallScreen position={P(10.4, 0, 2.0)} yaw={Math.PI} size={[2.4, 1.4]} id="zaviont-tropical-tv" zone={zone} name="Zaviont's screen" />
      <Shelf position={P(0.1, 11.0)} yaw={Math.PI / 2} width={2.6} height={2.0} books={false} />
      <PendantLight position={P(7, 0, 9)} color={colors.teal} zone={zone} />
      <CeilingLight position={P(3, 0, 13.4)} size={[1.1, 0.7]} color={colors.gold} zone={zone} intensity={14} distance={7} />
    </group>
  )
}

export function BotanicalRoom({ P, colors, zone }) {
  // Lira Everaux: botanical luxury residence, a glass-house lounge
  return (
    <group>
      <Rug position={P(7, 8, 0)} size={[6, 8]} color={colors.dark} />
      <Counter position={P(2.4, 1.6)} yaw={0} length={3.4} height={0.9} depth={0.7} top="marble" face={colors.primary} />
      <Stool position={P(1.4, 2.8)} />
      <Stool position={P(3.4, 2.8)} />
      {[[0.9, 6.4, 'fern'], [0.9, 10.2, 'monstera'], [0.9, 14.0, 'areca'], [13.1, 6.4, 'areca'], [13.1, 10.2, 'fern'], [13.1, 14.0, 'monstera'], [7.0, 16.6, 'fiddle']].map(([u, v, kind], i) => (
        <PottedPlant key={i} position={P(u, v)} kind={kind} scale={1.3} />
      ))}
      <Sofa position={P(10.2, 2.0)} yaw={-Math.PI / 2} length={2.2} color={colors.accent} />
      <Shelf position={P(13.9, 2.0)} yaw={-Math.PI / 2} width={2.6} height={2.0} books={false} />
      <PendantLight position={P(2.4, 0, 1.6)} color={colors.teal} zone={zone} />
      <CeilingLight position={P(7, 0, 9)} size={[1.1, 0.7]} color={colors.gold} zone={zone} intensity={14} distance={7} />
    </group>
  )
}

export function PodcastRoom({ P, colors, zone }) {
  // Malik Carter ("Huge Vision"): business office, podcast studio, blueprint displays
  const m = getMaterials()
  return (
    <group>
      <Rug position={P(4, 4, 0)} size={[5, 4]} color={colors.dark} />
      <Counter position={P(3.2, 1.8)} yaw={0} length={3.0} height={0.78} depth={0.85} top="marble" face={colors.dark} />
      <Chair position={P(3.2, 3.1)} yaw={Math.PI} color={colors.primary} />
      <Shelf position={P(0.1, 2.0)} yaw={Math.PI / 2} width={3.4} height={2.2} />
      {/* blueprint displays: framed sheets on the wall */}
      {[7.4, 9.0, 10.6].map((v, i) => (
        <group key={i}>
          <mesh position={P(0.12, 1.3, v)} rotation={[0, Math.PI / 2, 0]} material={m.fabric('#14234f')} castShadow><boxGeometry args={[0.03, 1.1, 1.3]} /></mesh>
          <mesh position={P(0.14, 1.3, v)} rotation={[0, Math.PI / 2, 0]}><boxGeometry args={[0.005, 0.85, 1.05]} /><meshStandardMaterial color={colors.accent} roughness={0.8} /></mesh>
        </group>
      ))}
      {/* podcast booth */}
      <AcousticPanels position={P(13.92, 12.2, 1.6)} yaw={-Math.PI / 2} cols={2} rows={3} color={colors.primary} />
      <Counter position={P(10.4, 13.6)} yaw={0} length={3.6} height={1.0} depth={0.8} top="marble" face={colors.dark} />
      <Stool position={P(9.2, 14.8)} />
      <Stool position={P(11.6, 14.8)} />
      <Microphone position={P(9.2, 13.9, 1.05)} yaw={Math.PI} />
      <Microphone position={P(11.6, 13.9, 1.05)} yaw={Math.PI} />
      <PendantLight position={P(3.2, 0, 1.8)} color={colors.accent} zone={zone} />
      <CeilingLight position={P(10.4, 0, 13.6)} size={[1.2, 0.8]} color={colors.gold} zone={zone} intensity={16} distance={8} />
    </group>
  )
}

export function LibraryRoom({ P, colors, zone }) {
  // Dr. Makai Freeman: library, study, historical displays
  const m = getMaterials()
  return (
    <group>
      <Rug position={P(7, 9, 0)} size={[6, 6]} color={colors.dark} />
      <Shelf position={P(0.1, 3.0)} yaw={Math.PI / 2} width={5.4} height={2.6} />
      <Shelf position={P(0.1, 9.0)} yaw={Math.PI / 2} width={5.4} height={2.6} />
      <Shelf position={P(13.9, 3.0)} yaw={-Math.PI / 2} width={5.4} height={2.6} />
      <Table position={P(7, 9)} yaw={0} size={[2.2, 1.1]} height={0.78} top="wood" />
      <Chair position={P(7, 10.4)} yaw={Math.PI} color={colors.primary} />
      <Chair position={P(7, 7.6)} yaw={0} color={colors.accent} />
      {/* historical displays: a low glass-topped case */}
      <mesh position={P(11.0, 0.52, 11.0)} material={m.fabric(colors.dark)} castShadow><boxGeometry args={[2.0, 1.0, 0.9]} /></mesh>
      <mesh position={P(11.0, 1.04, 11.0)} material={getMaterials().glass}><boxGeometry args={[1.9, 0.04, 0.8]} /></mesh>
      <Plant position={P(1.0, 16.6)} scale={1.1} kind="fern" />
      <PendantLight position={P(7, 0, 9)} color={colors.gold} zone={zone} />
      <CeilingLight position={P(7, 0, 13.4)} size={[1.2, 0.8]} color={colors.gold} zone={zone} intensity={14} distance={7} />
    </group>
  )
}

export function ConsultRoom({ P, colors, zone }) {
  // Dr. Sacred: private consultation rooms, healing residence
  return (
    <group>
      <Rug position={P(4, 4.5, 0)} size={[5, 4.5]} color={colors.dark} />
      <Sofa position={P(2.4, 1.8)} yaw={0} length={2.2} color={colors.primary} />
      <Chair position={P(5.6, 2.6)} yaw={-Math.PI / 2} color={colors.accent} />
      <Table position={P(4.0, 2.6)} yaw={0} size={[0.9, 0.6]} height={0.42} />
      <Plant position={P(0.9, 6.6)} scale={1.2} kind="fern" />
      {/* a second, quieter consultation nook */}
      <Sofa position={P(10.6, 12.6)} yaw={-Math.PI / 2} length={2.0} color={colors.teal} />
      <Chair position={P(8.6, 12.6)} yaw={Math.PI / 2} color={colors.primary} />
      <Table position={P(9.6, 12.6)} yaw={0} size={[0.8, 0.5]} height={0.42} />
      <Shelf position={P(13.9, 7.0)} yaw={-Math.PI / 2} width={2.6} height={2.0} />
      <Plant position={P(12.8, 16.2)} scale={1.1} kind="monstera" />
      <PendantLight position={P(3.6, 0, 2.2)} color={colors.teal} zone={zone} />
      <CeilingLight position={P(10, 0, 12.6)} size={[1.1, 0.7]} color={colors.gold} zone={zone} intensity={14} distance={7} />
    </group>
  )
}

export function StudyRoom({ P, colors, zone }) {
  // Dr. Scared: contemporary residence - study + lounge
  return (
    <group>
      <Rug position={P(4, 4, 0)} size={[5, 4]} color={colors.dark} />
      <Counter position={P(3.2, 1.8)} yaw={0} length={3.0} height={0.78} depth={0.8} top="marble" face={colors.dark} />
      <Chair position={P(3.2, 3.1)} yaw={Math.PI} color={colors.primary} />
      <Shelf position={P(0.1, 2.0)} yaw={Math.PI / 2} width={3.6} height={2.3} />
      <Sofa position={P(9.6, 13.0)} yaw={-Math.PI / 2} length={2.4} color={colors.accent} />
      <Table position={P(9.6, 10.4)} yaw={0} size={[1.1, 0.6]} height={0.42} />
      <Plant position={P(1.0, 16.4)} scale={1.1} kind="snake" />
      <PendantLight position={P(3.2, 0, 1.8)} color={colors.teal} zone={zone} />
      <CeilingLight position={P(9.5, 0, 12.8)} size={[1.2, 0.8]} color={colors.gold} zone={zone} intensity={16} distance={8} />
    </group>
  )
}

export function LoftRoom({ P, colors, zone }) {
  // Dreylan Knox: luxury loft - open living with an industrial edge
  const m = getMaterials()
  return (
    <group>
      <Rug position={P(7, 9, 0)} size={[7, 9]} color={colors.dark} />
      <Sofa position={P(4.0, 13.4)} yaw={0} length={3.0} color={colors.primary} />
      <Table position={P(4.0, 11.4)} yaw={0} size={[1.6, 0.8]} height={0.4} top="marble" />
      <WallScreen position={P(13.8, 0, 13.4)} yaw={-Math.PI / 2} size={[2.6, 1.5]} id="dreylan-loft-tv" zone={zone} name="Dreylan's screen" />
      {/* exposed steel beam */}
      <mesh position={P(7, 3.1, 0)} material={m.blackSteel} castShadow><boxGeometry args={[14, 0.18, 0.18]} /></mesh>
      <Shelf position={P(0.1, 5.0)} yaw={Math.PI / 2} width={3.0} height={2.2} books={false} />
      <Plant position={P(12.8, 2.0)} scale={1.2} kind="fiddle" />
      <PendantLight position={P(4.0, 0, 11.4)} color={colors.accent} zone={zone} />
      <CeilingLight position={P(7, 0, 5.0)} size={[1.2, 0.8]} color={colors.gold} zone={zone} intensity={16} distance={8} />
    </group>
  )
}

export function ElegantRoom({ P, colors, zone }) {
  // Seraphina Reign: elegant luxury residence - a formal sitting room
  return (
    <group>
      <Rug position={P(7, 9, 0)} size={[6, 9]} color={colors.primary} />
      <Sofa position={P(3.4, 12.6)} yaw={Math.PI / 2} length={2.4} color={colors.gold} />
      <Sofa position={P(7.0, 15.6)} yaw={0} length={2.6} color={colors.primary} />
      <Table position={P(5.2, 13.6)} yaw={0} size={[1.3, 0.8]} height={0.4} top="marble" />
      <Shelf position={P(0.1, 4.0)} yaw={Math.PI / 2} width={3.4} height={2.3} books={false} />
      <Plant position={P(12.8, 2.0)} scale={1.2} kind="fiddle" />
      <Plant position={P(12.8, 16.2)} scale={1.1} kind="monstera" />
      <Chandelier position={P(7, 0, 9)} type="crystal" size={1.1} drop={0.9} zone={zone} intensity={14} />
      <CeilingLight position={P(3.4, 0, 12.6)} size={[1.0, 0.7]} color={colors.gold} zone={zone} intensity={12} distance={7} />
    </group>
  )
}

export function ModernRoom({ P, colors, zone }) {
  // Elijah Storms: modern residence - media lounge
  return (
    <group>
      <Rug position={P(7, 9, 0)} size={[6, 7]} color={colors.dark} />
      <Sofa position={P(4.2, 12.2)} yaw={0} length={3.0} color={colors.primary} />
      <Table position={P(4.2, 10.0)} yaw={0} size={[1.5, 0.8]} height={0.4} top="marble" />
      <WallScreen position={P(13.8, 0, 12.2)} yaw={-Math.PI / 2} size={[2.8, 1.6]} id="elijah-modern-tv" zone={zone} name="Elijah's screen" />
      <Shelf position={P(0.1, 4.0)} yaw={Math.PI / 2} width={3.0} height={2.2} books={false} />
      <Plant position={P(1.0, 16.4)} scale={1.2} kind="snake" />
      <PendantLight position={P(4.2, 0, 10.0)} color={colors.accent} zone={zone} />
      <CeilingLight position={P(7, 0, 4.0)} size={[1.1, 0.7]} color={colors.gold} zone={zone} intensity={14} distance={7} />
    </group>
  )
}

export function AdventureRoom({ P, colors, zone }) {
  // Leo Vision: interactive adventure bedroom - a bright gaming/play corner
  return (
    <group>
      <Rug position={P(7, 9, 0)} size={[6, 9]} color={colors.accent} />
      <Sofa position={P(3.6, 13.0)} yaw={Math.PI / 2} length={2.2} color={colors.primary} />
      <Stool position={P(5.2, 13.0)} color={colors.accent} />
      <Stool position={P(5.2, 11.4)} color={colors.teal} />
      <WallScreen position={P(13.8, 0, 12.4)} yaw={-Math.PI / 2} size={[2.8, 1.6]} id="leo-adventure-tv" zone={zone} name="Leo's big screen" />
      <Shelf position={P(0.1, 4.0)} yaw={Math.PI / 2} width={3.2} height={2.0} />
      <Table position={P(3.6, 3.2)} yaw={0} size={[1.2, 0.8]} height={0.5} top="wood" />
      <Chair position={P(3.6, 4.6)} yaw={Math.PI} color={colors.primary} />
      <Plant position={P(1.0, 16.4)} scale={1.1} kind="areca" />
      <PendantLight position={P(3.6, 0, 13.0)} color={colors.teal} zone={zone} />
      <CeilingLight position={P(7, 0, 5.0)} size={[1.2, 0.8]} color={colors.gold} zone={zone} intensity={16} distance={8} />
    </group>
  )
}

export function DenRoom({ P, colors, zone }) {
  // Eugene: upscale contemporary residence - a warm den with a home-theater corner and a bar
  return (
    <group>
      <Rug position={P(7, 9, 0)} size={[6, 8]} color={colors.dark} />
      <Sofa position={P(4.0, 12.6)} yaw={0} length={3.0} color={colors.primary} />
      <Table position={P(4.0, 10.4)} yaw={0} size={[1.5, 0.8]} height={0.4} top="wood" />
      <WallScreen position={P(13.8, 0, 12.6)} yaw={-Math.PI / 2} size={[2.8, 1.6]} id="eugene-den-tv" zone={zone} name="Eugene's screen" />
      <Counter position={P(2.2, 2.4)} yaw={0} length={3.0} height={1.0} depth={0.7} top="marble" face={colors.dark} />
      <Stool position={P(1.4, 3.6)} color={colors.gold} />
      <Stool position={P(3.0, 3.6)} color={colors.gold} />
      <Shelf position={P(0.1, 6.6)} yaw={Math.PI / 2} width={2.8} height={2.2} />
      <Plant position={P(1.0, 16.4)} scale={1.2} kind="fiddle" />
      <PendantLight position={P(4.0, 0, 10.4)} color={colors.gold} zone={zone} />
      <CeilingLight position={P(2.2, 0, 2.4)} size={[1.1, 0.7]} color={colors.gold} zone={zone} intensity={14} distance={7} />
    </group>
  )
}

export function TechRoom({ P, colors, zone }) {
  // Zaybian: contemporary luxury residence - a sleek tech/gaming lounge with electric-blue accents
  return (
    <group>
      <Rug position={P(7, 9, 0)} size={[6, 8]} color={colors.dark} />
      <Counter position={P(3.4, 2.2)} yaw={0} length={3.6} height={0.95} depth={0.8} top="marble" face={colors.dark} />
      <Stool position={P(3.4, 3.5)} color={colors.accent} />
      <WallScreen position={P(0.1, 0, 2.2)} yaw={Math.PI / 2} size={[2.2, 1.3]} id="zaybian-tech-mon" zone={zone} name="Zaybian's display" />
      <Sofa position={P(9.6, 13.2)} yaw={-Math.PI / 2} length={2.8} color={colors.primary} />
      <WallScreen position={P(13.8, 0, 13.2)} yaw={-Math.PI / 2} size={[2.8, 1.6]} id="zaybian-tech-tv" zone={zone} name="Zaybian's screen" />
      <Shelf position={P(0.1, 8.0)} yaw={Math.PI / 2} width={2.6} height={2.0} books={false} />
      <Plant position={P(12.8, 1.4)} scale={1.1} kind="snake" />
      <PendantLight position={P(3.4, 0, 2.2)} color={colors.accent} zone={zone} />
      <CeilingLight position={P(9.6, 0, 13.2)} size={[1.2, 0.8]} color={colors.accent} zone={zone} intensity={16} distance={8} />
    </group>
  )
}

export const SIGNATURE_ROOMS = {
  studio: StudioRoom,
  office: OfficeRoom,
  design: DesignRoom,
  art: ArtRoom,
  beauty: BeautyRoom,
  tropical: TropicalRoom,
  botanical: BotanicalRoom,
  podcast: PodcastRoom,
  library: LibraryRoom,
  consult: ConsultRoom,
  study: StudyRoom,
  loft: LoftRoom,
  elegant: ElegantRoom,
  modern: ModernRoom,
  adventure: AdventureRoom,
  den: DenRoom,
  tech: TechRoom,
}
