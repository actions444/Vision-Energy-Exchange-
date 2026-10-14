# Vision Storms Energy Exchanges

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
| **Vehicle stability & recovery** (new) | Low centre of gravity and a stability assist that rights the body after curbs, planters or crashes (an earlier test version rolled onto its side hitting a 0.45 m ramp with one side; the new setup stays upright, max 41° tilt). Flip vehicle (F, or the Flip button on phones) turns it upright on the nearest clear spot; it also happens automatically if the car stays overturned for 3 s. Reset vehicle (R / Reset button) moves it to the nearest clear road. Cars that leave the map or fall out of the world are put back on the road automatically. Continuous collision detection against walls at speed. |
| **Avatar recovery** (new) | Unstuck button: moves you to the nearest clear floor spot (never onto furniture). Falling out of the world returns you to the nearest checkpoint (building entrances / room entrances / your last safe spot). An invisible boundary wall surrounds the map. |
| **Media library** (new) | Owner tools → Media library: upload songs (MP3/M4A, tags + embedded cover read automatically), album covers, music videos, movies, audiobook chapters, e-books (PDF/TXT; PDF covers rendered). Drafts vs published, edit, delete, storage meter. Persistent. |
| **Room music** | Crossfading room playlists. Published songs become the "Trinity Reign · Catalog" playlist plus one playlist per album. Defaults: Threads upbeat, Lounge R&B/soul, Studio 202 = your catalog (demo until you publish songs), theaters silent (the movie is the sound), streets optional ambient (Settings). The owner's music setup is shared with every visitor. |
| **Player** | Play/pause, previous/next, shuffle, repeat (all/one/off), seek, volume, mute; remembers volume. |
| **Storms Records** | "Browse albums" (HUD button inside the store): albums, playlists, your own list; pick songs to play while you're in the store. |
| **Cinema** (new) | Lobby with box office (showtimes), concessions, posters from your movies; two stadium-seated auditoriums with recliners, aisles with step lights, sconces that dim, EXIT signs, screen & sound controls, 1.85:1 screens. The Plaza Screening Room is a small stadium theater too. Owner starts screenings for everyone (synchronized from a shared start time; late arrivals join at the current position; tested at 0.05–0.5 s drift); visitors can watch privately when nothing is scheduled. |
| **Elevator** (upgraded) | LED ceiling and floor strips, illuminated floor buttons (lit while queued), floor displays with direction arrows in the car and above every hall door, door-frame lights that brighten while open, up/down arrival lanterns, arrival chime, optional elevator music (Music admin → "Plaza elevator"). Movement and controls unchanged. |
| **Owner access** (new) | The owner can open every door and visit any room without renting it. Entering or inspecting a privately booked space is written to an access log only the owner can read (Owner tools → Rooms & access). Customers' privacy settings are not changed. |
| **Decorate** (new) | A Decorate button appears inside the Plaza's six rooms. Furniture, lighting (lamps + room lighting presets), flooring (incl. black marble with gold/purple/teal/pink veins), wall paint, wallpaper, door styles, decorations, outdoor pieces. Preview (green = allowed, red = outside the room or in the doorway), place, move, rotate, remove, undo, save. Who can: the owner (any room) or the room's current renter. On a self-hosted server the server re-checks the renter's booking and rejects items outside the room; in the rental preview sandbox designs are saved on that device. |
| **Prices** | Rates per category in USD for hour/day/week/month (0 = not offered). Standard furnished commercial rooms (Screening Room, Vision Recording Studio, Boardroom): $9/hour, $30/day, $65/week, $200/month. Residential/personal categories keep the monthly introductory rates ($4.99 … $99.99). Every price shows its VSE Credits equivalent (100 credits = $1, owner-editable in Rentals admin → Prices). Paying with credits is not switched on yet: rentals are charged once, in dollars. Rooms still on untouched default prices moved automatically; hand-set prices and existing bookings are kept. |
| **Vision Cinema frontage** | Portico with marble columns, gold-trimmed canopy with downlights, lit marquee with bulbs, vertical CINEMA blade sign, poster light boxes, glass doors, red carpet with brass stanchions, black granite paving, topiary planters, flower beds, benches. Columns, planters and stanchions have colliders. |
| **Parking lot** | Asphalt, stall lines, wheel stops, granite curbs (west/north/south; east edge is the entrance), planted islands with trees, lamps and flowers, pedestrian crossing, aisle arrows, paved walkway to the plaza; curbs, islands, trees, lamps and parked cars collide. Street lamps throw soft light pools on the ground at night. |
| **Cinema guide** | Objective card: Arrive at the Cinema → Go inside → Take a recliner. Each step checks the avatar's real position twice a second and skips ahead if you are already further on; Hide button, and Help → "Start the cinema guide again". |
| **Plaza interiors** (new) | Lobby and corridors: black marble with gold veins, plum runner, walnut wainscoting with brass rail, panelled upper walls, crown moulding with a warm LED cove, wall sconces, walnut door casings, crystal / gold / modern chandeliers, warmer lighting. |
| **Furniture collision & sitting** (fixed) | The avatar can no longer climb onto sofas, chairs or tables (step height is now 0.3 m: curbs and stair/aisle steps still work). Standing up picks a free spot beside the seat (tested with the avatar's own capsule) instead of leaving you inside the sofa. Smooth sit-down, seats taken by other visitors are refused, recliners have fitted colliders with walkable leg room, imported furniture gets a "Seating" collider and a seat editor (count, height, front/back, facing). |
| **Room previews** (new) | Every listing has View room (above the prices): live photos rendered from the actual room (entrance, full room, furniture, lighting, another angle) plus any photos the owner uploads, details (floor, occupancy, m², furniture included, amenities, availability), Take virtual tour (you're placed inside the real room, read-only, with a Return to listing bar) and Visit room (takes you to the room's door). The booking form is kept while you look. Tours and photos of a room someone has booked privately hide the renter's decorations, sign/message and any visitors inside. Owner: description, furniture, amenities, photo uploads and tour start in Rentals admin → Rooms. |
| Rentals | Rules, booking, owner approval, access checks and a Stripe Checkout + verified webhook integration on the server. Payments stay off until Stripe keys are configured (`DEV_PAYMENTS=1` gives clearly labelled test payments). |
| Multiplayer | WebSocket relay or same-device tabs: avatars, chat, emotes, sitting, owner-set weather. |

## Renamed (visible names only; IDs and saved data unchanged)

| Before | After |
|---|---|
| Vision Storms World | Vision Storms Energy Exchanges |
| Neon Lounge / Vision Storms Lounge | Vision Music Lounge |
| Neon Lounge Club Night (playlist) | Vision Music Lounge Club Night |
| Vision Storms Cinema | Vision Cinema |
| Studio 202 (VSP-202) | Vision Recording Studio |
| Studio 202 Reel (playlist) | Vision Recording Studio Reel |
| Vision Storms Bistro | Vision Bistro |
| Vision Storms Plaza | Vision Storms Energy Exchanges Plaza |
| Vision Storms Square | Energy Exchanges Square |
| "Neon color" (avatar setting) | Accent color |

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
