import * as THREE from 'three';
import { heightAt } from './terrain.js';
import { toLocal, onPlatform, onStairs } from './siteConst.js';

// 萤火虫 — fireflies over the grassland in the evenings. Small yellow-green lights that drift low over the grass
// around you, each blinking to its own slow rhythm; they come out as the sun goes down and are gone by day.
// They keep off the gallery's platform, so from the terrace you see them out over the meadow.

const RANGE = 22;   // further than this from you and a firefly moves on, to reappear ahead

const vert = /* glsl */ `
attribute float aGlow;
attribute float aSize;
uniform float uPixelRatio;
varying float vGlow;
void main() {
  vGlow = aGlow;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = min(aSize * (10.0 / max(-mv.z, 1.0)), 70.0) * uPixelRatio;
  gl_Position = projectionMatrix * mv;
}
`;
const frag = /* glsl */ `
varying float vGlow;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float r = length(q) * 2.0;
  float halo = pow(max(0.0, 1.0 - r), 2.2);
  float core = smoothstep(0.32, 0.0, r);
  float a = (halo * 0.7 + core) * vGlow;
  vec3 col = mix(vec3(0.72, 1.0, 0.38), vec3(1.0, 1.0, 0.8), core * 0.6);
  gl_FragColor = vec4(col, a);
}
`;

export class Fireflies {
  constructor(scene, count = 120) {
    this.count = count;
    this.list = [];
    this.night = 0;
    const geo = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.glow = new THREE.BufferAttribute(new Float32Array(count), 1).setUsage(THREE.DynamicDrawUsage);
    this.size = new THREE.BufferAttribute(new Float32Array(count), 1);
    geo.setAttribute('position', this.pos);
    geo.setAttribute('aGlow', this.glow);
    geo.setAttribute('aSize', this.size);
    const mat = new THREE.ShaderMaterial({ uniforms: { uPixelRatio: { value: 1 } }, vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.material = mat;
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
    scene.add(this.points);
  }

  // somewhere on the meadow near you (never up on the platform or the steps)
  place(f, cam, fx, fz, near) {
    for (let k = 0; k < 12; k++) {
      const a = near ? Math.random() * Math.PI * 2 : Math.atan2(fx, fz) + (Math.random() * 2 - 1) * 1.4;
      const r = near ? 2 + Math.random() * (RANGE - 4) : 9 + Math.random() * (RANGE - 10);
      const x = cam.x + Math.sin(a) * r, z = cam.z + Math.cos(a) * r;
      const [lx, lz] = toLocal(x, z);
      if (onPlatform(lx, lz) || onStairs(lx, lz)) continue;
      f.x = x; f.z = z; f.hidden = false;
      f.h = 0.25 + Math.random() * 1.2;
      f.heading = Math.random() * Math.PI * 2;
      f.grow = near ? 1 : 0;
      return;
    }
    f.hidden = true;
  }

  update(dt, time, cam, fx, fz, night) {
    this.night = night;
    if (night < 0.01) { this.points.visible = false; return; }
    this.points.visible = true;
    while (this.list.length < this.count) {
      const i = this.list.length;
      const f = {
        speed: 0.25 + Math.random() * 0.35, turn: Math.random() * 100, phase: Math.random() * 100,
        period: 1.6 + Math.random() * 2.6, duty: 0.25 + Math.random() * 0.3, twin: Math.random() < 0.3,
      };
      this.size.setX(i, 11 + Math.random() * 8);
      this.place(f, cam, fx, fz, true);
      this.list.push(f);
    }
    this.size.needsUpdate = true;
    this.list.forEach((f, i) => {
      const dc = Math.hypot(f.x - cam.x, f.z - cam.z);
      if (f.hidden || dc > RANGE) {
        f.retry = (f.retry || 0) - dt;
        if (f.retry < 0) { this.place(f, cam, fx, fz, false); f.retry = 0.4; }
        if (f.hidden) { this.glow.setX(i, 0); return; }
      }
      // a slow wander: the heading drifts, the height bobs
      f.turn += dt;
      f.heading += (Math.sin(f.turn * 0.7 + f.phase) * 0.9 + Math.sin(f.turn * 1.9) * 0.4) * dt;
      f.x += Math.sin(f.heading) * f.speed * dt;
      f.z += Math.cos(f.heading) * f.speed * dt;
      f.grow = Math.min(1, f.grow + dt * 0.8);
      const y = heightAt(f.x, f.z) + f.h + Math.sin(time * 0.9 + f.phase) * 0.12;
      this.pos.setXYZ(i, f.x, y, f.z);
      // the blink: a soft pulse for part of each period; some flash twice in a row
      const u = ((time + f.phase) % f.period) / f.period;
      let b = Math.max(0, Math.sin(Math.PI * Math.min(1, u / f.duty)));
      if (f.twin) { const u2 = (u - f.duty * 1.3) / (f.duty * 0.7); if (u2 > 0 && u2 < 1) b = Math.max(b, Math.sin(Math.PI * u2) * 0.8); }
      const fade = Math.min(1, (RANGE - dc) / 4);   // gone gently at the edge of the range
      this.glow.setX(i, Math.pow(b, 1.5) * f.grow * fade * night);
    });
    this.pos.needsUpdate = true;
    this.glow.needsUpdate = true;
  }
}
