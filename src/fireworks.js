import * as THREE from 'three';
import { toWorld, SITE } from './siteConst.js';

// 烟花 — fireworks over the grassland at midnight. Rockets climb from the meadow on gold trails and burst into
// peonies, chrysanthemums, willows and rings; every so often a volley opens into the words "Happy birthday!",
// written in sparks that hang glittering in the sky, turned to face you, before they drift down and fade.
// One Points cloud carries every spark; the physics is a few lines per particle on the CPU.

const MAX = 9000;
const GRAV = 3.2;        // fireworks fall slowly; it reads better than real gravity at this scale
const MESSAGES = ['Happy birthday JL!', 'Cheers to your future self! 🥂', 'genius Ranran & MAXLab (Oct 19, 2026)'];

const vert = /* glsl */ `
attribute vec3 aColor;
attribute float aSize;
attribute float aAlpha;
uniform float uPixelRatio;
varying vec3 vCol;
varying float vA;
void main() {
  vCol = aColor; vA = aAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = clamp(aSize * (420.0 / max(-mv.z, 1.0)), 1.5, 48.0) * uPixelRatio;
  gl_Position = projectionMatrix * mv;
}
`;
const frag = /* glsl */ `
varying vec3 vCol;
varying float vA;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = pow(max(0.0, 1.0 - r), 1.4) * vA;
  gl_FragColor = vec4(vCol + vec3(0.25) * smoothstep(0.5, 0.0, r), a);
}
`;

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (l) => l[(Math.random() * l.length) | 0];
const PALETTE = [
  [1.0, 0.35, 0.3], [1.0, 0.78, 0.25], [0.45, 0.65, 1.0], [0.95, 0.5, 0.9], [0.4, 1.0, 0.6],
  [1.0, 0.55, 0.15], [0.95, 0.95, 1.0], [0.75, 0.45, 1.0], [1.0, 0.9, 0.6],
];
const WORD_COLORS = [[1.0, 0.82, 0.3], [1.0, 0.5, 0.65], [0.95, 0.95, 1.0]];

// the letters of one message, sampled once from a canvas: points in a 0..1 box, with the aspect and the width the
// message should take in the sky (letters about five metres tall, unless the line would get too wide for the view)
function sampleText(text) {
  const c = document.createElement('canvas'); c.height = 192;
  const g = c.getContext('2d');
  const font = '700 128px "Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif';
  g.font = font; c.width = Math.ceil(g.measureText(text).width) + 120;
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font;
  g.fillText(text, c.width / 2, c.height / 2 + 6);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let pts = [];
  for (let y = 2; y < c.height; y += 5) for (let x = 2; x < c.width; x += 5) {
    const k = (y * c.width + x) * 4;
    if (Math.max(d[k], d[k + 1], d[k + 2]) > 110) pts.push([x / c.width, y / c.height, x]);
  }
  // a long line gets thinned, so the sparks stay within the show's budget
  if (pts.length > 2600) { for (let i = pts.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pts[i], pts[j]] = [pts[j], pts[i]]; } pts = pts.slice(0, 2600); }
  // which word each point belongs to, by the gaps between letters' x-ranges (for the colours)
  const words = text.split(' ');
  const widths = words.map((w) => g.measureText(w).width), space = g.measureText(' ').width;
  const total = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1);
  let x0 = c.width / 2 - total / 2; const spans = [];
  widths.forEach((w) => { spans.push([x0, x0 + w]); x0 += w + space; });
  const aspect = c.width / c.height;
  let H = 192 / 128 * 5.5, W = H * aspect;
  if (W > 60) { W = 60; H = W / aspect; }
  return { pts: pts.map(([u, v, px]) => ({ u, v, w: Math.max(0, spans.findIndex((s) => px <= s[1] + space / 2)) })), aspect, W, H };
}

export class Fireworks {
  constructor(scene) {
    this.active = false;
    this.n = 0;
    const F = (k) => new Float32Array(MAX * k);
    this.p = { x: F(1), y: F(1), z: F(1), vx: F(1), vy: F(1), vz: F(1), r: F(1), g: F(1), b: F(1), size: F(1), age: F(1), life: F(1), kind: new Uint8Array(MAX), tx: F(1), ty: F(1), tz: F(1), ph: F(1), drag: F(1) };
    this.pos = new THREE.BufferAttribute(F(3), 3).setUsage(THREE.DynamicDrawUsage);
    this.col = new THREE.BufferAttribute(F(3), 3).setUsage(THREE.DynamicDrawUsage);
    this.siz = new THREE.BufferAttribute(F(1), 1).setUsage(THREE.DynamicDrawUsage);
    this.alp = new THREE.BufferAttribute(F(1), 1).setUsage(THREE.DynamicDrawUsage);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', this.pos); geo.setAttribute('aColor', this.col); geo.setAttribute('aSize', this.siz); geo.setAttribute('aAlpha', this.alp);
    geo.setDrawRange(0, 0);
    this.material = new THREE.ShaderMaterial({ uniforms: { uPixelRatio: { value: 1 } }, vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false; this.points.visible = false;
    scene.add(this.points);
    this.rockets = [];
    this.nextLaunch = 0; this.nextText = 0; this.clock = 0; this.running = false;
    this.texts = null; this.textIndex = -1;
    // launch sites down on the meadow, out over the grassland from the gallery
    this.sites = [[-52, -26], [-58, -8], [-54, 8], [-62, -18], [-48, -40]].map(([lx, lz]) => { const [x, z] = toWorld(lx, lz); return { x, y: SITE.H0 - 1.4, z }; });
    const [tx, tz] = toWorld(-76, -8); this.textAt = { x: tx, y: SITE.H0 + 26, z: tz };
  }

  spawn(x, y, z, vx, vy, vz, col, size, life, kind, drag = 0.985) {
    if (this.n >= MAX) return -1;
    const i = this.n++, p = this.p;
    p.x[i] = x; p.y[i] = y; p.z[i] = z; p.vx[i] = vx; p.vy[i] = vy; p.vz[i] = vz;
    p.r[i] = col[0]; p.g[i] = col[1]; p.b[i] = col[2];
    p.size[i] = size; p.age[i] = 0; p.life[i] = life; p.kind[i] = kind; p.ph[i] = Math.random() * 6.28; p.drag[i] = drag;
    return i;
  }

  launch(type) {
    const s = pick(this.sites);
    this.rockets.push({ x: s.x + rand(-3, 3), y: s.y, z: s.z + rand(-3, 3), vx: rand(-2.5, 2.5), vy: rand(22, 27), vz: rand(-2.5, 2.5), fuse: rand(1.9, 2.3), t: 0, type, col: pick(PALETTE) });
  }

  burst(r, onBoom) {
    const col = r.col, white = [1, 0.97, 0.9];
    const sphere = (n, v0, v1, size, life, c, drag, trails) => {
      for (let k = 0; k < n; k++) {
        const u = Math.random() * 2 - 1, a = Math.random() * 6.283, s = Math.sqrt(1 - u * u), v = rand(v0, v1);
        const cc = Math.random() < 0.12 ? white : c;
        this.spawn(r.x, r.y, r.z, s * Math.cos(a) * v, u * v, s * Math.sin(a) * v, cc, size, rand(life * 0.8, life * 1.2), trails ? 3 : 0, drag);
      }
    };
    if (r.type === 'peony') sphere(340, 14, 20, 0.9, 2.2, col, 0.985, false);
    else if (r.type === 'chrys') sphere(240, 13, 19, 0.85, 2.6, col, 0.985, true);
    else if (r.type === 'willow') sphere(260, 8, 12, 0.75, 4.2, [1.0, 0.82, 0.4], 0.992, true);
    else if (r.type === 'ring') {
      const ax = Math.random() * 6.283, ay = rand(-0.6, 0.6), ca = Math.cos(ax), sa = Math.sin(ax), cb = Math.cos(ay), sb = Math.sin(ay);
      for (let k = 0; k < 150; k++) {
        const a = k / 150 * 6.283, v = rand(15, 17), px = Math.cos(a) * v, py = Math.sin(a) * v;
        const x1 = px * ca - py * sa * sb, y1 = py * cb, z1 = px * sa + py * ca * sb;
        this.spawn(r.x, r.y, r.z, x1, y1, z1, col, 0.95, rand(1.8, 2.4), 0, 0.985);
      }
      sphere(60, 4, 8, 0.7, 1.4, white, 0.98, false);
    } else if (r.type === 'crackle') sphere(260, 12, 18, 0.8, 2.0, col, 0.985, false), this.crackleAt = { x: r.x, y: r.y, z: r.z, t: 1.4, c: col };
    if (onBoom) onBoom({ x: r.x, y: r.y, z: r.z }, r.type === 'willow' ? 1.3 : 1);
  }

  // the words, laid out in the sky to face the viewer: the sparks fly out from a volley of three bursts to their places
  writeText(cam, onBoom) {
    if (!this.texts) this.texts = MESSAGES.map(sampleText);
    this.textIndex = (this.textIndex + 1) % this.texts.length;
    const text = this.texts[this.textIndex], T = this.textAt, W = text.W, H = text.H;
    let fx = cam.x - T.x, fz = cam.z - T.z; const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
    const rx = fz, rz = -fx;   // the viewer's right (looking from the camera towards the text)
    for (const q of text.pts) {
      const ox = (q.u - 0.5) * W, oy = (0.5 - q.v) * H;
      const tx = T.x + rx * ox, ty = T.y + oy, tz = T.z + rz * ox;
      // each spark starts at one of three burst points along the line and flies to its letter
      const b = Math.round(q.u * 2) - 1, bx = T.x + rx * b * W * 0.3, bz = T.z + rz * b * W * 0.3;
      const i = this.spawn(bx + rand(-0.5, 0.5), T.y + rand(-0.5, 0.5), bz + rand(-0.5, 0.5), 0, 0, 0, WORD_COLORS[q.w % WORD_COLORS.length], 0.9, rand(6.5, 8), 2, 1);
      if (i < 0) break;
      this.p.tx[i] = tx + rand(-0.25, 0.25); this.p.ty[i] = ty + rand(-0.25, 0.25); this.p.tz[i] = tz + rand(-0.25, 0.25);
    }
    if (onBoom) for (const b of [-1, 0, 1]) onBoom({ x: T.x + rx * b * W * 0.3, y: T.y, z: T.z + rz * b * W * 0.3 }, 1.2);
  }

  update(dt, time, cam, onBoom) {
    if (this.active && !this.running) { this.running = true; this.clock = 0; this.nextLaunch = 0.4; this.nextText = 5; }
    if (!this.active) this.running = false;
    if (!this.running && this.n === 0 && !this.rockets.length) { this.points.visible = false; return; }
    this.points.visible = true;
    if (this.running) {
      this.clock += dt;
      this.nextLaunch -= dt;
      if (this.nextLaunch <= 0) {
        const volley = Math.random() < 0.18 ? 3 : 1;
        for (let k = 0; k < volley; k++) this.launch(pick(['peony', 'peony', 'chrys', 'willow', 'ring', 'crackle']));
        this.nextLaunch = volley > 1 ? rand(2.2, 3.2) : rand(0.7, 1.6);
      }
      this.nextText -= dt;
      if (this.nextText <= 0) { this.writeText(cam, onBoom); this.nextText = 15; }
    }
    // rockets: up on a trail, then the burst
    for (let k = this.rockets.length - 1; k >= 0; k--) {
      const r = this.rockets[k];
      r.t += dt; r.vy -= GRAV * 2.2 * dt; r.x += r.vx * dt; r.y += r.vy * dt; r.z += r.vz * dt;
      for (let j = 0; j < 3; j++) this.spawn(r.x + rand(-0.15, 0.15), r.y - j * 0.25, r.z + rand(-0.15, 0.15), rand(-0.6, 0.6), rand(-2, 0), rand(-0.6, 0.6), [1.0, 0.75, 0.35], 0.5, rand(0.3, 0.6), 1, 0.97);
      if (r.t >= r.fuse) { this.burst(r, onBoom); this.rockets.splice(k, 1); }
    }
    // the crackle: a scatter of tiny white pops around a burst for a moment
    if (this.crackleAt) { const c = this.crackleAt; c.t -= dt; for (let j = 0; j < 6; j++) { const u = Math.random() * 2 - 1, a = Math.random() * 6.283, s = Math.sqrt(1 - u * u), d = rand(6, 16); this.spawn(c.x + s * Math.cos(a) * d, c.y + u * d - (1.4 - c.t) * 4, c.z + s * Math.sin(a) * d, 0, 0, 0, [1, 1, 0.95], 0.7, 0.18, 1, 1); } if (c.t <= 0) this.crackleAt = null; }
    // every spark
    const p = this.p;
    let n = this.n;
    for (let i = 0; i < n; i++) {
      p.age[i] += dt;
      if (p.age[i] >= p.life[i]) { n--; this.move(n, i); i--; continue; }
      const k = p.kind[i];
      if (k === 2) {
        // text: fly to the letter over the first 0.9 s, hang and twinkle, then let go and sink
        const a = p.age[i];
        if (a < 0.9) { const e = 1 - Math.pow(1 - a / 0.9, 3), f = 1 - Math.pow(1 - Math.min(1, (a + dt) / 0.9), 3); const s = (f - e) / Math.max(1e-4, 1 - e); p.x[i] += (p.tx[i] - p.x[i]) * s; p.y[i] += (p.ty[i] - p.y[i]) * s; p.z[i] += (p.tz[i] - p.z[i]) * s; }
        else if (a > p.life[i] - 2.4) { p.vy[i] -= GRAV * 0.5 * dt; p.x[i] += Math.sin(time * 1.3 + p.ph[i]) * 0.3 * dt; p.y[i] += p.vy[i] * dt; }
        continue;
      }
      const d = Math.pow(p.drag[i], dt * 60);
      p.vx[i] *= d; p.vz[i] *= d; p.vy[i] = p.vy[i] * d - GRAV * dt;
      p.x[i] += p.vx[i] * dt; p.y[i] += p.vy[i] * dt; p.z[i] += p.vz[i] * dt;
      if (k === 3 && p.age[i] < 1.3 && Math.random() < 0.3) this.spawn(p.x[i], p.y[i], p.z[i], 0, -0.5, 0, [p.r[i], p.g[i], p.b[i]], 0.4, 0.45, 1, 1);
    }
    this.n = n;
    // to the GPU
    const P = this.pos.array, C = this.col.array, S = this.siz.array, A = this.alp.array;
    for (let i = 0; i < n; i++) {
      P[i * 3] = p.x[i]; P[i * 3 + 1] = p.y[i]; P[i * 3 + 2] = p.z[i];
      C[i * 3] = p.r[i]; C[i * 3 + 1] = p.g[i]; C[i * 3 + 2] = p.b[i];
      const u = p.age[i] / p.life[i], k = p.kind[i];
      let a = k === 1 ? 1 - u : k === 2 ? (u < 0.1 ? 1 : 0.6 + 0.4 * Math.sin(time * 11 + p.ph[i] * 7) * (Math.random() < 0.03 ? 2.5 : 1)) * (1 - Math.pow(u, 6)) : Math.min(1, (1 - u) * 1.6) * (0.75 + 0.25 * Math.sin(time * 16 + p.ph[i]));
      A[i] = Math.max(0, Math.min(1, a));
      S[i] = p.size[i] * (k === 2 ? 1 : 1 - 0.4 * u);
    }
    this.pos.needsUpdate = true; this.col.needsUpdate = true; this.siz.needsUpdate = true; this.alp.needsUpdate = true;
    this.points.geometry.setDrawRange(0, n);
  }

  move(from, to) {
    if (from === to) return;
    const p = this.p;
    for (const key of Object.keys(p)) p[key][to] = p[key][from];
  }
}
