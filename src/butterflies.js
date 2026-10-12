import * as THREE from 'three';
import { COMMON } from './shaders.js';
import { heightAt } from './terrain.js';
import { vnoiseTex } from './noiseTexture.js';
import { smoothstep } from './noise.js';
import { toLocal, onPlatform } from './siteConst.js';

// A handful of butterflies over the meadow, in place of the bumblebees of the original. They drift from flower to
// flower in a bouncing, dithering flight, rest a while with their wings slowly opening and closing, and only ever
// show up where the wildflowers grow (the same distribution the flowers use). Silent — nothing for the soundscape.

// as flowerCover in shaders.js
function flowerCover(x, z, amount) {
  const clump = vnoiseTex(x * 0.06 + 2, z * 0.06 + 2) * 0.55 + vnoiseTex(x * 0.17 + 7, z * 0.17 + 7) * 0.3 + vnoiseTex(x * 0.6, z * 0.6) * 0.15;
  return smoothstep(0.62 - 0.22 * amount, 0.74 - 0.18 * amount, clump) * Math.min(1, amount * 1.4);
}

const vert = /* glsl */ `
${COMMON}
attribute float aPart;      // 0 = body, 1 = wing
attribute float aSide;      // wing: -1 left, 1 right
attribute vec3 aColor;      // per butterfly
attribute float aFlap;      // per butterfly: 1 flying (fast, deep beats), 0 resting (slow breathing)
attribute float aPhase;
attribute float aKind;      // per butterfly: which wing pattern
varying vec3 vN;
varying vec3 vWorld;
varying vec2 vW;            // wing-local: span (0..1.6) and along the body
varying float vPart;
varying vec3 vCol;
varying float vKind;
varying float vZ;
void main() {
  vec3 p = position;
  vec3 n = normal;
  vW = vec2(abs(p.x), p.z);
  vKind = aKind;
  vZ = p.z;
  if (aPart > 0.5 && aPart < 1.5) {
    // the wings hinge on the body's long axis: deep fast beats in flight, a slow half-open sway at rest
    float fly = sin(uTime * 14.0 + aPhase) * 1.15 + 0.1;
    float rest = 0.95 + sin(uTime * 1.6 + aPhase) * 0.35;
    float a = mix(rest, fly, aFlap);
    float c = cos(a), s = sin(a);
    vec2 q = vec2(abs(p.x), p.y);
    q = vec2(q.x * c - q.y * s, q.x * s + q.y * c);
    p = vec3(q.x * aSide, q.y, p.z);
    n = normalize(vec3(-s * aSide, c, 0.0));
  }
  vPart = aPart;
  vCol = aColor;
  vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.0);
  vN = normalize(mat3(modelMatrix * instanceMatrix) * n);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const frag = /* glsl */ `
${COMMON}
varying vec3 vN;
varying vec3 vWorld;
varying vec2 vW;
varying float vPart;
varying vec3 vCol;
varying float vKind;
varying float vZ;
void main() {
  vec3 alb;
  float alpha = 1.0;
  if (vPart > 1.5) {
    alb = vec3(0.1, 0.07, 0.05);   // antennae
  } else if (vPart > 0.5) {
    // the wing: the butterfly's own colour with the markings of its kind
    float span = vW.x, along = vW.y;
    float s = span / 1.55;                     // 0 at the body, 1 at the tip
    float edge = smoothstep(1.2, 1.55, span) + smoothstep(0.6, 0.78, abs(along + 0.05)) * step(0.25, span);   // the outer margin
    edge = clamp(edge, 0.0, 1.0);
    vec3 black = vec3(0.06, 0.05, 0.05);
    vec3 dark = vCol * 0.22;
    int kind = int(vKind + 0.5);
    float vein = smoothstep(0.035, 0.0, abs(sin(along * 7.0 + span * 1.5)) - 0.02) * step(0.2, span);
    if (kind == 0) {
      // monarch: orange panes between black veins, a black margin with two rows of white dots
      float rim = clamp(smoothstep(1.05, 1.3, span) + smoothstep(0.52, 0.68, abs(along + 0.05)) * step(0.25, span), 0.0, 1.0);
      alb = mix(vCol, black, max(vein * 0.9, rim));
      vec2 g = vec2(s * 9.0, (along + 0.75) * 5.5);
      float dots = smoothstep(0.2, 0.12, length(fract(g) - 0.5)) * rim;
      alb = mix(alb, vec3(0.97, 0.95, 0.9), dots);
      alb = mix(alb, vCol * 0.85, smoothstep(0.35, 0.0, s) * (1.0 - rim));
    } else if (kind == 1) {
      // morpho: electric blue, brighter towards the middle, a wide black margin, no veins
      float rim = clamp(smoothstep(0.95, 1.3, span) + smoothstep(0.5, 0.7, abs(along + 0.05)) * step(0.2, span), 0.0, 1.0);
      vec3 blue = mix(vCol * 1.3 + vec3(0.1, 0.15, 0.2), vCol * 0.8, s);
      alb = mix(blue, black, rim);
      alb = mix(alb, black, smoothstep(0.08, 0.0, s));
    } else if (kind == 2) {
      // swallowtail: yellow with black bands across the wing, blue scallops and an orange spot by the tail
      float bands = smoothstep(0.045, 0.02, abs(fract(s * 2.6 + 0.3) - 0.5) - 0.1) * step(0.12, s);
      float rim = clamp(smoothstep(1.2, 1.45, span) + smoothstep(0.58, 0.72, abs(along + 0.05)) * step(0.25, span), 0.0, 1.0);
      alb = mix(vCol, black, max(bands * 0.9, rim));
      vec2 g = vec2(s * 7.0, (along + 0.75) * 4.0);
      float scallop = smoothstep(0.26, 0.16, length(fract(g) - 0.5)) * smoothstep(0.55, 0.75, s) * step(along, -0.3);
      alb = mix(alb, vec3(0.35, 0.55, 0.95), scallop);
      float tailSpot = smoothstep(0.1, 0.06, distance(vW, vec2(0.6, -0.62)));
      alb = mix(alb, vec3(0.95, 0.45, 0.1), tailSpot);
      alb = mix(alb, black, vein * 0.25);
    } else if (kind == 3) {
      // cabbage white: white with a black wingtip and one black dot on each wing
      float tip = smoothstep(0.78, 0.9, s) * smoothstep(0.1, 0.35, along);
      float spot = smoothstep(0.08, 0.05, distance(vW, vec2(0.95, 0.2)));
      alb = mix(vCol, black, max(tip, spot));
      alb = mix(alb, vec3(0.75, 0.72, 0.6), vein * 0.3);
    } else if (kind == 4) {
      // peacock: red-brown with one big eyespot on each wing, ringed black and blue with a cream fleck
      float d = distance(vW * vec2(1.0, 1.3), vec2(1.02, 0.15) * vec2(1.0, 1.3));
      float ring1 = smoothstep(0.3, 0.27, d), ring2 = smoothstep(0.21, 0.18, d), ring3 = smoothstep(0.13, 0.1, d), fleck = smoothstep(0.05, 0.03, distance(vW, vec2(0.96, 0.22)));
      alb = mix(vCol, black, max(edge, vein * 0.3));
      alb = mix(alb, vec3(0.95, 0.85, 0.5), ring1);
      alb = mix(alb, black, ring2);
      alb = mix(alb, vec3(0.3, 0.45, 0.85), ring3);
      alb = mix(alb, vec3(0.96, 0.94, 0.85), fleck);
    } else {
      // the plain kinds: a dark margin, faint veins, a small eyespot, paler towards the body
      vec2 eye = vec2(0.98, 0.05);
      float d = distance(vW * vec2(1.0, 1.4), eye * vec2(1.0, 1.4));
      float spot = smoothstep(0.2, 0.16, d), pupil = smoothstep(0.08, 0.05, d);
      alb = mix(vCol, dark, edge);
      alb = mix(alb, dark * 0.9, vein * 0.35);
      alb = mix(alb, dark, spot);
      alb = mix(alb, vec3(0.95, 0.93, 0.85), pupil);
      alb = mix(alb, alb * 1.25 + 0.05, smoothstep(0.5, 0.2, span) * (1.0 - spot));
    }
    alpha = 0.96;
  } else {
    // the body: dark, banded along its length
    float band = 0.85 + 0.3 * step(0.5, fract(vZ * 10.0));
    alb = vec3(0.12, 0.08, 0.06) * band;
  }
  vec3 N = normalize(vN);
  float cs = cloudShadow(vWorld.xz);
  float ss = sunShadowFast(vWorld);
  float k = smoothstep(0.25, 0.45, ss * clamp(abs(dot(N, uSunDir)) * 0.7 + 0.35, 0.0, 1.0)) * cs;
  vec3 toon = mix(alb * 0.45 / uExposure + uToonShadow * 0.25, alb * 1.2 / uExposure, k);
  vec3 real = alb * (ambient(N) + uSunColor * abs(dot(N, uSunDir)) * ss * cs);
  gl_FragColor = vec4(applyFog(mix(real, toon, uToonMix), vWorld), alpha);
}
`;

function butterflyGeometry() {
  // a slim body along z, two wings on each side (fore and hind) with rounded outlines, and two antennae
  const body = new THREE.SphereGeometry(1, 10, 8).toNonIndexed();
  body.scale(0.15, 0.15, 0.62);
  const pos = Array.from(body.attributes.position.array);
  const nor = Array.from(body.attributes.normal.array);
  const part = new Array(pos.length / 3).fill(0);
  const side = new Array(pos.length / 3).fill(0);
  // the outlines, as smooth curves through a few points, fanned from the wing root
  const smooth = (pts, n) => { const c = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(q[0], 0, q[1])), true, 'centripetal'); return c.getPoints(n); };
  const fore = smooth([[0.08, 0.1], [0.5, 0.42], [1.05, 0.62], [1.42, 0.5], [1.55, 0.28], [1.45, 0.02], [1.2, -0.1], [0.6, -0.12], [0.08, -0.12]], 26);
  const hind = smooth([[0.08, -0.1], [0.6, -0.14], [1.2, -0.18], [1.25, -0.42], [1.0, -0.62], [0.65, -0.76], [0.35, -0.7], [0.08, -0.5]], 22);
  for (const sd of [-1, 1]) {
    for (const [w, root] of [[fore, [0.08, 0.0]], [hind, [0.08, -0.3]]]) {
      for (let i = 0; i < w.length; i++) {
        const a = w[i], b = w[(i + 1) % w.length];
        for (const v of [[root[0], root[1]], [a.x, a.z], [b.x, b.z]]) { pos.push(v[0] * sd, 0, v[1]); nor.push(0, 1, 0); part.push(1); side.push(sd); }
      }
    }
    // an antenna: a thin sliver forward and outward from the head, with a little club at the end
    for (const v of [[0.02 * sd, 0.05, 0.6], [0.26 * sd, 0.2, 0.95], [0.04 * sd, 0.06, 0.6]]) { pos.push(v[0], v[1], v[2]); nor.push(0, 1, 0); part.push(2); side.push(sd); }
    for (const v of [[0.24 * sd, 0.2, 0.93], [0.3 * sd, 0.22, 0.99], [0.27 * sd, 0.18, 0.96]]) { pos.push(v[0], v[1], v[2]); nor.push(0, 1, 0); part.push(2); side.push(sd); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
  return g;
}

const PALETTE = [   // colour and the kind of markings (see the fragment shader)
  [0.98, 0.55, 0.1, 0],    // monarch
  [0.22, 0.48, 0.98, 1],   // blue morpho
  [0.98, 0.86, 0.3, 2],    // swallowtail
  [0.72, 0.28, 0.16, 4],   // peacock
  [0.97, 0.96, 0.9, 3],    // cabbage white
  [0.65, 0.45, 0.85, 5],   // lilac
  [0.35, 0.75, 0.55, 5],   // green
];
const RANGE = 16;   // further than this from you and the butterfly moves on, to reappear ahead

export class Butterflies {
  constructor(scene, U, tuning, count = 5) {
    this.tuning = tuning;
    this.count = count;
    this.list = [];
    const geo = butterflyGeometry();
    this.colors = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    this.flap = new THREE.InstancedBufferAttribute(new Float32Array(count), 1); this.flap.setUsage(THREE.DynamicDrawUsage);
    this.phase = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
    this.kind = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
    geo.setAttribute('aColor', this.colors);
    geo.setAttribute('aFlap', this.flap);
    geo.setAttribute('aPhase', this.phase);
    geo.setAttribute('aKind', this.kind);
    const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: vert, fragmentShader: frag, side: THREE.DoubleSide, transparent: true });
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    scene.add(this.mesh);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ');
    this._s = new THREE.Vector3(); this._p = new THREE.Vector3();
  }

  get amount() { return this.tuning.grass.flowers; }

  findFlower(x, z, r0, r1, dirX = 0, dirZ = 0, spread = Math.PI) {
    const base = dirX || dirZ ? Math.atan2(dirX, dirZ) : 0;
    let best = null, bc = 0;
    for (let k = 0; k < 14; k++) {
      const a = base + (Math.random() * 2 - 1) * spread, r = r0 + Math.random() * (r1 - r0);
      const px = x + Math.sin(a) * r, pz = z + Math.cos(a) * r;
      if (onPlatform(...toLocal(px, pz))) continue;   // no flowers on the gallery's platform
      const c = flowerCover(px, pz, this.amount);
      if (c > 0.25) return { x: px, z: pz };
      if (c > bc) { bc = c; best = { x: px, z: pz }; }
    }
    return best;
  }

  spawn(b, cam, fx, fz, near) {
    const spot = this.findFlower(cam.x, cam.z, near ? 2 : 7, near ? RANGE - 3 : RANGE - 1, fx, fz, near ? Math.PI : 1.6);
    if (!spot || flowerCover(spot.x, spot.z, this.amount) < 0.1) { b.hidden = true; return; }
    b.hidden = false;
    b.x = spot.x; b.z = spot.z; b.y = heightAt(spot.x, spot.z) + 0.58 + Math.random() * 0.2;   // on the flower heads, above the grass
    b.tx = b.x; b.tz = b.z; b.ty = b.y;
    b.vx = b.vz = b.vy = 0;
    b.state = 'rest'; b.flap = 0;
    b.t = 1 + Math.random() * 4;
    b.grow = near ? 1 : 0;
  }

  update(dt, time, cam, fx, fz) {
    if (this.amount < 0.02) { this.mesh.count = 0; this.list.length = 0; return; }
    while (this.list.length < this.count) {
      const i = this.list.length;
      const b = { size: 0.85 + Math.random() * 0.35, phase: Math.random() * 100, phase0: Math.random() * 100, heading: Math.random() * 6.28, speed: 0.55 + Math.random() * 0.5, flap: 0 };
      const col = PALETTE[i % PALETTE.length];
      this.colors.setXYZ(i, col[0], col[1], col[2]); this.colors.needsUpdate = true;
      this.kind.setX(i, col[3]); this.kind.needsUpdate = true;
      this.phase.setX(i, b.phase0); this.phase.needsUpdate = true;
      this.spawn(b, cam, fx, fz, true);
      this.list.push(b);
    }
    let n = 0;
    this.list.forEach((b, i) => {
      const dc = Math.hypot(b.x - cam.x, b.z - cam.z);
      if (b.hidden || dc > RANGE) {
        b.retry = (b.retry || 0) - dt;
        if (b.retry < 0) { this.spawn(b, cam, fx, fz, false); b.retry = 0.5; }
        if (b.hidden) return;
      }
      b.grow = Math.min(1, b.grow + dt * 1.5);
      b.phase += dt;
      if (b.state === 'rest') {
        b.t -= dt;
        b.x += (b.tx - b.x) * (1 - Math.exp(-dt * 4));
        b.y += (b.ty - b.y) * (1 - Math.exp(-dt * 4));
        b.z += (b.tz - b.z) * (1 - Math.exp(-dt * 4));
        b.vx = b.vy = b.vz = 0;
        b.flap += (0 - b.flap) * (1 - Math.exp(-dt * 6));
        if (b.t < 0) {
          const spot = this.findFlower(b.x, b.z, 1.5, 6);
          if (spot) {
            b.tx = spot.x; b.tz = spot.z; b.ty = heightAt(spot.x, spot.z) + 0.58 + Math.random() * 0.2;
            b.state = 'fly'; b.d0 = Math.hypot(b.tx - b.x, b.tz - b.z) + 1e-3; b.lift = 0.6 + Math.random() * 1.0;
          } else b.t = 1;
        }
      } else {
        // a bouncing, wandering flight: it rises first, dithers sideways, then settles on the next flower
        const dx = b.tx - b.x, dz = b.tz - b.z, d = Math.hypot(dx, dz) + 1e-4;
        const prog = 1 - Math.min(1, d / b.d0);
        const sp = b.speed * Math.min(1, d * 1.5 + 0.3);
        const wob = Math.sin(b.phase * 4.2) * 0.8 + Math.sin(b.phase * 2.3 + 1) * 0.5;
        const wx = dx / d + (-dz / d) * wob * 0.6, wz = dz / d + (dx / d) * wob * 0.6;
        const k = 1 - Math.exp(-dt * 3);
        b.vx += (wx * sp - b.vx) * k;
        b.vz += (wz * sp - b.vz) * k;
        const ty = b.ty + Math.sin(prog * Math.PI) * b.lift + Math.sin(b.phase * 9) * 0.08;
        b.vy = (ty - b.y) * 3;
        const ex = b.x - cam.x, ez = b.z - cam.z, ed = Math.hypot(ex, ez) + 1e-4;
        if (ed < 1.2) { b.vx += (ex / ed) * (1.2 - ed) * 2.5; b.vz += (ez / ed) * (1.2 - ed) * 2.5; }
        b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
        b.flap += (1 - b.flap) * (1 - Math.exp(-dt * 6));
        if (d < 0.08) { b.state = 'rest'; b.t = 2 + Math.random() * 6; }
      }
      const sp = Math.hypot(b.vx, b.vz);
      if (sp > 0.05) {
        const target = Math.atan2(b.vx, b.vz);
        let da = target - b.heading;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        b.heading += da * (1 - Math.exp(-dt * 6));
      }
      const bank = sp > 0.05 ? Math.sin(b.phase * 4.2) * 0.35 : 0;
      const pitch = b.state === 'fly' ? -0.15 + Math.sin(b.phase * 9) * 0.12 : 0.1;
      this._e.set(pitch, b.heading, bank);
      this._q.setFromEuler(this._e);
      const g = b.size * b.grow * 0.06;
      this._s.set(g, g, g);
      this._p.set(b.x, b.y, b.z);
      this._m.compose(this._p, this._q, this._s);
      this.mesh.setMatrixAt(n, this._m);
      this.flap.setX(n, b.flap);
      const pc = PALETTE[i % PALETTE.length];
      this.colors.setXYZ(n, pc[0], pc[1], pc[2]);
      this.kind.setX(n, pc[3]);
      this.phase.setX(n, b.phase0);
      n++;
    });
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.flap.needsUpdate = true; this.colors.needsUpdate = true; this.phase.needsUpdate = true; this.kind.needsUpdate = true;
  }

  // butterflies make no sound: nothing for the bee voices
  nearest() { return []; }
}
