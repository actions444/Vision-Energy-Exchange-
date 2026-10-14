import { inMaskedRoom } from '../rentals/preview.js'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Avatar from '../player/Avatar.jsx'
import { net, peerData, usePeers } from './netManager.js'
import { playerState } from '../state/runtime.js'
import { nameTagTexture, canvasTexture, wrapText, roundRect } from '../world/canvasText.js'
import { FONTS } from '../config/theme.js'

// Sends the local player's state and renders every other visitor with interpolation,
// a name tag, wave emotes and chat bubbles.
export default function RemotePlayers() {
  const peers = usePeers((s) => s.peers)
  useFrame(() => net.tickSend(performance.now(), playerState))
  return peers.map((p) => <RemotePlayer key={p.id} id={p.id} name={p.name} accent={p.accent} skin={p.skin} />)
}

function RemotePlayer({ id, name, accent, skin }) {
  const group = useRef()
  const inner = useRef()
  const bubble = useRef()
  const anim = useRef({ speed: 0, grounded: true, emote: null, sit: 0, sitHeight: 0.45 })
  const tag = useMemo(() => nameTagTexture(name || 'Visitor', accent || '#00e5d0'), [name, accent])
  const bubbleState = useRef({ rev: -1 })
  const bubbleTex = useMemo(() => canvasTexture(512, 192, () => {}), [])
  useEffect(() => () => { tag.dispose(); bubbleTex.dispose() }, [tag, bubbleTex])
  const pos = useRef(new THREE.Vector3())
  const first = useRef(true)

  useFrame((_, dt) => {
    const pd = peerData.get(id)
    if (!pd || !pd.to || !group.current) return
    const now = performance.now()
    const a = THREE.MathUtils.clamp((now - pd.t0) / Math.max(1, pd.t1 - pd.t0), 0, 1.5)
    const from = pd.from || pd.to
    const x = from[0] + (pd.to[0] - from[0]) * a
    const y = from[1] + (pd.to[1] - from[1]) * a
    const z = from[2] + (pd.to[2] - from[2]) * a
    if (first.current) { pos.current.set(x, y, z); first.current = false }
    pos.current.lerp(new THREE.Vector3(x, y, z), 1 - Math.exp(-20 * dt))
    group.current.position.copy(pos.current)
    // privacy: visitors inside a privately booked room aren't shown during a tour/photos of it
    group.current.visible = !inMaskedRoom(pos.current.x, pos.current.y, pos.current.z)
    let d = (pd.targetYaw ?? 0) - inner.current.rotation.y
    d = Math.atan2(Math.sin(d), Math.cos(d))
    inner.current.rotation.y += d * (1 - Math.exp(-12 * dt))
    anim.current.speed = pd.speed
    anim.current.grounded = pd.grounded
    anim.current.emote = now < pd.emoteUntil ? pd.emote : null
    anim.current.sit = pd.sit || 0
    anim.current.sitHeight = pd.sitHeight || 0.45

    // chat bubble
    const showBubble = pd.bubble && now < pd.bubbleUntil
    bubble.current.visible = !!showBubble
    if (showBubble && bubbleState.current.rev !== pd.bubbleRev) {
      bubbleState.current.rev = pd.bubbleRev
      const text = pd.bubble
      const ctx = bubbleTex.image.getContext('2d')
      ctx.clearRect(0, 0, 512, 192)
      ctx.fillStyle = 'rgba(244,239,255,0.95)'
      roundRect(ctx, 8, 8, 496, 150, 36)
      ctx.fill()
      ctx.fillStyle = '#16112a'
      ctx.font = `700 34px ${FONTS.body}`
      ctx.textAlign = 'center'
      wrapText(ctx, text, 256, 64, 450, 40)
      bubbleTex.needsUpdate = true
    }
  })

  return (
    <group ref={group}>
      <group ref={inner}>
        <Avatar state={anim.current} accent={accent} skin={skin} />
      </group>
      <sprite position={[0, 2.15, 0]} scale={[1.6, 0.4, 1]}>
        <spriteMaterial map={tag} depthWrite={false} transparent />
      </sprite>
      <sprite ref={bubble} position={[0, 2.75, 0]} scale={[2, 0.75, 1]} visible={false}>
        <spriteMaterial map={bubbleTex} depthWrite={false} transparent />
      </sprite>
    </group>
  )
}
