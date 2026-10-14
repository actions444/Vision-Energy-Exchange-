# Vision Storms World

Trinity Reign's portfolio as a walkable, browser-based 3D city. Built with React 19, Three.js,
React Three Fiber and Rapier physics.

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # static site in dist/ (deploy to Netlify, Vercel, Cloudflare Pages, S3…)
npm run server         # multiplayer relay on ws://localhost:8787
npm run build:single && node scripts/artifact.mjs   # one-file build used for the shareable preview
```

## What's in milestone 1

| Area | Status |
| --- | --- |
| City | Wet-asphalt avenue and cross street, marble sidewalks with climbable curbs, neon curb lights, streetlights, plaza planters, six venues, a skyline, night sky, storm rain and lightning. Every solid object has a collider. |
| Reign Gallery | Enterable. Working double doors (physics colliders swing with them), seven portfolio kiosks, a latest-drop screen that can play your own video, a connect wall and an audio-reactive equalizer sculpture. |
| Storms Records, Neon Lounge | Enterable rooms with doors, crates, turntables, album wall, DJ booth, dance floor and light beams that react to the music. |
| Vision Cinema, Reign Books | Exteriors with locked doors ("opens soon"). Interiors are a later milestone. |
| Avatar | Full-body procedural avatar (two-segment arms and legs) with walk, run, jump, idle and wave animation driven by real movement speed. Neon color and skin tone are selectable. |
| Movement | Rapier kinematic character controller: walking, running, jumping, wall sliding, slopes, auto-step over curbs, snap to ground. |
| Camera | Third-person orbit camera with collision (never clips through walls). Drag to look, wheel to zoom. |
| Controls | Desktop: WASD/arrows, Shift, Space, E, 1, B, T. Mobile: virtual joystick (push to the edge to run), drag to look, Jump/Run/Wave buttons, tap the prompt to interact. |
| Portfolio | All content from the original site (roles, tagline, seven crafts, latest drop with tracklist, connect/socials) lives in `src/config/portfolio.js` and appears in the gallery. |
| GLB/GLTF import | Drop Tripo 3D / Meshy AI exports into the Asset library. `.glb` or `.gltf` + `.bin` + textures; Draco and Meshopt compression supported. Place, move, rotate, resize, pick collision (exact trimesh / box / none), or use a character as your avatar (its idle/walk/run/jump/wave clips are detected by name). Imports are saved in the browser. |
| Multiplayer | Real-time: other visitors appear as avatars with name tags, interpolated movement, wave emotes and chat bubbles. Two transports work today: tabs on the same device (BroadcastChannel) and the WebSocket relay in `server/`. |
| Music system | See below. |

## Room music system

- **Trigger zones**: `src/config/rooms.js` lists every music zone as a 3D box. `MusicZones.jsx` checks the local avatar against them each frame (smallest zone wins, 0.25 s dwell so doorways don't flicker).
- **Crossfades**: `src/music/engine.js` keeps a pool of Web Audio decks. Changing room fades the old playlist out while the new one fades in (2.5 s). Each playlist remembers its track and position, so walking back resumes where it was.
- **Player**: artwork, title, artist, room and playlist, volume, mute and next. Volume and mute are saved and apply in every room.
- **Admin dashboard** (turn on Settings → Admin tools, then Music admin): upload MP3/M4A/WAV/OGG (title, artist and cover art are read from ID3 tags), change artwork, build and reorder playlists, shuffle, add licensed radio (direct stream or official embedded player, a license note is required), assign a playlist to every room, show trigger zones, copy a manifest.
- **Mobile**: audio unlocks on the Enter tap (and on any later tap); if a browser still blocks it, the player shows "Tap to turn on music".
- **Multiplayer**: music is never networked. Each visitor hears the room their own avatar is in.
- **Demo**: four original demo playlists are synthesised in a Web Worker (Gallery Nights, Storms Records Rotation, Neon Lounge Live, City Storm), so the three rooms and the streets each play different music with no audio files shipped.

### Adding a room
1. Build its geometry (see `Venue` with an `interior` in `src/world/City.jsx`, or place an imported GLB with exact collision).
2. Add a zone to `src/config/rooms.js` with its bounds and default playlist. It appears in Music admin automatically.

### Shipping music to every visitor
Admin edits are saved on the device you make them on. To publish them:
1. Copy your MP3s to `public/music/` (artwork to `public/music/art/`).
2. Music admin → Publish → Copy music manifest, save it as `public/music/manifest.json` (see `manifest.example.json`).
3. Rebuild and deploy.

Shipping 3D models works the same way: put GLBs in `public/assets/`, use Asset library → Copy layout, save as `public/assets/manifest.json`.

## Multiplayer server
`server/index.js` is a small WebSocket relay with rooms, input validation, chat rate-limiting and a `/health` endpoint. Deploy it to any Node host with WebSocket support (Render, Railway, Fly.io, a VPS), then pick Multiplayer → Relay server and enter its `wss://` address.
To use a hosted realtime service instead (Colyseus, Socket.IO, Ably, PartyKit, Supabase Realtime…), add an adapter with the same four methods in `src/net/adapters.js`.

## Still to build
- Interiors for Vision Cinema and Reign Books; malls, clothing stores, restaurants and more theaters.
- Server-authoritative multiplayer (the relay trusts clients), accounts, moderation, voice chat, persistent rooms.
- A real admin login and server storage for uploads. Admin tools are a device switch, not security, and uploads stay in that browser until you ship them with the manifest.
- Imported buildings get collision but no automatic doors; doors on GLB buildings need a door asset or a portal marker.
- Retargeting animations between different character rigs; KTX2 texture support; LOD/streaming for large imported cities.
- Radio crossfades on iPhone: iOS ignores script volume on `<audio>`, so streams start and stop without a fade there.
- Real portfolio links, titles and socials (placeholders are marked "Example").

## Project map
```
src/config      portfolio content, rooms/zones, palette
src/world       city, gallery, enterable rooms, doors, materials, sky/rain
src/player      avatar, character controller, camera
src/input       keyboard, touch joystick, drag-to-look
src/assets      GLB/GLTF import, library, placed models, imported avatars
src/net         network adapters, peer interpolation, remote avatars
src/music       zone tracker, crossfade engine, library/admin data, demo synth worker, ID3 reader
src/audio       shared Web Audio graph, gallery kiosk audio and video
src/ui          title screen, HUD, panels, music player, admin dashboard
server          WebSocket relay
```
