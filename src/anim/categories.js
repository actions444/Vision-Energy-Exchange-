// Centralized Animation Gallery categories - the single source of truth for every expressive
// pose/animation the game understands. Shared by the default procedural avatar
// (player/Avatar.jsx, which implements every one of these directly), imported skeletal avatars
// (assets/PlacedAssets.jsx's ImportedAvatar), the cross-rig retargeted clip library
// (anim/library.js) and the gallery UI (ui/ActionsPanel.jsx).
//
// A regex here is how an uploaded model's own clip names get auto-detected into a category -
// it's checked against that clip's name (case-insensitive). When a model's clip names don't say
// what they are, ui/AnimationAdmin.jsx lets an admin assign one by hand instead; either way, once
// a clip fills a category here it joins the shared pool every other skeletal avatar can borrow
// it from via cross-skeleton retargeting (anim/humanoid.js, anim/retarget.js) - no need for every
// uploaded character to carry its own copy of every pose.
export const ANIM_CATEGORIES = {
  idle: /idle|stand|breath|rest/i,
  walk: /walk/i,
  run: /run|jog|sprint/i,
  jump: /jump|fall|air/i,
  wave: /wave|greet|hello/i,
  sit: /sit|seat|chair/i,
  dance: /dance|dancing/i,
  sing: /sing|singing|vocal/i,
  talk: /talk|speak|convers/i,
  laugh: /laugh/i,
  cry: /cry|sob|weep/i,
  cook: /cook|stir|chef/i,
  clean: /clean|wipe|sweep|mop/i,
  exercise: /exercise|squat|workout|gym/i,
  perform: /perform|act|pose|model/i,
  // added so the previously "default-avatar only" poses in ui/ActionsPanel.jsx can be filled by
  // any contributing clip (auto-matched by name, or assigned by hand in the admin panel)
  clap: /clap|applaud/i,
  bow: /bow|salute/i,
  point: /point/i,
  chest: /hand ?to ?chest|chest ?tap/i,
  open: /arms ?open|open ?arms|welcome/i,
  reach: /reach/i,
  hold: /hold ?hands|^hold$/i,
  read: /read/i,
  write: /write|typing|type/i,
  tray: /tray|serve/i,
  shake: /shaker|cocktail/i,
  brow: /brow|shield|scan/i,
  blow: /whistle|blow/i,
}

export const CATEGORY_LABELS = Object.fromEntries(Object.keys(ANIM_CATEGORIES).map((k) => [k, k[0].toUpperCase() + k.slice(1)]))
