// Where the Light Rests — the gallery on the Ili grassland.
// The valley, grass, stream, sky, sounds and the flock are forked from vibe-shepherding (see Credits);
// the gallery itself is in gallery.js. This file wires the two together: renderer, lights, the first-person
// walk, the posters and the bin, and the shared notes.
import * as THREE from 'three';
import {
  SUN_DIR, PALETTE, MAX_SHEEP, FOG_DENSITY, SUN_RADIANCE, SKY_RADIANCE, GROUND_RADIANCE,
  createSharedUniforms, TUNING_DEFAULTS, applyTuning, sunFromAngles,
} from './config.js';
import { createHorizon, createLake, heightAt } from './terrain.js';
import { createSky } from './sky.js';
import { createGrass } from './grass.js';
import { createFlowers } from './flowers.js';
import { Bees } from './bees.js';
import { Soundscape } from './audio.js';
import { World } from './world.js';
import { Flock } from './flock.js';
import { loadLook } from './sheepModels.js';
import { Post } from './post.js';
import { cloudUniforms } from './materials.js';
import { loadTuning } from './tuning.js';
import { initSheepShading } from './sheepShader.js';
import { SITE, toLocal, toWorld, onPlatform, onStairs } from './siteConst.js';
import { buildGallery } from './gallery.js';

const CONFIG = window.GRILL_CONFIG || {};
// Shared-notes backend for the standalone website (Supabase REST). Inside claude.ai the artifact's own database is used.
const BACKEND = { url: CONFIG.supabaseUrl || '', key: CONFIG.supabaseKey || '', table: 'notes', posters: 'posters' };

const isTouch = matchMedia('(pointer: coarse)').matches;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);

// ---------- UI copy ----------
const keys = $('keys'), hint = $('hint');
if (isTouch) {
  keys.innerHTML = '<dt>Left thumb</dt><dd>walk</dd><dt>Right thumb</dt><dd>look around</dd><dt>Tap</dt><dd>a poster to read notes, a board to write a wish or grill him, the bin to complain</dd><dt>Posters</dt><dd>every poster, from anywhere</dd>';
  hint.innerHTML = '<b>Left thumb</b> walks · <b>right thumb</b> looks · <b>tap</b> a poster';
} else {
  keys.innerHTML = '<dt>W A S D</dt><dd>walk</dd><dt>Mouse</dt><dd>look around</dd><dt>E / click</dt><dd>read a poster, write a wish at the board, grill him, or open the bin</dd><dt>P</dt><dd>all the posters, from anywhere</dd><dt>Shift</dt><dd>walk faster</dd><dt>[ ]</dt><dd>move the sun</dd><dt>Esc</dt><dd>free the cursor</dd>';
  hint.innerHTML = '<b>Click</b> the scene to look · <b>WASD</b> walk · <b>E</b> read a poster · <b>P</b> all posters · <b>Esc</b> free cursor';
}

// ---------- renderer, scene, lights ----------
await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
let dpr = Math.min(window.devicePixelRatio || 1, 1.5);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(PALETTE.fog, FOG_DENSITY);
const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.05, 4000);
camera.rotation.order = 'YXZ';

const U = createSharedUniforms();
const tuning = await loadTuning(TUNING_DEFAULTS, { local: false });
applyTuning(U, tuning);
initSheepShading(U, tuning);
U.uSiteH0.value = SITE.H0;

const sun = new THREE.DirectionalLight(PALETTE.sun, SUN_RADIANCE * Math.PI);
sun.castShadow = true;
const SHADOW_HALF = 24;
const SHADOW_RES = isTouch ? 1024 : 2048;
sun.shadow.mapSize.set(SHADOW_RES, SHADOW_RES);
Object.assign(sun.shadow.camera, { left: -SHADOW_HALF, right: SHADOW_HALF, top: SHADOW_HALF, bottom: -SHADOW_HALF, near: 1, far: 260 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
// the three.js lights only light the gallery (the meadow, trees and alpacas have their own shading), so they are
// scaled to taste: the grass tuning's sun would blow out the oak floor
const GALLERY_SUN = 0.42, GALLERY_SKY = 0.5;
const hemi = new THREE.HemisphereLight(PALETTE.sky, 0xcdbfa9, SKY_RADIANCE * Math.PI);
scene.add(hemi);
U.uShadowMatrix.value = sun.shadow.matrix;
U.uShadowTexel.value = 1 / SHADOW_RES;

const lightRight = new THREE.Vector3(), lightUp = new THREE.Vector3(), shadowCenter = new THREE.Vector3();
function followShadow(center) {
  lightRight.crossVectors(new THREE.Vector3(0, 1, 0), SUN_DIR).normalize();
  lightUp.crossVectors(SUN_DIR, lightRight).normalize();
  const texel = (2 * SHADOW_HALF) / SHADOW_RES;
  const x = Math.round(center.dot(lightRight) / texel) * texel;
  const y = Math.round(center.dot(lightUp) / texel) * texel;
  shadowCenter.copy(lightRight).multiplyScalar(x).addScaledVector(lightUp, y).addScaledVector(SUN_DIR, center.dot(SUN_DIR));
  sun.target.position.copy(shadowCenter);
  sun.position.copy(shadowCenter).addScaledVector(SUN_DIR, 130);
}

// ---------- the valley ----------
const sky = createSky(U); scene.add(sky);
const horizon = createHorizon(U); scene.add(horizon);
const lake = createLake(U); scene.add(lake);
const world = new World(scene, U);
const grassNear = createGrass(U, { count: isTouch ? 200000 : 520000, size: 28, fadeOut: [7, 13], width: 0.017, height: 0.2, segs: 2, seed: 11 });
const grassMid = createGrass(U, { count: isTouch ? 110000 : 300000, size: 90, fadeIn: [7, 13], fadeOut: [28, 44], width: 0.036, height: 0.2, segs: 1, seed: 23 });
scene.add(grassNear, grassMid);
const flowers = createFlowers(U, { count: isTouch ? 3000 : 6500, size: 32 });
scene.add(flowers);
const bees = new Bees(scene, U, tuning, isTouch ? 14 : 26);
const sound = new Soundscape(tuning);

// ---------- the gallery ----------
const G = buildGallery({ scene, maxAniso: renderer.capabilities.getMaxAnisotropy(), isTouch });
const { posters, colliders, DOORS, STAIR, BIN, TREES, XG, XW, Z0, Z1 } = G;
{ // the retaining wall around the platform keeps you on it (except down the steps), and off it from below
  const R = SITE.rect, t = 0.3;
  colliders.push({ minX: R.x1, maxX: R.x1 + t, minZ: R.z0 - t, maxZ: R.z1 + t });
  colliders.push({ minX: R.x0 - t, maxX: R.x0, minZ: R.z0 - t, maxZ: STAIR.z1 });   // glass side, in two pieces around the steps
  colliders.push({ minX: R.x0 - t, maxX: R.x0, minZ: STAIR.z0, maxZ: R.z1 + t });
  colliders.push({ minX: R.x0 - t, maxX: R.x1 + t, minZ: R.z0 - t, maxZ: R.z0 });
  colliders.push({ minX: R.x0 - t, maxX: R.x1 + t, minZ: R.z1, maxZ: R.z1 + t });
  colliders.push({ minX: XG - 0.3, maxX: XW + 0.3, minZ: Z0, maxZ: Z0 + 0.25 });   // the corridor's end walls
  colliders.push({ minX: XG - 0.3, maxX: XW + 0.3, minZ: Z1 - 0.25, maxZ: Z1 });
}

// ---------- the flock ----------
// the alpacas keep off the platform (a row of round obstacles stands in for it) and away from the terrace trees,
// and gather on the meadow below the steps. These round obstacles are for the flock only; you walk by the box colliders.
const obstacles = [];
const platformObstacles = [];
for (let z = SITE.rect.z0 - 2; z <= SITE.rect.z1 + 2; z += 9) { const [wx, wz] = toWorld(-3.2, z); platformObstacles.push({ x: wx, z: wz, r: 10.5 }); }
for (const t of TREES) { const [wx, wz] = toWorld(t.x, t.z); platformObstacles.push({ x: wx, z: wz, r: 0.7 }); }
const MEADOW_SPOT = toWorld(-21, 4);
let flock = null;
const herdCtx = { cx: MEADOW_SPOT[0], cz: MEADOW_SPOT[1], fx: 0, fz: 1, cam: camera.position, frustum: new THREE.Frustum() };
(async () => {
  try {
    const look = await loadLook('alpaca', scene);
    flock = new Flock(scene, look, obstacles);
    const n = 10, spread = 1.0 + 0.36 * Math.sqrt(n);
    for (let i = 0; i < n; i++) {
      const s = flock.spawn(herdCtx.cx, herdCtx.cz, 'flock');
      s.x = herdCtx.cx + (s.offX * -herdCtx.fz + s.offY * herdCtx.fx) * spread;
      s.z = herdCtx.cz + (s.offX * herdCtx.fx + s.offY * herdCtx.fz) * spread;
    }
  } catch (e) { console.warn('alpacas could not be loaded', e); }
})();

// ---------- the player (gallery-local coordinates) ----------
const player = { x: -0.35, y: 0, z: 0.6, yaw: 0.2, pitch: -0.04, vx: 0, vz: 0, bob: 0 };
const EYE = 1.62, R = 0.28;
const keysDown = new Set();
let boardOpen = false, hover = null;
const sunInput = $('sun'), sunOut = $('sunOut');

function groundLocal(lx, lz) {
  if (onPlatform(lx, lz) || onStairs(lx, lz)) return G.groundY(lx, lz);
  const [wx, wz] = toWorld(lx, lz);
  return heightAt(wx, wz) - SITE.H0;
}

addEventListener('keydown', (e) => {
  if (boardOpen) { if (e.code === 'Escape') { e.preventDefault(); closeBoard(); } return; }
  if (e.target !== canvas && e.target !== document.body) return;
  sound.start();
  if (e.code === 'KeyE') { if (hover) openBoard(hover); return; }
  if (e.code === 'KeyP') { openList(); return; }
  keysDown.add(e.code);
  if (e.code === 'BracketLeft' || e.code === 'BracketRight') {
    const m = THREE.MathUtils.clamp(clockMins + (e.code === 'BracketRight' ? 20 : -20), 0, 1440);
    sunInput.value = m; setClock(m);
  }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', (e) => keysDown.delete(e.code));
addEventListener('blur', () => keysDown.clear());

function look(dx, dy, k) {
  player.yaw -= dx * k; player.pitch -= dy * k;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -1.35, 1.35);
}

let locked = false, dragging = false, lastX = 0, lastY = 0;
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  document.body.classList.toggle('locked', locked);
  if (!locked) { hint.style.opacity = '1'; hintFaded = false; clearTimeout(hintTimer); } else fadeHint();
});
function tryLock() { try { const p = canvas.requestPointerLock && canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
document.addEventListener('mousemove', (e) => { if (locked) look(e.movementX, e.movementY, 0.0022); });

const joy = $('joy'), joyKnob = joy.firstElementChild;
const touches = new Map();
let joyVec = { x: 0, y: 0 };
let mouseDown = null;
canvas.addEventListener('pointerdown', (e) => {
  canvas.focus(); sound.start();
  if (e.pointerType === 'mouse') {
    if (locked) { if (hover) openBoard(hover); return; }
    mouseDown = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
    dragging = true; lastX = e.clientX; lastY = e.clientY; tryLock();
    return;
  }
  canvas.setPointerCapture(e.pointerId);
  const role = (e.clientX < innerWidth * 0.45 && ![...touches.values()].some((t) => t.role === 'joy')) ? 'joy' : 'look';
  touches.set(e.pointerId, { role, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY, t: performance.now() });
  if (role === 'joy') { joy.style.display = 'block'; joy.style.left = e.clientX + 'px'; joy.style.top = e.clientY + 'px'; joyKnob.style.transform = 'translate(0,0)'; }
  fadeHint();
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') {
    if (dragging && !locked) { if (mouseDown) mouseDown.moved += Math.hypot(e.clientX - lastX, e.clientY - lastY); look(e.clientX - lastX, e.clientY - lastY, 0.004); lastX = e.clientX; lastY = e.clientY; }
    return;
  }
  const t = touches.get(e.pointerId); if (!t) return;
  if (t.role === 'look') look(e.clientX - t.x, e.clientY - t.y, 0.005);
  else {
    let dx = e.clientX - t.ox, dy = e.clientY - t.oy; const m = Math.hypot(dx, dy), max = 50;
    if (m > max) { dx *= max / m; dy *= max / m; }
    joyVec = { x: dx / max, y: dy / max };
    joyKnob.style.transform = `translate(${dx}px,${dy}px)`;
  }
  t.x = e.clientX; t.y = e.clientY;
});
function endPointer(e) {
  if (e.pointerType === 'mouse') {
    dragging = false;
    if (mouseDown && !locked && e.type === 'pointerup' && mouseDown.moved < 6 && performance.now() - mouseDown.t < 400) {
      const obj = pick((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1, true);
      if (obj) openBoard(obj);
    }
    mouseDown = null; return;
  }
  const t = touches.get(e.pointerId);
  if (t && t.role === 'joy') { joyVec = { x: 0, y: 0 }; joy.style.display = 'none'; }
  if (t && e.type === 'pointerup' && performance.now() - t.t < 350 && Math.hypot(e.clientX - t.ox, e.clientY - t.oy) < 12) {
    const obj = pick((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1, true);
    if (obj) openBoard(obj);
  }
  touches.delete(e.pointerId);
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

const intro = $('intro');
$('enter').addEventListener('click', () => {
  intro.hidden = true; sound.start();
  if (!isTouch) tryLock();
  canvas.focus();
});
let hintFaded = false, hintTimer = null;
function fadeHint() { if (hintFaded) return; hintFaded = true; hintTimer = setTimeout(() => { hint.style.opacity = '0.0'; }, 6000); }

// ---------- looking at posters, the bin and the gate ----------
const raycaster = new THREE.Raycaster(); raycaster.far = 7.5;
const promptEl = $('prompt');
function pick(nx, ny, far = false) {
  raycaster.far = far ? 14 : 7.5;
  raycaster.setFromCamera({ x: nx, y: ny }, camera);
  const hits = raycaster.intersectObjects(G.interactables, false);
  return hits.length ? hits[0].object : null;
}
function highlight(obj, on) {
  const m = obj.userData.kind === 'poster' ? obj.material : (obj.userData.kind === 'bin' ? G.binMat : null);
  if (!m) return;
  m.emissive.setHex(on ? 0xffc27a : 0x000000); m.emissiveIntensity = on ? 0.16 : 0;
}
function setHover(obj) {
  if (obj === hover) return;
  if (hover) highlight(hover, false);
  hover = obj;
  if (hover) {
    highlight(hover, true);
    const key = isTouch ? 'Tap' : 'Click or E';
    promptEl.innerHTML = hover.userData.kind === 'poster' ? '<b>' + key + '</b> · read the notes, leave a kind word'
      : hover.userData.kind === 'gate' ? '<b>' + key + '</b> · the gate to the herding grounds'
      : hover.userData.kind === 'grill' ? '<b>' + key + '</b> · want to grill the supervisor? Add a sausage'
      : hover.userData.kind === 'wish' ? '<b>' + key + '</b> · make a birthday wish — it goes up on the wall'
      : '<b>' + key + '</b> · the bin. Complaints go here';
    promptEl.classList.add('on');
  } else promptEl.classList.remove('on');
}

// ---------- notes: shared store ----------
const board = $('board'), boardEyebrow = $('boardEyebrow'), boardTitle = $('boardTitle');
const notesEl = $('notes'), readonlyEl = $('readonly');
const sayForm = $('say'), sayText = $('sayText'), saySig = $('saySig'), sayBtn = $('sayBtn');
const statusEl = $('status'), swapBtn = $('swap');
const gatePanel = $('gate'), listPanel = $('plist'), creditsPanel = $('credits');
let mode = 'poster', current = null;
let db = null, user = null, myId = null, isOwner = false, canWrite = null, dataMode = 'loading';
let wallNotes = [], binNotes = [], grillNotes = [];
const grillPanel = $('grill'), grillForm = $('grillForm'), grillSig = $('grillSig'), grillBtn = $('grillBtn'), grillStatus = $('grillStatus'), grillCount = $('grillCount'), grillRecent = $('grillRecent');
const wishPanel = $('wish'), wishForm = $('wishForm'), wishText = $('wishText'), wishSig = $('wishSig'), wishBtn = $('wishBtn'), wishStatus = $('wishStatus'), wishCount = $('wishCount'), wishSee = $('wishSee');
try { grillSig.value = wishSig.value = localStorage.getItem('wlr-sig') || ''; } catch (e) {}
try { saySig.value = localStorage.getItem('wlr-sig') || ''; } catch (e) {}

const useCap = (name) => (window.claude && typeof window.claude.use === 'function') ? window.claude.use(name) : Promise.resolve(null);
function clean(x) {
  x = x || {};
  return { poster: Number(x.poster) || 0, text: String(x.text || '').slice(0, 200), sig: String(x.sig || '').slice(0, 24), author: typeof x.author === 'string' ? x.author : null, at: String(x.at || '') };
}
function setStatus(t) { statusEl.textContent = t; }
function ago(iso) {
  const t = Date.parse(iso); if (!t) return '';
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.round(s / 60) + ' min ago';
  if (s < 86400) return Math.round(s / 3600) + ' h ago';
  if (s < 86400 * 14) return Math.round(s / 86400) + ' d ago';
  return new Date(t).toLocaleDateString();
}
function applyTitles(rows) {   // poster headings, editable by the owner outside the page
  for (const p of posters) p.title = '';
  for (const r of rows || []) { const p = posters[Number(r.n) - 1]; if (p && r.title) p.title = String(r.title).slice(0, 40); }
  G.redrawPosters(wallNotes, true);
  if (!listPanel.hidden) renderList();
}

// A plain REST backend (Supabase-shaped) for the standalone website.
const rest = {
  base(t) { return BACKEND.url.replace(/\/+$/, '') + '/rest/v1/' + t; },
  headers(extra) { return Object.assign({ apikey: BACKEND.key, Authorization: 'Bearer ' + BACKEND.key, 'Content-Type': 'application/json' }, extra || {}); },
  async load() {
    const r = await fetch(this.base(BACKEND.table) + '?select=id,kind,poster,text,sig,at&order=at.desc&limit=1000', { headers: this.headers() });
    if (!r.ok) throw new Error('load ' + r.status);
    const rows = await r.json();
    if (!Array.isArray(rows)) throw new Error('load shape');
    wallNotes = rows.filter((x) => x && x.kind === 'wall').map((x) => Object.assign({ id: String(x.id) }, clean(x)));
    binNotes = rows.filter((x) => x && x.kind === 'bin').map((x) => Object.assign({ id: String(x.id) }, clean(x)));
    grillNotes = rows.filter((x) => x && x.kind === 'grill').map((x) => Object.assign({ id: String(x.id) }, clean(x)));
    G.redrawPosters(wallNotes, false); G.updateBin(binNotes.length); G.setGrill(grillNotes.length); G.setWishes(wallNotes.length);
    if (boardOpen && !board.hidden && !askingFor) renderBoard();
    if (!listPanel.hidden) renderList();
    if (!grillPanel.hidden) renderGrill();
    if (!wishPanel.hidden) renderWish();
  },
  async loadTitles() {
    try {
      const r = await fetch(this.base(BACKEND.posters) + '?select=n,title&limit=100', { headers: this.headers() });
      if (r.ok) { const rows = await r.json(); if (Array.isArray(rows)) applyTitles(rows); }
    } catch (e) {}
  },
  async add(kind, doc) {
    const body = { kind, poster: doc.poster || 0, text: doc.text, sig: doc.sig, owner_token: visitorToken };
    const r = await fetch(this.base(BACKEND.table), { method: 'POST', headers: this.headers({ Prefer: 'return=minimal' }), body: JSON.stringify(body) });
    if (!r.ok) throw new Error('add ' + r.status);
  },
  // hides a note: with the browser's own token (your own notes) or the admin password. Returns true if it went.
  async remove(id, token) {
    const r = await fetch(this.base('rpc/delete_note'), { method: 'POST', headers: this.headers(), body: JSON.stringify({ p_id: id, p_token: token }) });
    if (!r.ok) throw new Error('remove ' + r.status);
    return Number(await r.json()) > 0;
  },
};
// every browser gets a token of its own; notes written here carry it, so they can be deleted from here without a password
let visitorToken = '';
try { visitorToken = localStorage.getItem('wlr-visitor') || ''; } catch (e) {}
if (!visitorToken) {
  visitorToken = (crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join(''));
  try { localStorage.setItem('wlr-visitor', visitorToken); } catch (e) {}
}

(async () => {
  try { db = await useCap('db'); user = await useCap('user'); } catch (e) { db = null; }
  if (user) { try { myId = await user.id(); isOwner = await user.isOwner(); canWrite = await user.can('data.write'); } catch (e) {} }
  if (!db) {
    if (BACKEND.url && BACKEND.key) {
      dataMode = 'rest';
      try { await rest.load(); } catch (e) { setStatus('Could not reach the notes right now. They will show up once the connection is back.'); }
      rest.loadTitles();
      setInterval(() => { if (document.visibilityState === 'visible') rest.load().catch(() => {}); }, 30000);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') rest.load().catch(() => {}); });
    } else dataMode = 'local';
    G.redrawPosters(wallNotes, true); if (boardOpen) renderBoard(); return;
  }
  dataMode = 'db';
  db.collection('wall').orderBy('at', 'desc').limit(1000).onSnapshot((snap) => {
    wallNotes = snap.docs.map((d) => Object.assign({ id: d.id }, clean(d.data())));
    G.redrawPosters(wallNotes, false); G.setWishes(wallNotes.length);
    if (boardOpen && !board.hidden) renderBoard(); if (!listPanel.hidden) renderList(); if (!wishPanel.hidden) renderWish();
  }, (err) => { setStatus('The wall stopped updating (' + err.code + '). Reload to reconnect.'); });
  db.collection('bin').orderBy('at', 'desc').limit(1000).onSnapshot((snap) => {
    binNotes = snap.docs.map((d) => Object.assign({ id: d.id }, clean(d.data())));
    G.updateBin(binNotes.length); if (boardOpen && !board.hidden) renderBoard();
  }, (err) => { setStatus('The bin stopped updating (' + err.code + '). Reload to reconnect.'); });
  db.collection('grill').orderBy('at', 'desc').limit(1000).onSnapshot((snap) => {
    grillNotes = snap.docs.map((d) => Object.assign({ id: d.id }, clean(d.data())));
    G.setGrill(grillNotes.length); if (!grillPanel.hidden) renderGrill();
  }, () => {});
  db.collection('posters').limit(100).onSnapshot((snap) => {
    applyTitles(snap.docs.map((d) => ({ n: d.id, title: (d.data() || {}).title })));
  }, () => {});
  if (boardOpen) renderBoard();
})();

// ---------- the panels ----------
function openPanel(el) {
  boardOpen = true; keysDown.clear(); joyVec = { x: 0, y: 0 }; setHover(null);
  if (locked && document.exitPointerLock) document.exitPointerLock();
  el.hidden = false;
}
function openBoard(obj) {
  if (boardOpen) return;
  if (obj.userData.kind === 'gate') { openPanel(gatePanel); return; }
  if (obj.userData.kind === 'grill') { openPanel(grillPanel); grillStatus.textContent = ''; renderGrill(); if (dataMode === 'rest') rest.load().catch(() => {}); return; }
  if (obj.userData.kind === 'wish') { openPanel(wishPanel); wishStatus.textContent = ''; wishSee.hidden = true; renderWish(); if (dataMode === 'rest') rest.load().catch(() => {}); if (!isTouch) setTimeout(() => wishText.focus(), 50); return; }
  if (obj.userData.kind === 'poster') { mode = 'poster'; current = posters[obj.userData.n - 1]; }
  else { mode = 'bin'; current = null; }
  openPanel(board); setStatus('');
  renderBoard();
  if (dataMode === 'rest') rest.load().catch(() => {});
  if (!isTouch) setTimeout(() => sayText.focus(), 50);
}
function openList() {
  if (boardOpen) return;
  openPanel(listPanel); renderList();
  if (dataMode === 'rest') rest.load().catch(() => {});
}
function openCredits() { if (boardOpen) return; openPanel(creditsPanel); }
function closeBoard() {
  if (!boardOpen) return;
  boardOpen = false; askingFor = null; setStatus('');
  for (const el of [board, gatePanel, listPanel, creditsPanel, grillPanel, wishPanel]) el.hidden = true;
  canvas.focus(); if (!isTouch) tryLock();
}
function posterTitle(p) { return (p.title || 'Leave a kind word').replace('\n', ' '); }
function renderList() {
  const rows = $('plistRows'); rows.replaceChildren();
  for (const p of posters) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'row';
    const n = wallNotes.filter((x) => x.poster === p.n).length;
    const sn = document.createElement('span'); sn.className = 'n'; sn.textContent = String(p.n).padStart(2, '0');
    const st = document.createElement('span'); st.className = 't'; st.textContent = posterTitle(p);
    const sc = document.createElement('span'); sc.className = 'c'; sc.textContent = n ? n + (n === 1 ? ' note' : ' notes') : 'empty';
    b.append(sn, st, sc);
    b.addEventListener('click', () => { listPanel.hidden = true; mode = 'poster'; current = p; board.hidden = false; setStatus(''); renderBoard(); if (!isTouch) setTimeout(() => sayText.focus(), 50); });
    rows.appendChild(b);
  }
}
$('plistBin').addEventListener('click', () => { listPanel.hidden = true; mode = 'bin'; current = null; board.hidden = false; setStatus(''); renderBoard(); });
$('mPosters').addEventListener('click', () => { if (boardOpen) closeBoard(); openList(); });
$('mCredits').addEventListener('click', () => { if (boardOpen) closeBoard(); openCredits(); });
$('mSound').addEventListener('click', () => {
  sound.start();
  const on = tuning.sound.master > 0;
  tuning.sound.master = on ? 0 : 0.8;
  $('mSound').innerHTML = 'Sound <b>' + (on ? 'off' : 'on') + '</b>';
});
for (const el of document.querySelectorAll('[data-close]')) el.addEventListener('click', closeBoard);
for (const el of [board, gatePanel, listPanel, creditsPanel, grillPanel, wishPanel]) el.addEventListener('pointerdown', (e) => { if (e.target === el) closeBoard(); });

// one place that stores a note, whichever backend is in use
async function saveNote(kind, doc) {
  if (dataMode === 'db') await db.collection(kind).add(doc);
  else if (dataMode === 'rest') { await rest.add(kind, doc); await rest.load().catch(() => {}); }
  else {
    const n = Object.assign({ id: 'local-' + Date.now() }, clean(doc));
    (kind === 'wall' ? wallNotes : kind === 'bin' ? binNotes : grillNotes).unshift(n);
    G.redrawPosters(wallNotes, false); G.updateBin(binNotes.length); G.setGrill(grillNotes.length); G.setWishes(wallNotes.length);
  }
}

// ---------- the wish board ----------
// a wish is a wall note; it goes on the emptiest poster, the nearest such to the board first, so the wall fills evenly
const WISH_Z = -2.7;
function posterForWish() {
  const counts = posters.map((p) => wallNotes.filter((n) => n.poster === p.n).length);
  const min = Math.min(...counts);
  return posters.filter((p, i) => counts[i] === min).reduce((a, b) => Math.abs(b.z - WISH_Z) < Math.abs(a.z - WISH_Z) ? b : a);
}
let lastWishPoster = null;
function renderWish() {
  const n = wallNotes.length;
  wishCount.textContent = n === 0 ? 'The wall is waiting for the first one.' : n === 1 ? 'One wish is up so far.' : n + ' wishes are up so far.';
  const ro = (dataMode === 'db' && canWrite === false);
  wishForm.hidden = ro;
  if (ro) wishStatus.textContent = 'Leaving a wish needs a contributor invitation to this corner.';
  else if (dataMode === 'local' && !wishStatus.textContent) wishStatus.textContent = 'Not connected to the shared wall right now, so your wish stays on this screen.';
}
wishForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = wishText.value.trim(), sig = wishSig.value.trim();
  if (!text) { wishStatus.textContent = 'Write your wish first.'; wishText.focus(); return; }
  if (dataMode === 'loading') { wishStatus.textContent = 'Still connecting to the wall. Try again in a moment.'; return; }
  const target = posterForWish();
  const doc = { poster: target.n, text, sig, author: myId, at: new Date().toISOString() };
  wishBtn.disabled = true; wishStatus.textContent = 'Pinning…';
  try {
    await saveNote('wall', doc);
    wishText.value = ''; lastWishPoster = target; renderWish();
    wishStatus.textContent = 'Pinned on poster No. ' + target.n + (target.title ? ' (“' + posterTitle(target) + '”)' : '') + '. Walk the hall to find it, or press P for the list.';
    wishSee.hidden = false;
    try { localStorage.setItem('wlr-sig', sig); } catch (err) {}
  } catch (err) {
    console.warn('wish not saved', err);
    if (err && err.code === 'invalid_argument') { canWrite = false; renderWish(); }
    else wishStatus.textContent = err && err.code === 'quota_exceeded' ? 'The wall is full. Nothing more fits.' : 'Could not pin it. Try once more.';
  }
  wishBtn.disabled = false;
});
wishSee.addEventListener('click', () => {
  if (!lastWishPoster) return;
  wishPanel.hidden = true; mode = 'poster'; current = lastWishPoster; board.hidden = false; setStatus(''); renderBoard();
});

// ---------- the grill ----------
function renderGrill() {
  const n = grillNotes.length;
  grillCount.textContent = n === 0 ? 'Nobody has put one on yet — be the first.' : n === 1 ? 'One is on the grate so far.' : n + ' are on the grate so far' + (n > 16 ? ' (16 fit on it at a time).' : '.');
  const who = grillNotes.slice(0, 8).map((x) => x.sig || 'someone');
  grillRecent.textContent = who.length ? 'Latest from: ' + who.join(', ') : '';
  const ro = (dataMode === 'db' && canWrite === false);
  grillForm.hidden = ro;
  if (ro) grillStatus.textContent = 'Adding a sausage needs a contributor invitation to this corner.';
  else if (dataMode === 'local' && !grillStatus.textContent) grillStatus.textContent = 'Not connected to the shared grill right now, so your sausage stays on this screen.';
}
grillForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (dataMode === 'loading') { grillStatus.textContent = 'Still connecting to the grill. Try again in a moment.'; return; }
  const sig = grillSig.value.trim();
  const doc = { text: '🌭', sig, author: myId, at: new Date().toISOString() };
  grillBtn.disabled = true; grillStatus.textContent = 'Putting it on…';
  try {
    await saveNote('grill', doc);
    renderGrill();
    grillStatus.textContent = 'On the grill. Sizzling.';
    try { localStorage.setItem('wlr-sig', sig); } catch (err) {}
  } catch (err) {
    console.warn('sausage not saved', err);
    if (err && err.code === 'invalid_argument') { canWrite = false; renderGrill(); }
    else grillStatus.textContent = 'Could not put it on. Try once more.';
  }
  grillBtn.disabled = false;
});

function canRemove(n) { if (dataMode === 'rest') return true; return dataMode === 'local' || isOwner || (myId && n.author === myId); }
let askingFor = null;   // the note whose delete needs the admin password
function renderBoard() {
  board.classList.toggle('bin', mode === 'bin');
  const list = mode === 'poster' ? wallNotes.filter((n) => n.poster === current.n) : binNotes;
  if (mode === 'poster') {
    boardEyebrow.textContent = 'Wall of notes · No. ' + current.n + ' of ' + posters.length;
    boardTitle.textContent = current.title ? posterTitle(current) : (list.length ? 'Kind words left here' : 'Leave a kind word');
    sayText.placeholder = 'What did this corner give you today?';
    sayBtn.textContent = 'Pin it to the wall';
    swapBtn.textContent = 'Not so kind? Toss it in the bin instead →';
  } else {
    boardEyebrow.textContent = 'The one and only bin';
    boardTitle.textContent = list.length ? 'What people threw away' : 'Something to get off your chest?';
    sayText.placeholder = 'Say what bothered you. It goes in the bin, not on the wall.';
    sayBtn.textContent = 'Toss it in';
    swapBtn.textContent = '← Something nice to say? Pin it on a poster instead';
  }
  notesEl.replaceChildren();
  if (!list.length) {
    const e = document.createElement('div'); e.id = 'noteEmpty';
    e.textContent = mode === 'poster' ? 'Nothing pinned here yet.' : 'The bin is empty. Nobody has complained.';
    notesEl.appendChild(e);
  }
  for (const n of list) {
    const el = document.createElement('div'); el.className = 'note';
    const p = document.createElement('p'); p.textContent = n.text; el.appendChild(p);
    const meta = document.createElement('div'); meta.className = 'meta';
    const who = document.createElement('span'); who.textContent = '— ' + (n.sig || 'someone') + (n.at ? ' · ' + ago(n.at) : ''); meta.appendChild(who);
    if (canRemove(n)) {
      const rm = document.createElement('button'); rm.type = 'button'; rm.className = 'rm';
      rm.textContent = 'delete';
      rm.addEventListener('click', () => removeNote(n));
      meta.appendChild(rm);
    }
    el.appendChild(meta);
    if (askingFor === n.id) {   // not this browser's note: the admin can still delete it with the password
      const f = document.createElement('form'); f.className = 'pw'; f.noValidate = true;
      const lab = document.createElement('span'); lab.textContent = 'Not yours. Admin password:';
      const inp = document.createElement('input'); inp.type = 'password'; inp.autocomplete = 'off'; inp.setAttribute('aria-label', 'Admin password');
      const go = document.createElement('button'); go.type = 'submit'; go.textContent = 'Delete';
      const no = document.createElement('button'); no.type = 'button'; no.textContent = 'Cancel'; no.className = 'rm';
      no.addEventListener('click', () => { askingFor = null; setStatus(''); renderBoard(); });
      f.addEventListener('submit', (ev) => { ev.preventDefault(); removeNote(n, inp.value); });
      f.append(lab, inp, go, no); el.appendChild(f);
      setTimeout(() => inp.focus(), 30);
    }
    notesEl.appendChild(el);
  }
  const ro = (dataMode === 'db' && canWrite === false);
  sayForm.hidden = ro; swapBtn.hidden = ro; readonlyEl.hidden = !ro;
  if (ro) readonlyEl.textContent = 'You can read this ' + (mode === 'poster' ? 'wall' : 'bin') + ', but leaving a note needs a contributor invitation to this corner.';
  else if (dataMode === 'local' && !statusEl.textContent) setStatus('Not connected to the shared wall right now, so notes you leave stay on this screen.');
}
async function removeNote(n, password) {
  try {
    if (dataMode === 'db') { await db.doc((mode === 'poster' ? 'wall/' : 'bin/') + n.id).delete(); return; }
    if (dataMode === 'rest') {
      const token = password !== undefined ? password.trim() : visitorToken;
      const gone = token ? await rest.remove(n.id, token) : false;
      if (!gone) {
        if (password !== undefined) setStatus('That is not the admin password.');
        else { askingFor = n.id; setStatus(''); renderBoard(); }
        return;
      }
      askingFor = null;
      await rest.load().catch(() => {});
      setStatus(password !== undefined ? 'Deleted by the admin.' : 'Deleted.');
      return;
    }
    const arr = mode === 'poster' ? wallNotes : binNotes; const i = arr.indexOf(n); if (i >= 0) arr.splice(i, 1);
    G.redrawPosters(wallNotes, false); G.updateBin(binNotes.length); G.setWishes(wallNotes.length); renderBoard();
  } catch (e) { setStatus('Could not remove it (' + ((e && e.code) || 'error') + ').'); }
}
sayForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = sayText.value.trim(), sig = saySig.value.trim();
  if (!text) { setStatus('Write something first.'); sayText.focus(); return; }
  if (dataMode === 'loading') { setStatus('Still connecting to the wall. Try again in a moment.'); return; }
  if (mode === 'poster' && !current) { setStatus('Pick a poster first.'); return; }
  const doc = { text, sig, author: myId, at: new Date().toISOString() };
  if (mode === 'poster') doc.poster = current.n;
  sayBtn.disabled = true; setStatus(mode === 'poster' ? 'Pinning…' : 'Tossing…');
  try {
    await saveNote(mode === 'poster' ? 'wall' : 'bin', doc);
    if (dataMode === 'local') renderBoard();
    sayText.value = '';
    setStatus(mode === 'poster' ? 'Pinned. Everyone who walks past will see it.' : 'In the bin. Only the curious will find it.');
    try { localStorage.setItem('wlr-sig', sig); } catch (err) {}
  } catch (err) {
    const code = err && err.code;
    console.warn('note not saved', err);
    if (code === 'invalid_argument') { canWrite = false; renderBoard(); }
    else setStatus(code === 'quota_exceeded' ? 'The wall is full. Nothing more fits.' : 'Could not save it. Try once more.');
  }
  sayBtn.disabled = false;
});
swapBtn.addEventListener('click', () => {
  if (mode === 'poster') { mode = 'bin'; current = null; }
  else { mode = 'poster'; current = posters.reduce((a, b) => Math.abs(b.z - BIN.z) < Math.abs(a.z - BIN.z) ? b : a); }
  setStatus(''); renderBoard();
});

// ---------- the clock ----------
// The slider is a time of day, 00:00–24:00. The sun rises at six along the glass side of the gallery, peaks at one
// and sets at eight; the moon takes over at night. The whole look (sky, grass, forest, alpacas, fog) is blended
// between three tunings — night, dusk and the daytime look from tuning.json — and pushed through applyTuning.
const LOOK_DAY = tuning;
const LOOK_NIGHT = {
  sky: { sun: 0.32, skyLight: 0.14, zenith: '#060a18', horizon: '#141c30', band: 0.26, haze: 0.4 },
  grass: { light: '#2b3a4e', lightDeep: '#1f2a3a', shadow: '#111826' },
  forest: { lit: '#25303e', shade: '#141a28' },
  sheep: { light: '#8e98ad', shadow: '#3a4255' },
  water: { color: '#0d1620', lake: '#15253a', glitterColor: '#cfd8ff' },
};
const LOOK_DUSK = {
  sky: { sun: 1.5, skyLight: 0.4, zenith: '#324b86', horizon: '#f0a978', band: 0.4, haze: 0.6 },
  grass: { light: '#a89d52', lightDeep: '#75703a', shadow: '#3b4a4a' },
  forest: { lit: '#6b6a4c', shade: '#3f4762' },
  sheep: { light: '#f5dfc4', shadow: '#8b8a8e' },
  water: { color: '#1d3a44', lake: '#3a5a86', glitterColor: '#ffb470' },
};
const SUN_WARM = new THREE.Color('#fff5e6'), SUN_LOW = new THREE.Color('#ffb070'), MOON = new THREE.Color('#9fb4ff');
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
function mixHex(a, b, k) { return '#' + _c1.set(a).lerp(_c2.set(b), k).getHexString(); }
function blendLook(a, b, k) {   // a is the full tuning; b overrides a few colours and numbers
  const out = JSON.parse(JSON.stringify(a));
  for (const sec of Object.keys(b)) for (const key of Object.keys(b[sec])) {
    const va = a[sec][key], vb = b[sec][key];
    out[sec][key] = typeof vb === 'string' ? mixHex(va, vb, k) : va + (vb - va) * k;
  }
  return out;
}
let cur = tuning, clockMins = 930, lampK = 0, dayK = 1;
function setClock(mins) {
  clockMins = mins;
  const h = mins / 60;
  // the sun: up from 06:00 to 20:00, highest at 13:00; the moon: up from 19:00 to 07:00, highest at 01:00
  const sunEl = 44 * Math.sin(Math.PI * (h - 6) / 14);          // negative below the horizon
  const hm = (h + 5) % 24;   // 0 at 19:00
  const moonEl = 36 * Math.sin(Math.PI * hm / 12);
  const sunAz = -117.6 + 4.7 * h, moonAz = -112 + 4.7 * hm;
  dayK = THREE.MathUtils.smoothstep(sunEl, -9, 10);
  const dusk = Math.exp(-Math.pow(sunEl / 6, 2)) * 0.9;
  const night = 1 - dayK;
  // which light carries the shadows: the sun while it is up, the moon otherwise
  const useMoon = sunEl < 1 && moonEl > sunEl;
  cur = blendLook(LOOK_DAY, LOOK_NIGHT, night);
  cur = blendLook(cur, LOOK_DUSK, dusk * (1 - night * 0.7));
  cur.sky.elevation = Math.max(useMoon ? moonEl : sunEl, 1.5);
  cur.sky.azimuth = useMoon ? moonAz : sunAz;
  applyTuning(U, cur);
  // the light's colour: warm sun, orange when it is low, blue moonlight at night
  const lightCol = useMoon ? MOON : _c1.copy(SUN_WARM).lerp(SUN_LOW, THREE.MathUtils.clamp(1 - sunEl / 18, 0, 1));
  U.uSunColor.value.copy(lightCol).multiplyScalar(cur.sky.sun);
  sun.color.copy(lightCol);
  hemi.color.set(cur.sky.zenith).lerp(_c2.set(cur.sky.horizon), 0.5);
  hemi.groundColor.set(0xcdbfa9).multiplyScalar(0.35 + 0.65 * dayK);
  scene.fog.color.copy(U.uFogColor.value);
  sky.material.uniforms.uSkyDim.value = 0.12 + 0.88 * dayK;
  sky.material.uniforms.uStars.value = THREE.MathUtils.clamp((-sunEl - 3) / 9, 0, 1);
  sky.material.uniforms.uSunGlow.value.set(useMoon ? '#c8d4ff' : PALETTE.sunGlow);
  // the standing lamps burn from 18:00 to 06:00
  lampK = h >= 12 ? THREE.MathUtils.clamp(h - 17.5, 0, 1) : THREE.MathUtils.clamp(6.5 - h, 0, 1);
  for (const l of G.lampLights) { l.light.intensity = 11 * lampK; l.mat.emissiveIntensity = 0.9 * lampK; }
  sunOut.textContent = String(Math.floor(mins / 60) % 24).padStart(2, '0') + ':' + String(Math.round(mins % 60)).padStart(2, '0');
}
setClock(clockMins);
sunInput.addEventListener('input', () => setClock(Number(sunInput.value)));

// ---------- walking ----------
function collide() {
  // the glass wall, except through a door that has swung open
  let through = null;
  for (const d of DOORS) if (d.angle < -1.1 && player.z > d.z1 + R && player.z < d.z0 - R) { through = d; break; }
  if (through) {
    if (Math.abs(player.x - XG) < 0.55) player.z = THREE.MathUtils.clamp(player.z, through.z1 + R, through.z0 - R);
  } else if (player.x >= XG && onPlatform(player.x, player.z)) player.x = Math.max(player.x, XG + 0.24 + R);
  else if (onPlatform(player.x, player.z)) player.x = Math.min(player.x, XG - 0.24 - R);
  if (player.x > XG && player.x < XW) player.z = THREE.MathUtils.clamp(player.z, Z1 + R, Z0 - R);
  player.x = THREE.MathUtils.clamp(player.x, -300, 40);
  player.z = THREE.MathUtils.clamp(player.z, -400, 400);
  for (const b of colliders) {
    const minX = b.minX - R, maxX = b.maxX + R, minZ = b.minZ - R, maxZ = b.maxZ + R;
    if (player.x > minX && player.x < maxX && player.z > minZ && player.z < maxZ) {
      const pens = [player.x - minX, maxX - player.x, player.z - minZ, maxZ - player.z];
      const m = Math.min(...pens), i = pens.indexOf(m);
      if (i === 0) player.x = minX; else if (i === 1) player.x = maxX; else if (i === 2) player.z = minZ; else player.z = maxZ;
    }
  }
  // the valley's spruces (world coordinates); the platform's own round obstacles are for the flock, not for you
  if (!onPlatform(player.x, player.z) && !onStairs(player.x, player.z)) {
    let [wx, wz] = toWorld(player.x, player.z);
    let moved = false;
    for (const o of world.obstacles) {
      const dx = wx - o.x, dz = wz - o.z, d = Math.hypot(dx, dz), min = o.r + R;
      if (d < min && d > 1e-4) { wx = o.x + (dx / d) * min; wz = o.z + (dz / d) * min; moved = true; }
    }
    if (moved) { const [lx, lz] = toLocal(wx, wz); player.x = lx; player.z = lz; }
  }
}

// ---------- render ----------
const post = new Post();
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  post.setSize(w, h, dpr);
  camera.aspect = w / h; camera.fov = w / h < 0.8 ? 80 : 68;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// Quality: as in vibe-shepherding, the level is picked while the veil is up by timing real frames
const LEVELS = [
  { dpr: 1.5, grass: 1, flowers: 1, trees: 450 },
  { dpr: 1.25, grass: 0.65, flowers: 0.8, trees: 340 },
  { dpr: 1, grass: 0.42, flowers: 0.6, trees: 240 },
  { dpr: 0.8, grass: 0.28, flowers: 0.45, trees: 160 },
];
const GPU_BUDGET = 11, GAP_BUDGET = 21;
const FORCED = ['high', 'medium', 'low', 'lowest'].indexOf(new URLSearchParams(location.search).get('quality'));
let level = FORCED >= 0 ? FORCED : isTouch ? 1 : 0;
function applyLevel(i) {
  level = i;
  const L = LEVELS[i];
  dpr = Math.min(window.devicePixelRatio || 1, L.dpr);
  grassNear.userData.setDensity(L.grass);
  grassMid.userData.setDensity(Math.min(1, L.grass * 1.15));
  flowers.userData.setDensity(L.flowers);
  world.treeDetail = L.trees;
  resize();
}
applyLevel(level);
const gpuTimer = (() => {
  const gl = renderer.getContext();
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  if (!ext) return null;
  const pending = [];
  let q = null;
  return {
    begin() { q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); },
    end(tag) { gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push([q, tag]); q = null; },
    poll(fn) {
      while (pending.length && gl.getQueryParameter(pending[0][0], gl.QUERY_RESULT_AVAILABLE)) {
        const [done, tag] = pending.shift();
        if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) fn(gl.getQueryParameter(done, gl.QUERY_RESULT) / 1e6, tag);
        gl.deleteQuery(done);
      }
    },
  };
})();
const sceneTimer = gpuTimer && { begin: () => gpuTimer.begin(), end: () => gpuTimer.end(level) };
const median = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];
const tune = { calibrating: FORCED < 0, frames: 0, gpu: [], gaps: [], started: 0, prev: null, watch: [], cooldown: 0 };
function settleLevel(gap) {
  if (gpuTimer) gpuTimer.poll((ms, tag) => { if (tag === level) tune.gpu.push(ms); });
  tune.frames++;
  if (tune.frames <= 5) return false;
  tune.started ||= performance.now();
  if (gap < 250) tune.gaps.push(gap);
  const useGpu = tune.gpu.length >= 6;
  const samples = useGpu ? tune.gpu : tune.gaps;
  const budget = useGpu ? GPU_BUDGET : GAP_BUDGET;
  const enough = samples.length >= 10 || (samples.length >= 4 && median(samples) > budget * 2);
  const outOfTime = performance.now() - tune.started > 4000;
  if (!enough && !outOfTime) return false;
  const m = samples.length ? median(samples) : 0;
  if (!useGpu && tune.prev && !tune.prev.useGpu && m > tune.prev.m * 0.85) { applyLevel(tune.prev.level); return true; }
  if (outOfTime && m > budget * 2 && level < LEVELS.length - 1) { applyLevel(LEVELS.length - 1); return true; }
  if (m > budget && level < LEVELS.length - 1 && !outOfTime) {
    tune.prev = { level, m, useGpu };
    applyLevel(Math.min(LEVELS.length - 1, level + (m > budget * 2.2 ? 2 : 1)));
    tune.frames = 1; tune.gpu = []; tune.gaps = [];
    return false;
  }
  return true;
}
function watchLevel(gap, dt) {
  if (gap > 250 || FORCED >= 0) return;
  tune.watch.push(gap);
  if (tune.watch.length > 60) tune.watch.shift();
  if ((tune.cooldown -= dt) > 0 || tune.watch.length < 60 || level >= LEVELS.length - 1) return;
  if (median(tune.watch) > 40) { applyLevel(level + 1); tune.watch = []; tune.cooldown = 6; }
}

const clock = new THREE.Clock();
const fwd = new THREE.Vector3(), rgt = new THREE.Vector3(), tmp = new THREE.Vector3(), projScreen = new THREE.Matrix4();
let lastFrame = 0, first = true, ambience = 0;
const veil = $('veil');

function frame() {
  if (window.__prof) window.__prof.frames = (window.__prof.frames || 0) + 1;   // headless test hook
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = (U.uTime.value += dt);
  cloudUniforms.uTime.value = time;
  sun.intensity = cur.sky.sun * Math.PI * GALLERY_SUN * (0.45 + 0.55 * dayK);
  hemi.intensity = cur.sky.skyLight * Math.PI * GALLERY_SKY * (0.5 + 0.5 * dayK);

  // walk
  let mf = 0, ms = 0;
  if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) mf += 1;
  if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) mf -= 1;
  if (keysDown.has('KeyD')) ms += 1;
  if (keysDown.has('KeyA')) ms -= 1;
  if (keysDown.has('ArrowLeft')) player.yaw += 1.8 * dt;
  if (keysDown.has('ArrowRight')) player.yaw -= 1.8 * dt;
  mf += -joyVec.y; ms += joyVec.x;
  const mag = Math.hypot(mf, ms); if (mag > 1) { mf /= mag; ms /= mag; }
  const speed = (keysDown.has('ShiftLeft') || keysDown.has('ShiftRight')) ? 4.4 : 2.1;
  fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  rgt.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  const tx = (fwd.x * mf + rgt.x * ms) * speed, tz = (fwd.z * mf + rgt.z * ms) * speed;
  const k = 1 - Math.exp(-10 * dt);
  player.vx += (tx - player.vx) * k; player.vz += (tz - player.vz) * k;
  player.x += player.vx * dt; player.z += player.vz * dt;
  collide();
  const v = Math.hypot(player.vx, player.vz);
  if (mag > 0.05 && !hintFaded) fadeHint();
  player.bob += v * dt * 2.6;
  const bob = reduceMotion ? 0 : Math.sin(player.bob * 2) * 0.022 * Math.min(v / 2, 1);
  player.y += (groundLocal(player.x, player.z) - player.y) * Math.min(1, dt * 14);

  // the camera, in world space
  const [wx, wz] = toWorld(player.x, player.z);
  camera.position.set(wx, SITE.H0 + player.y + EYE + bob, wz);
  camera.rotation.set(player.pitch, player.yaw + SITE.theta, 0);
  camera.updateMatrixWorld();
  projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  herdCtx.frustum.setFromProjectionMatrix(projScreen);
  setHover((boardOpen || !intro.hidden) ? null : pick(0, 0));

  // the glass doors open themselves when you come near
  for (const d of DOORS) {
    const dd = Math.hypot(player.x - XG, player.z - (d.z0 + d.z1) / 2);
    d.target = dd < 2.6 ? -1.55 : 0;
    d.angle += THREE.MathUtils.clamp(d.target - d.angle, -2.4 * dt, 2.4 * dt);
    d.pivot.rotation.y = d.angle;
  }
  G.tickSmoke(dt);

  // the valley's sounds belong to the valley: silent in the gallery and on the terrace, fading in on the way down the steps
  const outdoors = onPlatform(player.x, player.z) ? 0
    : onStairs(player.x, player.z) ? THREE.MathUtils.clamp((STAIR.top - player.x) / (STAIR.top - STAIR.bottom), 0, 1) : 1;
  ambience += (outdoors - ambience) * Math.min(1, dt * 2.5);
  sound.ambience = ambience;

  // the valley around the camera
  U.uCenter.value.copy(camera.position);
  sky.position.copy(camera.position);
  world.update(camera.position, 4);
  horizon.userData.follow(camera.position.x, camera.position.z);
  lake.userData.follow(camera.position.x, camera.position.z);
  cloudUniforms.uSunView.value.copy(SUN_DIR).transformDirection(camera.matrixWorldInverse);
  obstacles.length = 0; obstacles.push(...platformObstacles, ...world.obstacles);

  // the flock: on the meadow they come to you; while you're up on the platform they stay below the steps
  const onMeadow = !onPlatform(player.x, player.z) && !onStairs(player.x, player.z) && player.x < SITE.rect.x0 - 1;
  const f = camera.getWorldDirection(tmp); f.y = 0; f.normalize();
  const moving = Math.min(1, v / 2.1);
  let cxT, czT;
  if (onMeadow) { const D = 2.2 + 0.55 * (flock ? flock.spread : 1) + 2.0 * moving; cxT = camera.position.x + f.x * D; czT = camera.position.z + f.z * D; }
  else { cxT = MEADOW_SPOT[0]; czT = MEADOW_SPOT[1]; }
  const kk = 1 - Math.exp(-dt * 1.2);
  herdCtx.cx += (cxT - herdCtx.cx) * kk; herdCtx.cz += (czT - herdCtx.cz) * kk;
  if (onMeadow) { herdCtx.fx += (f.x - herdCtx.fx) * kk; herdCtx.fz += (f.z - herdCtx.fz) * kk; const l = Math.hypot(herdCtx.fx, herdCtx.fz) || 1; herdCtx.fx /= l; herdCtx.fz /= l; }
  if (flock) flock.update(dt, time, herdCtx);
  bees.update(dt, time, camera.position, f.x, f.z);
  sound.update(dt, { camera, walker: { speed: v }, flock: flock || { bleats: [] }, bees });

  followShadow(tmp.copy(f).multiplyScalar(9).add(camera.position));
  post.render(renderer, scene, camera, gpuTimer && tune.calibrating ? sceneTimer : null);
  if (sun.shadow.map && !U.uShadowOn.value) {
    U.uShadowMap.value = sun.shadow.map.texture;
    U.uShadowOn.value = 1;
  }

  const now = performance.now(), gap = lastFrame ? now - lastFrame : 0;
  lastFrame = now;
  if (tune.calibrating) {
    if (settleLevel(gap)) { tune.calibrating = false; veil.classList.add('gone'); }
  } else watchLevel(gap, dt);
  if (first) { first = false; if (!tune.calibrating) requestAnimationFrame(() => veil.classList.add('gone')); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if (location.search.includes('debug')) Object.assign(window, { __p: player, __d: DOORS[1], __G: G, __cam: camera, __clock: setClock, __sound: sound, __amb: () => ambience, __scene: scene, __renderer: renderer });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => G.redrawPosters(wallNotes, true));
