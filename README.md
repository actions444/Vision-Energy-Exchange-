# Vision Storms World (→ Vision Storms Exchanges — Energy Exchanges)

Trinity Reign's walkable, browser-based 3D commercial city. React 19, Three.js, React Three Fiber,
Rapier physics, Zustand. Runs on desktop and phones.

```bash
npm install
npm run dev            # http://localhost:5173 (development: owner tools on, uploads saved in this browser)
npm run build          # static site in dist/
ADMIN_TOKEN=… npm run server   # API + file storage + multiplayer relay + serves dist/ on :8787
npm run build:single && node scripts/artifact.mjs   # one-file build used for the Claude-hosted page
```

## Where data lives (backends)

`src/backend/backend.js` picks one automatically at startup:

| Backend | When | Who can change shared content | Storage |
| --- | --- | --- | --- |
| **hosted** | the Claude-hosted page | the page's owner and editors (platform-enforced) | page database + file store, 20 MB per file, no audio/GLB types (MP3s are packed losslessly into MP4, see `src/media/mp3mp4.js`) |
| **server** | `npm run server` (same origin, or the address saved at owner sign-in) | whoever signs in with `ADMIN_TOKEN` (Settings → Owner sign-in) | `server/data/store.json` + `server/data/files/` (2 GB per upload by default, range requests for streaming) |
| **local** | `npm run dev` only | everyone (development) | this browser's IndexedDB |

Visitors never see owner panels, and the backend refuses their writes (tested on the server and against a mock of the hosted platform).

## What works

| Area | Status |
| --- | --- |
| City | Avenue, cross street, lane markings, curbs, trees, streetlights, square with fountain, parking lot, skyline. Day/night cycle, weather (clear/cloudy/rain/storm), owner-controlled. |
| Buildings | Reign Gallery, Storms Records, Lounge, **Vision Storms Cinema** (new), **Vision Storms Plaza** (3 floors, stairs, elevator, 6 furnished rooms). |
| Avatar & movement | Procedural avatar or an imported GLB avatar; walk, run, jump, wave, sit/stand on any chair, sofa, bench or recliner; doors, stairs, elevator. Joystick + buttons on phones. |
| **Driving** (new) | One fully drivable Sovereign SUV on the lot behind the Plaza: walk to the driver's door, E / tap to get in. WASD or joystick to drive and steer, Space / Brake button to brake, S to reverse, E / tap to get out. Ray-cast vehicle physics (suspension, tyre grip, all-wheel drive), collisions, speedometer, chase camera, headlights at night. |
| **Media library** (new) | Owner tools → Media library: upload songs (MP3/M4A, tags + embedded cover read automatically), album covers, music videos, movies, audiobook chapters, e-books (PDF/TXT; PDF covers rendered). Drafts vs published, edit, delete, storage meter. Persistent. |
| **Room music** | Crossfading room playlists. Published songs become the "Trinity Reign · Catalog" playlist plus one playlist per album. Defaults: Threads upbeat, Lounge R&B/soul, Studio 202 = your catalog (demo until you publish songs), theaters silent (the movie is the sound), streets optional ambient (Settings). The owner's music setup is shared with every visitor. |
| **Player** | Play/pause, previous/next, shuffle, repeat (all/one/off), seek, volume, mute; remembers volume. |
| **Storms Records** | "Browse albums" (HUD button inside the store): albums, playlists, your own list; pick songs to play while you're in the store. |
| **Cinema** (new) | Lobby with box office (showtimes), concessions, posters from your movies; two stadium-seated auditoriums with recliners, aisles with step lights, sconces that dim, EXIT signs, screen & sound controls, 1.85:1 screens. The Plaza Screening Room is a small stadium theater too. Owner starts screenings for everyone (synchronized from a shared start time; late arrivals join at the current position; tested at 0.05–0.5 s drift); visitors can watch privately when nothing is scheduled. |
| **Elevator** (upgraded) | LED ceiling and floor strips, illuminated floor buttons (lit while queued), floor displays with direction arrows in the car and above every hall door, door-frame lights that brighten while open, up/down arrival lanterns, arrival chime, optional elevator music (Music admin → "Plaza elevator"). Movement and controls unchanged. |
| **Owner access** (new) | The owner can open every door and visit any room without renting it. Entering or inspecting a privately booked space is written to an access log only the owner can read (Owner tools → Rooms & access). Customers' privacy settings are not changed. |
| **Decorate** (new) | A Decorate button appears inside the Plaza's six rooms. Furniture, lighting (lamps + room lighting presets), flooring (incl. black marble with gold/purple/teal/pink veins), wall paint, wallpaper, door styles, decorations, outdoor pieces. Preview (green = allowed, red = outside the room or in the doorway), place, move, rotate, remove, undo, save. Who can: the owner (any room) or the room's current renter. On a self-hosted server the server re-checks the renter's booking and rejects items outside the room; in the rental preview sandbox designs are saved on that device. |
| Rentals | Rules, booking, owner approval, access checks and a Stripe Checkout + verified webhook integration on the server. Payments stay off until Stripe keys are configured (`DEV_PAYMENTS=1` gives clearly labelled test payments). |
| Multiplayer | WebSocket relay or same-device tabs: avatars, chat, emotes, sitting, owner-set weather. |

## Not done yet (honest list)

- **Accounts:** no customer registration/login yet. The hosted page uses claude.ai sign-in (owner/editor vs viewer); the server has one owner token. Real accounts (roles, MFA, password resets) need a deployed auth service.
- **Payments:** no live payments until Stripe keys and a deployed server are set up and tested. Nothing is activated from a browser-side confirmation.
- **Movies on the hosted page** are limited to 20 MB files. Full-length films need the self-hosted server (or a video CDN such as Cloudflare Stream / Mux for many viewers).
- **Driving in multiplayer:** other visitors see your avatar move, not the car (vehicle sync is next on the multiplayer list).
- Decorating: items can overlap each other or the room's built-in furniture (only walls and doorways are checked). Window packs, NPC packs and pet packs show as not owned until the marketplace exists. Renters can't save designs on the Claude-hosted page (its database only lets the owner write); they can on a self-hosted server.
- One vehicle so far; boats, homes, furniture marketplace, districts, creator marketplace and subscriptions are later phases of the master plan.
- Reign Books interior, e-book reader UI and audiobook lounge are not built yet (uploads already work).
- GLB uploads to shared storage (owner-placed models that persist for everyone) are not built yet; the Asset library still saves imports in the browser.

## Project map
```
src/backend     backend detection: hosted page / self-hosted server / dev
src/media       media library, upload pipeline, MP3→MP4 packing, PDF rendering
src/cinema      screenings, sync clock, the visitor's video player
src/vehicles    vehicle catalog and the drivable vehicle
src/music       zone tracker, crossfade engine, library, demo synth worker
src/world       city, plaza, cinema, rooms, doors, furniture, materials, sky
src/player      avatar, character controller, camera
src/rentals     rental client;  shared/rentals.js  rules shared with the server
src/ui          HUD, panels, owner tools
server          API (content store, files, rentals, Stripe webhook) + multiplayer relay
```
