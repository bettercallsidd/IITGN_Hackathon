/*
 * HOW TO CUSTOMISE: change CONFIG only.
 * Swap images in /assets with the same file names, or change the paths in CONFIG.ASSETS.
 * Avatars and accessories live in CONFIG.STORE; prices are in diamonds.
 * Accounts / cloud save need the server (npm start); without it the game runs as a guest and saves on this device.
 */
const CONFIG = {
  // ── BRAND: every text colour and font comes from here ─────────────────────
  BRAND: {
    title:   "BombDodger",
    tagline: "Catch the stars. Dodge the bombs.",
    font:    "'Trebuchet MS', 'Segoe UI', sans-serif",   // font family for all text
    main:    "#ffffff",   // main text colour
    accent:  "#ffd23f",   // highlights: prices, NEW BEST, buttons, power-up bars
    danger:  "#ff3b3b",   // warnings, tags
    good:    "#46d36b",   // "equipped" state
    dark:    "#1b2a41",   // text on accent buttons + button outlines
    panel:   "rgba(14,32,66,0.88)",   // card / panel background
    outline: "rgba(0,0,0,0.75)",      // text outline for readability
  },

  // ── PLAYER ────────────────────────────────────────────────────────────────
  PLAYER: {
    image:     "basket",   // key in ASSETS
    width:     110,        // px in the game world
    speed:     420,        // keyboard speed, px/s
    glide:     12,         // pointer-follow snappiness
    bottomGap: 30,         // gap below the basket
  },

  // ── ITEMS: name = key in ASSETS. type: good | bad | power ─────────────────
  // A power item's `effect` must exist in POWERUPS. Add a line to add an item.
  ITEMS: [
    { name: "star",      width: 56, points: 10, type: "good",  weight: 70 },
    { name: "bomb",      width: 60,             type: "bad",   weight: 30 },
    { name: "lightning", width: 58,             type: "power", effect: "double", weight: 5 },
    { name: "snowflake", width: 58,             type: "power", effect: "slow",   weight: 5 },
  ],

  // ── RULES ─────────────────────────────────────────────────────────────────
  RULES: {
    lives:         3,
    roundSeconds:  45,
    spawnStart:    0.8,    // seconds between spawns at round start
    spawnEnd:      0.4,    // ... at round end
    fallSpeedMin:  180,    // px/s
    fallSpeedMax:  260,
    speedBoostEnd: 1.4,    // fall-speed multiplier reached at round end
    hitboxShrink:  0.70,   // hitbox = this fraction of drawn size
    flashDuration: 0.2,    // red flash on bomb, seconds
    shakeDuration: 0.25,   // screen shake on bomb, seconds
  },

  // ── POWER-UPS: one entry per effect ───────────────────────────────────────
  POWERUPS: {
    double: { duration: 5, factor: 2   },   // points multiplier
    slow:   { duration: 4, factor: 0.5 },   // fall-speed multiplier
  },

  // ── ECONOMY: coins come from score, diamonds are bought with coins ────────
  ECONOMY: {
    coinsPerScore:   1,    // coins earned per score point at the end of a round
    coinsPerDiamond: 50,   // exchange rate in the store
  },

  // ── STORE: avatars (skins with a perk) and accessories (fit every avatar) ─
  // filter = CSS filter applied to the basket image; perk keys: speed, width, coins, life
  // tag = optional ribbon on the card (NEW / HOT / BEST ...). Emoji accessories can be swapped for images later.
  STORE: {
    avatars: [
      { id: "classic", name: "Classic",      price: 0,  filter: "none", perk: {}, desc: "The original basket" },
      { id: "ruby",    name: "Ruby Rush",    price: 6,  filter: "hue-rotate(150deg) saturate(1.4)", perk: { speed: 1.15 }, desc: "+15% move speed", tag: "NEW" },
      { id: "ocean",   name: "Ocean Wave",   price: 10, filter: "hue-rotate(200deg) saturate(1.3)", perk: { width: 1.2 },  desc: "20% wider basket" },
      { id: "toxic",   name: "Toxic Green",  price: 14, filter: "hue-rotate(90deg) saturate(1.5)",  perk: { coins: 1.25 }, desc: "+25% coins", tag: "HOT" },
      { id: "royal",   name: "Royal Violet", price: 20, filter: "hue-rotate(260deg) saturate(1.4)", perk: { life: 1 },     desc: "Starts with +1 life", tag: "BEST" },
      { id: "shadow",  name: "Shadow",       price: 30, filter: "grayscale(1) brightness(0.55) contrast(1.3)", perk: { speed: 1.1, width: 1.1 }, desc: "+10% speed and width" },
      { id: "gold",    name: "Golden",       price: 50, filter: "sepia(1) saturate(3) brightness(1.15)",       perk: { coins: 1.5 },            desc: "+50% coins", tag: "LEGEND" },
    ],
    accessories: [
      { id: "shades",     name: "Shades",     price: 3,  emoji: "🕶️" },
      { id: "bow",        name: "Bow",        price: 4,  emoji: "🎀" },
      { id: "cap",        name: "Cap",        price: 5,  emoji: "🧢" },
      { id: "headphones", name: "Headphones", price: 7,  emoji: "🎧" },
      { id: "tophat",     name: "Top Hat",    price: 9,  emoji: "🎩" },
      { id: "crown",      name: "Crown",      price: 15, emoji: "👑", tag: "HOT" },
    ],
  },

  // ── TUTORIAL: shown to new players. Failing a step rewinds to its start ───
  // goal: move | catch | dodge   item: ITEMS name
  TUTORIAL: [
    { goal: "move",  text: "Drag, or use ← → / A D, to move the basket" },
    { goal: "catch", item: "star",      text: "Catch the falling star!" },
    { goal: "dodge", item: "bomb",      text: "Bombs cost a life. Dodge it!" },
    { goal: "catch", item: "lightning", text: "Power-ups help you. Catch the lightning!" },
  ],

  // ── DEFAULTS: starting player settings ────────────────────────────────────
  DEFAULTS: { volume: 0.7, vibration: 0.5 },   // 0..1

  // ── ASSETS: every image path ──────────────────────────────────────────────
  ASSETS: {
    background: "assets/background.png",
    bg0:        "assets/bg-meadow.png",
    bg1:        "assets/bg-night.png",
    bg2:        "assets/bg-candy.png",
    basket:     "assets/basket.png",
    star:       "assets/star.png",
    bomb:       "assets/bomb.png",
    lightning:  "assets/lightning.png",
    snowflake:  "assets/snowflake.png",
    heart:      "assets/heart.png",
    heartEmpty: "assets/heart-empty.png",
    clock:      "assets/clock.png",
    sparkle:    "assets/sparkle-burst.png",
    explosion:  "assets/explosion.png",
    logo:       "assets/logo-badge.png",
    play:       "assets/play-button.png",
    restart:    "assets/restart-button.png",
    trophy:     "assets/trophy.png",
  },

  // ── SCENES: scenic backgrounds that crossfade; each shows `scene.seconds` ──
  SCENES: { keys: ["bg0", "bg1", "bg2"], seconds: 15, fade: 2 },

  // ── DAILY: 3 tasks per day (same for everyone), coin reward each ──────────
  // stat: stars | score | bombsHit (max in a round) | power | rounds | cleanRound
  DAILY_COUNT: 3,
  DAILY_POOL: [
    { id: "stars60",  text: "Catch 60 stars",              stat: "stars",   target: 60,  reward: 40 },
    { id: "stars150", text: "Catch 150 stars",             stat: "stars",   target: 150, reward: 90 },
    { id: "score200", text: "Score 200 in one round",      stat: "score",   target: 200, reward: 60 },
    { id: "score400", text: "Score 400 in one round",      stat: "score",   target: 400, reward: 120 },
    { id: "power5",   text: "Catch 5 power-ups",           stat: "power",   target: 5,   reward: 50 },
    { id: "rounds5",  text: "Play 5 rounds",               stat: "rounds",  target: 5,   reward: 40 },
    { id: "clean1",   text: "Finish a round with 0 bombs", stat: "clean",   target: 1,   reward: 70 },
  ],

  // ── WORLD: internal game size (scaled to fit the window) ──────────────────
  WORLD: { w: 450, h: 800, deltaCap: 0.05 },
};

const { BRAND, PLAYER, RULES, POWERUPS, WORLD, ECONOMY, STORE } = CONFIG;
const TUT = CONFIG.TUTORIAL;
const W = WORLD.w, H = WORLD.h, CX = W / 2;
const font = (px, weight = 'bold') => `${weight} ${px}px ${BRAND.font}`;

// ─── Canvas / DPI setup ──────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
const gbtn   = document.getElementById('gbtn');

function resizeCanvas() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width  = W * scale + 'px';
  canvas.style.height = H * scale + 'px';
  // Backing store = on-screen physical pixels, never below the world size (keeps zoom-out sharp)
  const res = Math.max(scale * (window.devicePixelRatio || 1), 1);
  canvas.width  = Math.round(W * res);
  canvas.height = Math.round(H * res);
  ctx.setTransform(res, 0, 0, res, 0, 0);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ─── Image loading ────────────────────────────────────────────────────────────
const IMAGES = {};
const loadImage = (key, src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload  = () => { IMAGES[key] = img; resolve(); };
  img.onerror = () => reject(new Error(`Failed to load: ${src}`));
  img.src = src;
});

// ─── Profile (coins, diamonds, unlocks, settings) ────────────────────────────
// Saved on this device always; also saved to the database when signed in.
const PKEY = 'catchRushProfile', AKEY = 'catchRushAuth';
const freshProfile = () => ({
  coins: 0, diamonds: 0, owned: ['classic'], ownedAcc: [], skin: 'classic', acc: null,
  best: 0, tutorialDone: false, daily: null, ...CONFIG.DEFAULTS,
});
let profile = freshProfile();
let account = { token: null, email: null };
try {
  Object.assign(profile, JSON.parse(localStorage.getItem(PKEY)) || {});
  account = JSON.parse(localStorage.getItem(AKEY)) || account;
  profile.best = Math.max(profile.best, parseInt(localStorage.getItem('catchRushBest'), 10) || 0);
} catch (e) {}

let syncTimer;
function saveProfile() {
  try { localStorage.setItem(PKEY, JSON.stringify(profile)); } catch (e) {}
  if (!account.token) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => api('/api/state', 'PUT', { state: profile }).catch(() => {}), 500);
}
function saveAccount() { try { localStorage.setItem(AKEY, JSON.stringify(account)); } catch (e) {} }

async function api(path, method = 'GET', body) {
  const r = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(account.token ? { Authorization: 'Bearer ' + account.token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 401 && account.token) { account = { token: null, email: null }; saveAccount(); }
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

// ─── Google sign-in (Google Identity Services; needs the server + GOOGLE_CLIENT_ID) ──
let gReady = false, gError = '';
async function initGoogle() {
  try {
    const { googleClientId } = await api('/api/config');
    if (!googleClientId) throw new Error('GOOGLE_CLIENT_ID is not set in .env');
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.onload = res; s.onerror = () => rej(new Error('Google script blocked'));
      document.head.appendChild(s);
    });
    google.accounts.id.initialize({ client_id: googleClientId, callback: onGoogle });
    google.accounts.id.renderButton(gbtn, { theme: 'filled_blue', size: 'large', width: 240 });
    gReady = true;
  } catch (e) { gError = 'Sign-in unavailable: ' + e.message; }
}

async function onGoogle(resp) {
  try {
    const r = await api('/api/login', 'POST', { credential: resp.credential });
    account = { token: r.token, email: r.email }; saveAccount();
    if (r.state) Object.assign(profile, r.state);   // ponytail: saved cloud progress wins over guest progress
    saveProfile();
    toast('Signed in as ' + r.email);
  } catch (e) { toast('Sign-in failed'); }
}

function logout() {
  clearTimeout(syncTimer);
  account = { token: null, email: null }; saveAccount();
  profile = freshProfile(); saveProfile();   // progress stays safe in the database
  try { google.accounts.id.disableAutoSelect(); } catch (e) {}
  toast('Logged out');
}

async function deleteAccount() {
  const a = prompt("This permanently deletes your account and ALL progress.\nType 'delete' to confirm:");
  if (a === null) return;
  if (a.trim() !== 'delete') { toast("Not deleted: you must type 'delete'"); return; }
  try { await api('/api/account', 'DELETE', { confirm: 'delete' }); }
  catch (e) { toast('Delete failed, try again'); return; }
  clearTimeout(syncTimer);
  account = { token: null, email: null }; saveAccount();
  profile = freshProfile(); saveProfile();
  toast('Account deleted');
}

function exitGame() {
  if (!confirm('Exit the game?')) return;
  window.close();   // only works for tabs the game opened itself, so fall back to a blank page
  setTimeout(() => location.replace('about:blank'), 200);
}

// ─── Daily challenges ────────────────────────────────────────────────────────
// ponytail: date comes from the device clock (can be cheated); move to server time when the API owns it.
const todayKey = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
function ensureDaily() {
  const key = todayKey();
  if (profile.daily && profile.daily.date === key) return profile.daily;
  let seed = key, pool = CONFIG.DAILY_POOL.slice(), tasks = [];
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;   // same tasks for all players today
  while (tasks.length < CONFIG.DAILY_COUNT && pool.length) {
    const t = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    tasks.push({ id: t.id, progress: 0, claimed: false });
  }
  profile.daily = { date: key, tasks };
  saveProfile();
  return profile.daily;
}
const dailyDef = t => CONFIG.DAILY_POOL.find(d => d.id === t.id);
const dailyDone = t => t.progress >= dailyDef(t).target;
// Called with stat updates; "max" stats keep the best value, others accumulate.
function dailyAdd(stat, n) {
  const d = ensureDaily();
  d.tasks.forEach(t => {
    const def = dailyDef(t);
    if (!def || def.stat !== stat || t.claimed) return;
    t.progress = stat === 'score' ? Math.max(t.progress, n) : Math.min(def.target, t.progress + n);
  });
}
function claimDaily(t) {
  if (!dailyDone(t) || t.claimed) return;
  t.claimed = true;
  profile.coins += dailyDef(t).reward;
  saveProfile();
  toast(`+${dailyDef(t).reward} 🪙 claimed!`);
}
const dailyClaimable = () => ensureDaily().tasks.filter(t => dailyDone(t) && !t.claimed).length;

// ─── Draw helpers ─────────────────────────────────────────────────────────────
function drawCover(img, destW, destH) {
  const srcAR = img.naturalWidth / img.naturalHeight, destAR = destW / destH;
  let sw = img.naturalWidth, sh = img.naturalHeight;
  if (srcAR > destAR) sw = sh * destAR; else sh = sw / destAR;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, destW, destH);
}

/** Draw image (or canvas) centred at (cx, cy), w wide, keeping aspect ratio */
function drawSprite(img, cx, cy, w) {
  const iw = img && (img.naturalWidth || img.width), ih = img && (img.naturalHeight || img.height);
  if (!iw) return;
  const h = w * (ih / iw);
  ctx.drawImage(img, Math.round(cx - w / 2), Math.round(cy - h / 2), Math.round(w), Math.round(h));
}

/** Outlined text in BRAND colours */
function drawText(text, x, y, px, color = BRAND.main, align = 'center', maxW) {
  ctx.font = font(px);
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, px / 7);
  ctx.strokeStyle = BRAND.outline;
  ctx.strokeText(text, x, y, maxW);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y, maxW);
}

function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

function panel(x, y, w, h, border = BRAND.accent, glow = 0) {
  ctx.save();
  if (glow) { ctx.shadowColor = border; ctx.shadowBlur = glow; }
  rrect(x, y, w, h, 14);
  ctx.fillStyle = BRAND.panel; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = border; ctx.stroke();
  ctx.restore();
}

// Immediate-mode buttons: drawn and registered every frame, cleared at the start of render()
let buttons = [];
const hit = (cx, cy, w, h, fn) => buttons.push({ x: cx - w / 2, y: cy - h / 2, w, h, fn });

function uiButton(label, cx, cy, w, h, fn, { fill = BRAND.accent, color = BRAND.dark, px = 18, off = false } = {}) {
  ctx.save();
  ctx.globalAlpha = off ? 0.5 : 1;
  rrect(cx - w / 2, cy - h / 2, w, h, h / 3);
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = BRAND.dark; ctx.stroke();
  ctx.font = font(px); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(label, cx, cy + 1, w - 12);
  ctx.restore();
  hit(cx, cy, w, h, fn);
}

function drawBadgeTitle(text, y, w) {
  drawSprite(IMAGES.logo, CX, y, w);
  let px = 56;
  ctx.font = font(px);
  while (ctx.measureText(text).width > w * 0.6 && px > 12) ctx.font = font(--px);   // shrink to fit the badge
  drawText(text, CX, y, px);
}

function drawWallet(y) {
  panel(CX - 120, y - 18, 240, 36);
  drawText(`🪙 ${profile.coins}    💎 ${profile.diamonds}`, CX, y, 20);
}

function dimBg() { ctx.fillStyle = 'rgba(0,20,50,0.55)'; ctx.fillRect(0, 0, W, H); }

// ─── Avatars ──────────────────────────────────────────────────────────────────
const perk = () => (STORE.avatars.find(a => a.id === profile.skin) || {}).perk || {};
const tintCache = {};
function skinImage(id) {
  const base = IMAGES[PLAYER.image], f = (STORE.avatars.find(a => a.id === id) || {}).filter;
  if (!f || f === 'none') return base;
  if (!tintCache[id]) {   // tint once into an offscreen canvas (needs canvas filter support)
    const c = document.createElement('canvas');
    c.width = base.naturalWidth; c.height = base.naturalHeight;
    const x = c.getContext('2d'); x.filter = f; x.drawImage(base, 0, 0);
    tintCache[id] = c;
  }
  return tintCache[id];
}

/** Basket with skin + accessory. Used in-game, in the store, on the menu and in the unlock popup. */
function drawBasket(cx, cy, w, skin, acc, squash = false) {
  const img = IMAGES[PLAYER.image], h = w * img.naturalHeight / img.naturalWidth, bottom = cy + h / 2;
  ctx.save();
  if (squash) { ctx.translate(cx, bottom); ctx.scale(1.15, 0.85); ctx.translate(-cx, -bottom); }
  drawSprite(skinImage(skin), cx, cy, w);
  const a = STORE.accessories.find(x => x.id === acc);
  if (a) {
    ctx.font = `${Math.round(w * 0.4)}px ${BRAND.font}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(a.emoji, cx, cy - h / 2 + w * 0.03);
  }
  ctx.restore();
}

// ─── Audio (Web Audio, created after first user gesture) ─────────────────────
let audioCtx = null, muted = false;
function initAudio() {
  if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
function tone(freq, delay, dur, type = 'sine', vol = 0.15, freqEnd = freq) {
  if (!audioCtx || muted || profile.volume <= 0) return;
  const t = audioCtx.currentTime + delay;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  g.gain.setValueAtTime(vol * profile.volume, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(audioCtx.destination);
  o.start(t); o.stop(t + dur);
}
const SFX = {
  catch:  () => tone(1100, 0, 0.1, 'triangle'),
  bomb:   () => tone(140, 0, 0.3, 'sawtooth', 0.25, 40),
  power:  () => { tone(660, 0, 0.12, 'square', 0.1); tone(990, 0.12, 0.18, 'square', 0.1); },
  over:   () => [440, 349, 262].forEach((f, i) => tone(f, i * 0.25, 0.25, 'triangle', 0.18)),
  unlock: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.3, 'triangle', 0.2)),
};
/** Phone vibration; vibration setting (0..1) scales the length. Not supported on iOS Safari. */
function buzz() { if (profile.vibration > 0 && navigator.vibrate) navigator.vibrate(Math.round(60 + profile.vibration * 340)); }

// ─── Game state ───────────────────────────────────────────────────────────────
let state = 'start';   // start | playing | paused | over | store | settings | daily | tutorial
let pausedFrom = 'playing';
let score = 0, newBest = false, overReason = '', lastEarned = 0;
let maxLives = RULES.lives, lives = maxLives, timeLeft = RULES.roundSeconds;
let fallingItems = [], deco = [], effects = {}, fx = [], floats = [];
let spawnTimer = 0, decoTimer = 0, flashTimer = 0, shakeTimer = 0, squashTimer = 0, overTime = 0;
let storeTab = 'avatars', unlock = null, toastText = '', toastT = 0, tut = null;

const basket = {
  x: CX,
  get w() { return PLAYER.width * (perk().width || 1); },
  get h() { const i = IMAGES[PLAYER.image]; return this.w * i.naturalHeight / i.naturalWidth; },
  get y() { return H - PLAYER.bottomGap - this.h / 2; },
};

const SPK = { x: W - 44, y: H - 44, s: 34 };

const hasEffect = name => Object.values(effects).some(p => p.def.effect === name);
const progress  = () => 1 - timeLeft / RULES.roundSeconds;   // 0 -> 1 over the round
const lerp = (a, b, t) => a + (b - a) * t;
const inRect = (px, py, r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
const toast = s => { toastText = s; toastT = 2.2; };

// Adaptive difficulty (KBFC, see dda.js): d in [0,1] drives spawn rate, fall speed, bomb and power-up odds.
const dda = KBFC.create({
  easy: { spawn: RULES.spawnStart * 1.2, fall: 0.75, bomb: 0.5, power: 1.5 },
  hard: { spawn: RULES.spawnEnd * 0.9, fall: RULES.speedBoostEnd * 1.05, bomb: 1.5, power: 0.7 },
});
let debugDDA = false;   // F2 toggles a small overlay with the engine's state

function pickItemDef() {
  const P = dda.params();
  const w = it => it.weight * (it.type === 'bad' ? P.bombMult : it.type === 'power' ? P.powerMult : 1);
  let r = Math.random() * CONFIG.ITEMS.reduce((s, it) => s + w(it), 0);
  for (const it of CONFIG.ITEMS) { r -= w(it); if (r <= 0) return it; }
  return CONFIG.ITEMS[CONFIG.ITEMS.length - 1];
}

function makeItem(def, speed) {
  return { def, x: def.width / 2 + Math.random() * (W - def.width), y: -def.width / 2,
           speed, angle: 0, wobbleOffset: 0 };
}

function spawnItem() {
  const speed = (RULES.fallSpeedMin + Math.random() * (RULES.fallSpeedMax - RULES.fallSpeedMin)) * dda.params().fallMult;
  const item = makeItem(pickItemDef(), speed);
  if (item.def.type === 'good') {   // rate how hard this star is to catch: chained to the previous pending star, else to the basket
    const arrive = it => (basket.y - it.y) / it.speed;
    const t = arrive(item);
    let ref = { x: basket.x, t: 0 };
    for (const o of fallingItems) {
      const to = arrive(o);
      if (o.def.type === 'good' && to < t && to > ref.t) ref = { x: o.x, t: to };
    }
    item.b = KBFC.difficulty({ x: item.x, t, refX: ref.x, refT: ref.t, speed: PLAYER.speed * (perk().speed || 1),
                               reach: (item.def.width + basket.w) * RULES.hitboxShrink / 2 });
  }
  fallingItems.push(item);
}

let rs = { stars: 0, bombs: 0, power: 0 };   // per-round counters, sent to the dashboard backend
function resetRound() {
  rs = { stars: 0, bombs: 0, power: 0 };
  maxLives = RULES.lives + (perk().life || 0);
  score = 0; lives = maxLives; timeLeft = RULES.roundSeconds;
  flashTimer = shakeTimer = spawnTimer = squashTimer = 0;
  fallingItems = []; deco = []; effects = {}; fx = []; floats = [];
  dda.newRound();
  basket.x = CX;
  pointerTargetX = null;
}

function restart() { resetRound(); state = 'playing'; }
function startGame() { profile.tutorialDone ? restart() : startTutorial(); }
function toMenu() { state = 'start'; deco = []; }

function endGame(reason) {
  state = 'over';
  overReason = reason;
  overTime = 0;
  shakeTimer = flashTimer = 0;
  pointerActive = false;
  SFX.over();
  dailyAdd('score', score); dailyAdd('rounds', 1);
  if (rs.bombs === 0) dailyAdd('clean', 1);
  lastEarned = Math.floor(score * ECONOMY.coinsPerScore * (perk().coins || 1));
  profile.coins += lastEarned;
  if (account.token) api('/api/round', 'POST', { score, stars: rs.stars, bombs: rs.bombs, powerups: rs.power,
    duration: RULES.roundSeconds - timeLeft, coins: lastEarned, skin: profile.skin }).catch(() => {});
  newBest = score > profile.best;
  if (newBest) profile.best = score;
  saveProfile();
  dda.save();
}

function setPaused(on) {
  if (on && (state === 'playing' || state === 'tutorial')) {
    pausedFrom = state; state = 'paused'; pointerActive = false; keys.left = keys.right = false;
  } else if (!on && state === 'paused') state = pausedFrom;
}

// ─── Avatar Forge (embedded builder in an iframe; talks via postMessage) ──────
let avatarImg = null, avatarFrame = null;
function setAvatarSvg(svg) {
  const i = new Image();
  i.onload = () => { avatarImg = i; };
  i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
try { const saved = localStorage.getItem('bdAvatarSvg'); if (saved) setAvatarSvg(saved); } catch (e) {}
function openAvatar() {
  if (!avatarFrame) {
    avatarFrame = document.createElement('iframe');
    avatarFrame.src = 'avatar/';
    avatarFrame.title = 'Avatar Forge';
    avatarFrame.style.cssText = 'position:fixed;border:0;z-index:20;background:#14121f';
    document.body.appendChild(avatarFrame);
  }
  avatarFrame.style.display = 'block';
  placeAvatar();
  state = 'avatar';
}
/** Sit exactly over the game canvas, like the Store and Settings screens. */
function placeAvatar() {
  if (!avatarFrame) return;
  const r = canvas.getBoundingClientRect();
  Object.assign(avatarFrame.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
}
window.addEventListener('resize', placeAvatar);
function closeAvatar() {
  if (avatarFrame) avatarFrame.style.display = 'none';
  state = 'start';
}
window.addEventListener('message', e => {
  if (e.origin !== location.origin || !avatarFrame || e.source !== avatarFrame.contentWindow) return;
  const m = e.data || {};
  if (m.type === 'exit') closeAvatar();
  else if (m.type === 'avatar' && typeof m.svg === 'string' && m.svg.length < 100000) {
    setAvatarSvg(m.svg);
    try { localStorage.setItem('bdAvatarSvg', m.svg); } catch (err) {}
  }
});

// ─── Store actions ────────────────────────────────────────────────────────────
const ownedList = kind => kind === 'avatars' ? profile.owned : profile.ownedAcc;

function equip(kind, id) {
  if (kind === 'avatars') profile.skin = id; else profile.acc = id;
  saveProfile();
}

function buy(kind, it) {
  if (profile.diamonds < it.price) {
    toast(`Need ${it.price - profile.diamonds} more 💎. Convert coins in Exchange`);
    return;
  }
  profile.diamonds -= it.price;
  if (account.token) api('/api/purchase', 'POST', { kind, item: it.id, diamonds: it.price }).catch(() => {});
  ownedList(kind).push(it.id);
  equip(kind, it.id);
  unlock = { kind, it, t: 0 };
  SFX.unlock();
  saveProfile();
}

function convert(n) {
  const cost = n * ECONOMY.coinsPerDiamond;
  if (n < 1 || profile.coins < cost) { toast('Not enough coins'); return; }
  profile.coins -= cost; profile.diamonds += n;
  if (account.token) api('/api/purchase', 'POST', { kind: 'exchange', item: 'diamond', diamonds: 0, coins: cost }).catch(() => {});
  SFX.power(); saveProfile();
  toast(`+${n} 💎`);
}

// ─── Tutorial (a failed step rewinds to that step's start) ───────────────────
function startTutorial() {
  resetRound();
  state = 'tutorial';
  tut = { step: 0, moved: 0, wait: 0.6, msg: '', rewind: 0 };
}

function finishTutorial() {
  profile.tutorialDone = true; saveProfile();
  restart();
}

function tutOk() {
  tut.step++; tut.moved = 0; tut.wait = 1.2;
  tut.msg = tut.step >= TUT.length ? "You're ready! Good luck!" : 'Nice!';
  SFX.power();
}

function tutFail(why) {
  tut.wait = 1.4; tut.rewind = 0.8;
  tut.msg = `⏪ ${why} Rewinding...`;
  fallingItems = []; basket.x = CX;   // back to the checkpoint
  SFX.bomb();
}

function updateTutorial(dt) {
  tut.rewind = Math.max(0, tut.rewind - dt);
  tickEffects(dt);
  const prevX = basket.x;
  moveBasket(dt);
  if (tut.wait > 0) {
    tut.wait -= dt;
    if (tut.wait <= 0 && tut.step >= TUT.length) { finishTutorial(); return; }
  }
  if (tut.step >= TUT.length) return;
  const s = TUT[tut.step];
  if (s.goal === 'move') {
    if (tut.wait <= 0 && (tut.moved += Math.abs(basket.x - prevX)) >= 150) tutOk();
  } else if (tut.wait <= 0 && !fallingItems.length) {
    const it = makeItem(CONFIG.ITEMS.find(i => i.name === s.item), 160);
    if (s.goal === 'dodge') it.x = Math.max(it.def.width / 2, Math.min(W - it.def.width / 2, basket.x + (Math.random() - 0.5) * 40));
    fallingItems.push(it);
  }
  stepItems(dt, 1,
    () => { if (s.goal === 'catch') { fx.push({ img: IMAGES.sparkle, x: basket.x, y: basket.y, t: 0, dur: 0.35, from: 40, to: 90 }); tutOk(); }
            else tutFail('You hit the bomb.'); },
    () => { if (s.goal === 'dodge') tutOk(); else tutFail('You missed it.'); });
}

// ─── Input ────────────────────────────────────────────────────────────────────
const keys = { left: false, right: false };
const isLeft  = k => k === 'ArrowLeft'  || k === 'a' || k === 'A';
const isRight = k => k === 'ArrowRight' || k === 'd' || k === 'D';
const isGo    = k => k === ' ' || k === 'Enter';

window.addEventListener('keydown', e => {
  initAudio();
  const k = e.key;
  if (unlock) { if (unlock.t > 0.6 && (isGo(k) || k === 'Escape')) unlock = null; return; }
  if (k === 'm' || k === 'M') muted = !muted;
  if (k === 'F2') debugDDA = !debugDDA;
  if (k === 'p' || k === 'P') { setPaused(state === 'playing' || state === 'tutorial'); return; }
  if (k === 'Escape' && (state === 'store' || state === 'settings' || state === 'daily')) { state = 'start'; return; }
  if (isGo(k)) e.preventDefault();
  if (state === 'start' && isGo(k)) { startGame(); return; }
  if (state === 'over' && (isGo(k) || k === 'r' || k === 'R')) { restart(); return; }
  if (isLeft(k))  keys.left  = true;
  if (isRight(k)) keys.right = true;
});
window.addEventListener('keyup', e => {
  if (isLeft(e.key))  keys.left  = false;
  if (isRight(e.key)) keys.right = false;
});
window.addEventListener('blur', () => setPaused(true));
document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });

let pointerActive = false;
let pointerTargetX = null;

function toLogical(e) {
  const r = canvas.getBoundingClientRect(), k = W / r.width;
  return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
}

canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  initAudio();
  if (unlock) { if (unlock.t > 0.6) unlock = null; return; }
  const p = toLogical(e);
  for (let i = buttons.length - 1; i >= 0; i--) {
    if (inRect(p.x, p.y, buttons[i])) { buttons[i].fn(); return; }
  }
  if (state === 'paused') { setPaused(false); return; }
  if (state === 'playing' || state === 'tutorial') { pointerActive = true; pointerTargetX = p.x; }
});
canvas.addEventListener('pointermove', e => {
  if (!pointerActive) return;
  e.preventDefault();
  pointerTargetX = toLogical(e).x;
});
canvas.addEventListener('pointerup',     () => { pointerActive = false; });
canvas.addEventListener('pointercancel', () => { pointerActive = false; });

// ─── Update ───────────────────────────────────────────────────────────────────
function moveBasket(dt) {
  const sp = perk().speed || 1;
  if (keys.left)  basket.x -= PLAYER.speed * sp * dt;
  if (keys.right) basket.x += PLAYER.speed * sp * dt;
  if (pointerActive && pointerTargetX !== null) {
    basket.x += (pointerTargetX - basket.x) * Math.min(PLAYER.glide * sp * dt, 1);
  }
  const half = basket.w / 2;
  basket.x = Math.max(half, Math.min(W - half, basket.x));
}

function tickEffects(dt) {
  shakeTimer  = Math.max(0, shakeTimer - dt);
  squashTimer = Math.max(0, squashTimer - dt);
  flashTimer  = Math.max(0, flashTimer - dt);
  for (const k in effects) if ((effects[k].timer -= dt) <= 0) delete effects[k];
  fx     = fx.filter(f => (f.t += dt) < f.dur);
  floats = floats.filter(f => (f.t += dt) < 0.7);
}

/** Move items, then call onHit(item) when caught or onMiss(item) when they fall off the bottom */
function stepItems(dt, speedMult, onHit, onMiss) {
  const bHalfX = basket.w * RULES.hitboxShrink / 2;
  const bHalfY = basket.h * RULES.hitboxShrink / 2;
  fallingItems = fallingItems.filter(item => {
    item.y += item.speed * speedMult * dt;
    animate(item, dt);
    const img = IMAGES[item.def.name];
    const iH  = item.def.width * img.naturalHeight / img.naturalWidth;
    if (item.y - iH / 2 > H) { onMiss(item); return false; }
    const hitIt = Math.abs(item.x - basket.x) < item.def.width * RULES.hitboxShrink / 2 + bHalfX &&
                  Math.abs(item.y - basket.y) < iH * RULES.hitboxShrink / 2 + bHalfY;
    if (!hitIt) return true;
    squashTimer = 0.1;
    onHit(item);
    return false;
  });
}

function onCatch(item) {
  const { type, effect } = item.def;
  if (type === 'good') {
    const pts = item.def.points * (hasEffect('double') ? POWERUPS.double.factor : 1);
    score += pts; rs.stars++; dailyAdd('stars', 1);
    if (item.b !== undefined) dda.observe('catch', item.b);
    fx.push({ img: IMAGES.sparkle, x: item.x, y: item.y, t: 0, dur: 0.35, from: 40, to: 90 });
    floats.push({ x: item.x, y: item.y, text: '+' + pts, t: 0 });
    SFX.catch();
  } else if (type === 'power') {
    rs.power++; dailyAdd('power', 1);
    effects[item.def.name] = { def: item.def, timer: POWERUPS[effect].duration };
    SFX.power();
  } else {
    fx.push({ img: IMAGES.explosion, x: item.x, y: item.y, t: 0, dur: 0.4, from: 60, to: 120 });
    rs.bombs++;
    SFX.bomb(); buzz();
    dda.observe('bomb');
    flashTimer = RULES.flashDuration;
    shakeTimer = RULES.shakeDuration;
    if (--lives <= 0) endGame('Out of lives!');
  }
}

function update(dt) {
  if (unlock) unlock.t += dt;
  if (toastT > 0) toastT -= dt;
  if (state === 'over') { overTime += dt; return; }
  if (state === 'tutorial') { updateTutorial(dt); return; }
  if (state !== 'playing') { if (state !== 'paused') updateDeco(dt); return; }

  timeLeft = Math.max(0, timeLeft - dt);
  if (timeLeft === 0) endGame("Time's up!");
  tickEffects(dt);
  moveBasket(dt);

  dda.tick(dt, progress(), lives);
  spawnTimer += dt;
  const interval = dda.params().spawnInterval;
  if (spawnTimer >= interval) { spawnTimer -= interval; spawnItem(); }

  stepItems(dt, hasEffect('slow') ? POWERUPS.slow.factor : 1, onCatch,
            item => { if (item.b !== undefined) dda.observe('miss', item.b); });
}

function animate(item, dt) {
  if (item.def.type === 'good') {
    item.angle += dt * 1.8;                          // slow spin
  } else {
    item.angle += dt * 4;                            // wobble phase
    item.wobbleOffset = Math.sin(item.angle) * 6;
  }
}

/** Menu / store / settings decoration: a few stars and bombs drifting down, no scoring */
function updateDeco(dt) {
  decoTimer += dt;
  if (decoTimer > 0.7) {
    decoTimer = 0;
    const name = Math.random() < 0.7 ? 'star' : 'bomb';
    deco.push(makeItem(CONFIG.ITEMS.find(i => i.name === name), 70 + Math.random() * 50));
  }
  deco = deco.filter(d => { d.y += d.speed * dt; animate(d, dt); return d.y < H + 40; });
}

// ─── Render ───────────────────────────────────────────────────────────────────
function drawItems(list) {
  for (const item of list) {
    const img = IMAGES[item.def.name];
    const w = item.def.width, h = w * img.naturalHeight / img.naturalWidth;
    ctx.save();
    ctx.translate(Math.round(item.x + item.wobbleOffset), Math.round(item.y));
    if (item.def.type === 'good') ctx.rotate(item.angle);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}

function render() {
  const t = performance.now() / 1000;
  buttons = [];
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (shakeTimer > 0) {
    const a = 24 * profile.vibration;   // shake strength follows the vibration setting
    ctx.translate((Math.random() - 0.5) * a, (Math.random() - 0.5) * a);
  }
  drawScene();

  const scene = state === 'paused' ? pausedFrom : state;
  if (scene === 'start')         drawStart(t);
  else if (scene === 'store')    { drawItems(deco); drawStore(t); }
  else if (scene === 'settings') { drawItems(deco); drawSettings(); }
  else if (scene === 'daily')    { drawItems(deco); drawDaily(); }
  else if (scene === 'avatar')   drawItems(deco);   // the iframe covers the canvas
  else { drawGame(); if (scene === 'tutorial') drawTutorial(); }
  ctx.restore();

  if (state === 'paused') buttons = [];   // paused: only the speaker + "tap to continue"
  drawText(muted ? '🔇' : '🔊', SPK.x + SPK.s / 2, SPK.y + SPK.s / 2, 28);
  hit(SPK.x + SPK.s / 2, SPK.y + SPK.s / 2, SPK.s, SPK.s, () => { muted = !muted; });

  if (state === 'over')   drawGameOver(t);
  if (state === 'paused') drawPaused();
  if (unlock)             drawUnlock();
  if (toastT > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, toastT * 2);
    panel(CX - 190, 700, 380, 44, BRAND.accent);
    drawText(toastText, CX, 722, 16, BRAND.main, 'center', 360);
    ctx.restore();
  }

  // Google's own sign-in button is a DOM element; park it over the canvas only on the settings page
  const showG = state === 'settings' && gReady && !account.token && !unlock;
  if (showG) {
    const r = canvas.getBoundingClientRect(), s = r.width / W;
    gbtn.style.left = r.left + (CX - 120) * s + 'px';
    gbtn.style.top  = r.top + 205 * s + 'px';
    gbtn.style.transform = `scale(${s})`;
    gbtn.style.transformOrigin = 'top left';
  } else gbtn.style.left = '-9999px';
}

// Crossfading scenic background; wall-clock driven so menus and rounds share one cycle.
function drawScene() {
  const { keys, seconds, fade } = CONFIG.SCENES, e = performance.now() / 1000;
  const i = Math.floor(e / seconds) % keys.length, into = e % seconds;
  drawCover(IMAGES[keys[i]], W, H);
  if (into > seconds - fade) {
    ctx.globalAlpha = (into - (seconds - fade)) / fade;
    drawCover(IMAGES[keys[(i + 1) % keys.length]], W, H);
    ctx.globalAlpha = 1;
  }
}

function drawDaily() {
  dimBg();
  drawBadgeTitle('DAILY', 70, 300);
  drawWallet(135);
  drawText('New tasks every day', CX, 180, 16, BRAND.accent);
  ensureDaily().tasks.forEach((t, i) => {
    const def = dailyDef(t), y = 215 + i * 150, done = dailyDone(t);
    panel(30, y, W - 60, 130, t.claimed ? BRAND.panel : BRAND.accent);
    drawText((t.claimed ? '✓ ' : '') + def.text, 50, y + 30, 18, t.claimed ? '#8aa' : BRAND.main, 'left', W - 100);
    const bw = W - 100, p = Math.min(1, t.progress / def.target);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; rrect(50, y + 52, bw, 14, 7); ctx.fill();
    ctx.fillStyle = t.claimed ? '#6a8' : BRAND.accent; rrect(50, y + 52, Math.max(14 * (p > 0), bw * p), 14, 7); ctx.fill();
    drawText(`${t.progress}/${def.target}`, 50, y + 86, 14, BRAND.main, 'left');
    uiButton(t.claimed ? 'Done' : done ? `Claim +${def.reward} 🪙` : `${def.reward} 🪙`, W - 120, y + 100, 150, 36,
             () => claimDaily(t), { off: !done || t.claimed, px: 15 });
  });
  uiButton('Back', CX, 770, 140, 40, () => { state = 'start'; });
}

function drawStart(t) {
  drawItems(deco);
  drawWallet(30);

  drawBadgeTitle(BRAND.title, 170, 340);
  drawText(BRAND.tagline, CX, 255, 20, BRAND.main, 'center', W - 40);

  const s = 1.04 + 0.04 * Math.sin(t * 2.5);   // pulse 1.0 -> 1.08
  ctx.save();
  ctx.translate(CX, 400);
  ctx.scale(s, s);
  drawSprite(IMAGES.play, 0, 0, 120);
  ctx.restore();
  hit(CX, 400, 130, 130, startGame);

  uiButton('🛍 Store',    CX - 85, 520, 150, 48, () => { state = 'store'; });
  uiButton('⚙ Settings', CX + 85, 520, 150, 48, () => { state = 'settings'; }, { fill: BRAND.panel, color: BRAND.main });

  uiButton(`🎯 Daily${dailyClaimable() ? ' ●' : ''}`, CX - 85, 580, 150, 44, () => { state = 'daily'; });
  uiButton('🧑 Avatar', CX + 85, 580, 150, 44, openAvatar);
  if (avatarImg) {   // current avatar portrait, top-left
    ctx.save();
    ctx.beginPath(); ctx.arc(52, 46, 34, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(avatarImg, 18, 12, 68, 68 * 1.1);
    ctx.restore();
    ctx.beginPath(); ctx.arc(52, 46, 34, 0, Math.PI * 2);
    ctx.lineWidth = 3; ctx.strokeStyle = BRAND.accent; ctx.stroke();
    hit(52, 46, 68, 68, openAvatar);
  }
  drawBasket(CX, 640 + 4 * Math.sin(t * 2), 110, profile.skin, profile.acc);   // your current look

  drawText('Move: arrows / drag. Catch stars. Dodge bombs.', CX, 700, 16, BRAND.main, 'center', W - 40);
  drawText('Press Space or Enter to start', CX, 728, 14, BRAND.accent, 'center', W - 40);
}

function drawGame() {
  drawItems(fallingItems);
  drawBasket(basket.x, basket.y, basket.w, profile.skin, profile.acc, squashTimer > 0);

  // Bursts + floating text
  for (const f of fx) {
    ctx.globalAlpha = 1 - f.t / f.dur;
    drawSprite(f.img, f.x, f.y, lerp(f.from, f.to, f.t / f.dur));
  }
  for (const f of floats) {
    const k = f.t / 0.7;
    ctx.globalAlpha = 1 - k;
    drawText(f.text, f.x, f.y - 40 * k, 24, BRAND.accent);
  }
  ctx.globalAlpha = 1;

  // Red flash
  if (flashTimer > 0) {
    ctx.save();
    ctx.globalAlpha = flashTimer / RULES.flashDuration * 0.45;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  drawText(`Score: ${score}`, 16, 30, 28, BRAND.main, 'left');
  if (state === 'playing' || state === 'tutorial') uiButton('⏸', W - 40, 82, 44, 36, () => setPaused(true), { px: 20 });
  if (debugDDA) {
    const s = dda.state();
    drawText(`d ${s.d.toFixed(2)}  skill ${s.mu.toFixed(2)}±${s.sd.toFixed(2)}  catch ${s.pObs.toFixed(2)}/${s.target.toFixed(2)}`,
             16, 110, 14, BRAND.accent, 'left');
  }

  // Active power-ups under the score
  let px = 16;
  for (const p of Object.values(effects)) {
    drawSprite(IMAGES[p.def.name], px + 14, 66, 28);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(px, 84, 28, 5);
    ctx.fillStyle = BRAND.accent;      ctx.fillRect(px, 84, 28 * p.timer / POWERUPS[p.def.effect].duration, 5);
    px += 34;
  }

  // Lives (top-right)
  for (let i = 0; i < maxLives; i++) {
    const img = i < lives ? IMAGES.heart : IMAGES.heartEmpty;
    const x = W - 16 - (maxLives - i) * 34 - (maxLives - 1 - i) * 4;
    ctx.drawImage(img, x, 16, 34, 34 * img.naturalHeight / img.naturalWidth);
  }

  // Timer (top centre)
  const secs = Math.ceil(timeLeft), low = secs <= 10 && state === 'playing';
  const cw = 30, ch = cw * IMAGES.clock.naturalHeight / IMAGES.clock.naturalWidth;
  ctx.font = font(28);
  const tw = ctx.measureText(secs).width, tx = CX - (cw + 6 + tw) / 2;
  ctx.drawImage(IMAGES.clock, tx, 16, cw, ch);
  ctx.save();
  ctx.translate(tx + cw + 6 + tw / 2, 16 + ch / 2);
  if (low) { const s = 1 + 0.2 * Math.sin(performance.now() / 100); ctx.scale(s, s); }
  drawText(String(secs), 0, 0, 28, low ? BRAND.danger : BRAND.main);
  ctx.restore();
}

function drawTutorial() {
  const s = TUT[Math.min(tut.step, TUT.length - 1)];
  // Pulsing ring around the thing to look at
  for (const it of fallingItems) {
    ctx.strokeStyle = s.goal === 'dodge' ? BRAND.danger : BRAND.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(it.x + it.wobbleOffset, it.y, it.def.width * 0.7 + 4 * Math.sin(performance.now() / 120), 0, Math.PI * 2);
    ctx.stroke();
  }
  panel(25, 90, 400, 70);
  drawText(tut.wait > 0 && tut.msg ? tut.msg : s.text, CX, 125, 18, BRAND.main, 'center', 370);
  drawText(`Tutorial ${Math.min(tut.step + 1, TUT.length)}/${TUT.length}`, 70, 180, 13, BRAND.accent);
  uiButton('Skip', W - 60, 180, 90, 30, finishTutorial, { fill: BRAND.panel, color: BRAND.main, px: 14 });

  if (tut.rewind > 0) {   // rewind flash
    ctx.save();
    ctx.globalAlpha = 0.35 * tut.rewind / 0.8;
    ctx.fillStyle = '#7fb5ff';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    drawText('⏪', CX, H / 2, 110);
  }
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, W, H);
  drawText('GAME OVER', CX, 170, 52, BRAND.main, 'center', W - 40);
  drawText(overReason, CX, 220, 24);
  drawSprite(IMAGES.trophy, CX, 300, 90);
  drawText(`Score: ${score}`, CX, 385, 30);
  drawText(`Best: ${profile.best}`, CX, 422, 24);
  if (newBest) drawText('NEW BEST!', CX, 466 - Math.abs(Math.sin(overTime * 6)) * 10, 30, BRAND.accent);
  drawText(`+${lastEarned} 🪙 earned`, CX, 505, 22, BRAND.accent);

  drawSprite(IMAGES.restart, CX, 585, 100);
  hit(CX, 585, 100, 100, restart);
  uiButton('Menu',     CX - 70, 670, 110, 38, toMenu, { fill: BRAND.panel, color: BRAND.main, px: 18 });
  uiButton('🛍 Store', CX + 70, 670, 110, 38, () => { state = 'store'; }, { px: 18 });
}

function drawPaused() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);
  panel(CX - 140, H / 2 - 110, 280, 220, BRAND.accent, 20);
  drawText('Paused', CX, H / 2 - 70, 36);
  uiButton('▶ Resume', CX, H / 2 - 10, 200, 48, () => setPaused(false));
  uiButton('🏠 Exit to Home', CX, H / 2 + 56, 200, 48, toMenu, { fill: BRAND.panel, color: BRAND.main });
}

// ─── Store ────────────────────────────────────────────────────────────────────
function drawStore(t) {
  dimBg();
  drawBadgeTitle('STORE', 70, 300);
  drawWallet(135);
  [['avatars', 'Avatars'], ['accessories', 'Accessories'], ['exchange', 'Exchange']].forEach(([id, label], i) => {
    const on = storeTab === id;
    uiButton(label, CX + (i - 1) * 140, 180, 132, 34, () => { storeTab = id; },
             { fill: on ? BRAND.accent : BRAND.panel, color: on ? BRAND.dark : BRAND.main, px: 15 });
  });
  if (storeTab === 'exchange') drawExchange();
  else STORE[storeTab].forEach((it, i) => drawCard(storeTab, it, i, t));
  uiButton('Back', CX, 770, 140, 40, () => { state = 'start'; });
}

function drawCard(kind, it, i, t) {
  const x = CX + (i % 2 ? 108 : -108), y = 275 + Math.floor(i / 2) * 128;
  const owned = it.price === 0 || ownedList(kind).includes(it.id);
  const equipped = (kind === 'avatars' ? profile.skin : profile.acc) === it.id;
  const can = profile.diamonds >= it.price;
  const border = equipped ? BRAND.good : owned ? BRAND.main : can ? BRAND.accent : BRAND.panel;
  panel(x - 102, y - 59, 204, 118, border, !owned && can ? 8 + 6 * Math.sin(t * 4) : 0);   // affordable items glow

  if (kind === 'avatars') drawBasket(x - 52, y - 4, 76, it.id, null);
  else drawBasket(x - 52, y + 6, 76, profile.skin, it.id);
  if (!owned) drawText('🔒', x - 82, y + 34, 18);

  drawText(it.name, x + 45, y - 36, 14, BRAND.main, 'center', 100);
  drawText(it.desc || 'Fits every avatar', x + 45, y - 16, 11, BRAND.main, 'center', 100);

  const act = () => {};
  if (equipped && kind === 'avatars') uiButton('EQUIPPED', x + 45, y + 28, 96, 32, act, { fill: BRAND.good, px: 13 });
  else if (equipped) uiButton('Remove', x + 45, y + 28, 96, 32, () => equip(kind, null), { fill: BRAND.good, px: 14 });
  else if (owned) uiButton('Equip', x + 45, y + 28, 96, 32, () => equip(kind, it.id), { fill: BRAND.main, px: 15 });
  else uiButton(`💎 ${it.price}`, x + 45, y + 28, 96, 32, () => buy(kind, it), { off: !can, px: 16 });

  if (it.tag) {   // ribbon
    ctx.save();
    ctx.globalAlpha = 0.8 + 0.2 * Math.sin(t * 5);
    rrect(x - 102, y - 59, 58, 18, 6);
    ctx.fillStyle = BRAND.danger; ctx.fill();
    ctx.restore();
    drawText(it.tag, x - 73, y - 50, 11, BRAND.main);
  }
}

function drawExchange() {
  panel(35, 215, 380, 100);
  drawText('Turn coins into diamonds', CX, 245, 20);
  drawText(`${ECONOMY.coinsPerDiamond} 🪙 = 1 💎`, CX, 285, 26, BRAND.accent);
  const rate = ECONOMY.coinsPerDiamond, maxN = Math.floor(profile.coins / rate);
  [[1, '1'], [5, '5'], [10, '10'], [maxN, 'All']].forEach(([n, label], i) => {
    const y = 375 + i * 82, ok = n >= 1 && profile.coins >= n * rate;
    panel(35, y - 33, 380, 66, ok ? BRAND.accent : BRAND.panel);
    drawText(label === 'All' ? `All coins (${n} 💎)` : `${n} 💎`, 60, y - 8, 20, BRAND.main, 'left');
    drawText(`${n * rate} 🪙`, 60, y + 16, 15, BRAND.accent, 'left');
    uiButton('Convert', 335, y, 120, 40, () => convert(n), { off: !ok });
  });
}

function drawUnlock() {
  const t = unlock.t, s = Math.min(t / 0.7, 1);
  const pop = 1 + 2.70158 * Math.pow(s - 1, 3) + 1.70158 * Math.pow(s - 1, 2);   // overshoot bounce
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(0, 0, W, H);

  ctx.save();   // spinning light rays
  ctx.translate(CX, 360);
  ctx.rotate(t * 0.5);
  ctx.globalAlpha = 0.3 * Math.min(t * 2, 1);
  ctx.fillStyle = BRAND.accent;
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-45, -420); ctx.lineTo(45, -420); ctx.fill();
  }
  ctx.restore();

  for (let i = 0; i < 6; i++) {   // orbiting sparkles
    const a = i * Math.PI / 3 + t, r = 150 + 20 * Math.sin(t * 5 + i);
    ctx.globalAlpha = Math.min(t * 2, 1);
    drawSprite(IMAGES.sparkle, CX + Math.cos(a) * r, 360 + Math.sin(a) * r * 0.8, 70);
  }
  ctx.globalAlpha = 1;

  const isAv = unlock.kind === 'avatars';
  drawBasket(CX, 360, 230 * pop, isAv ? unlock.it.id : profile.skin, isAv ? profile.acc : unlock.it.id);

  drawText('YOU UNLOCKED', CX, 120, 28, BRAND.accent);
  drawText(`'${unlock.it.name}'`, CX, 175, 44, BRAND.main, 'center', W - 40);
  drawText(unlock.it.desc || 'Works on every avatar', CX, 540, 20, BRAND.main, 'center', W - 40);
  if (isAv) drawText('Equipped!', CX, 575, 18, BRAND.good);
  if (t > 0.8 && Math.sin(t * 5) > -0.3) drawText('Tap to continue', CX, 700, 18, BRAND.main);
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function stepRow(label, key, y, after) {
  const change = d => () => {
    profile[key] = Math.min(1, Math.max(0, Math.round((profile[key] + d) * 10) / 10));
    saveProfile(); after();
  };
  drawText(label, 40, y, 20, BRAND.main, 'left');
  uiButton('−', 290, y, 44, 36, change(-0.1), { px: 24 });
  drawText(Math.round(profile[key] * 100) + '%', 345, y, 20);
  uiButton('+', 400, y, 44, 36, change(0.1), { px: 24 });
}

function drawSettings() {
  dimBg();
  drawBadgeTitle('SETTINGS', 70, 300);
  panel(20, 135, 410, 600);

  drawText(account.token ? `Signed in: ${account.email}` : 'Playing as guest', CX, 175, 16, BRAND.main, 'center', W - 60);
  if (account.token) uiButton('Log out', CX, 227, 200, 40, logout);
  else if (!gReady) drawText(gError || 'Loading sign-in...', CX, 227, 13, BRAND.danger, 'center', W - 60);
  // (when ready, Google's button sits at y=205..249; see render())
  if (!account.token && gReady) drawText('Sign in to save progress online', CX, 262, 12, BRAND.main);

  stepRow('Volume',    'volume',    315, SFX.catch);
  stepRow('Vibration', 'vibration', 375, buzz);
  drawText('Vibration also sets the screen-shake strength', CX, 408, 12, BRAND.main, 'center', W - 60);

  uiButton('Replay tutorial', CX, 460, 240, 44, () => { startTutorial(); });
  if (account.token) uiButton('Delete account', CX, 530, 240, 44, deleteAccount, { fill: BRAND.danger, color: BRAND.main });
  uiButton('Exit game', CX, 600, 240, 44, exitGame, { fill: BRAND.panel, color: BRAND.main });
  uiButton('Back', CX, 770, 140, 40, () => { state = 'start'; });
}

// ─── Loop + boot ──────────────────────────────────────────────────────────────
let lastTime = null;
function loop(timestamp) {
  if (lastTime === null) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, WORLD.deltaCap);
  lastTime = timestamp;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

function drawMessage(text, color) {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, W, H);
  drawText(text, CX, H / 2, 24, color, 'center', W - 30);
}

drawMessage('Loading...', BRAND.main);
Promise.all(Object.entries(CONFIG.ASSETS).map(([k, src]) => loadImage(k, src)))
  .then(() => {
    requestAnimationFrame(loop);
    initGoogle();
    if (account.token) {   // pull the latest cloud progress
      api('/api/state').then(r => { if (r.state) { Object.assign(profile, r.state); saveProfile(); } }).catch(() => {});
    }
  })
  .catch(err => { console.error('[BombDodger]', err.message); drawMessage('Image load error: ' + err.message, BRAND.danger); });
