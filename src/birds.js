import * as THREE from 'three';
import { COMMON } from './shaders.js';
import { toWorld, SITE } from './siteConst.js';

// Swallows over the meadow by day: a handful wheeling in long loops above the grass and the terrace, flapping in
// bursts and gliding between, banking into the turns. Dark steel-blue above, cream below, forked tails.
// They fade out as the light goes (the owl takes the night shift, in gallery.js).

const vert = /* glsl */ `
${COMMON}
attribute float aPart;      // 0 body, 1 wing, 2 tail
attribute float aSide;
attribute float aFlap;      // per bird: 1 flapping, 0 gliding
attribute float aPhase;
varying vec3 vN;
varying vec3 vWorld;
varying float vBelly;
void main() {
  vec3 p = position;
  vec3 n = normal;
  if (aPart > 0.5 && aPart < 1.5) {
    // the wings beat about the body's long axis; a glide holds them in a shallow V
    float beat = sin(uTime * 15.0 + aPhase) * 0.8;
    float a = mix(0.18, beat, aFlap);
    float c = cos(a), s = sin(a);
    vec2 q = vec2(abs(p.x), p.y);
    q = vec2(q.x * c - q.y * s, q.x * s + q.y * c);
    p = vec3(q.x * aSide, q.y, p.z);
    n = normalize(vec3(-s * aSide, c, 0.0));
  }
  vBelly = aPart < 0.5 ? smoothstep(0.2, -0.4, normalize(position).y) : 0.0;
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
varying float vBelly;
void main() {
  vec3 alb = mix(vec3(0.04, 0.05, 0.09), vec3(0.9, 0.84, 0.72), vBelly);
  vec3 N = normalize(vN);
  float k = clamp(abs(dot(N, uSunDir)) * 0.35 + 0.2, 0.0, 1.0);
  vec3 col = alb * (ambient(N) + uSunColor * k);
  gl_FragColor = vec4(applyFog(col, vWorld), 1.0);
}
`;

function swallowGeometry() {
  const body = new THREE.SphereGeometry(1, 8, 6).toNonIndexed();
  body.scale(0.04, 0.04, 0.12);
  const pos = Array.from(body.attributes.position.array);
  const nor = Array.from(body.attributes.normal.array);
  const part = new Array(pos.length / 3).fill(0);
  const side = new Array(pos.length / 3).fill(0);
  const tri = (a, b, c, pt, sd) => { for (const v of [a, b, c]) { pos.push(v[0], v[1], v[2]); nor.push(0, 1, 0); part.push(pt); side.push(sd); } };
  for (const sd of [-1, 1]) {
    // a long, swept, pointed wing in two panels
    tri([0.03 * sd, 0, 0.04], [0.16 * sd, 0, 0.02], [0.05 * sd, 0, -0.05], 1, sd);
    tri([0.16 * sd, 0, 0.02], [0.3 * sd, 0, -0.1], [0.1 * sd, 0, -0.06], 1, sd);
    tri([0.05 * sd, 0, -0.05], [0.16 * sd, 0, 0.02], [0.1 * sd, 0, -0.06], 1, sd);
    // the forked tail
    tri([0, 0, -0.1], [0.012 * sd, 0, -0.11], [0.05 * sd, 0, -0.22], 2, sd);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
  return g;
}

export class Swallows {
  constructor(scene, U, count = 8) {
    this.count = count;
    const geo = swallowGeometry();
    this.flap = new THREE.InstancedBufferAttribute(new Float32Array(count), 1); this.flap.setUsage(THREE.DynamicDrawUsage);
    this.phase = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
    geo.setAttribute('aFlap', this.flap);
    geo.setAttribute('aPhase', this.phase);
    const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: vert, fragmentShader: frag, side: THREE.DoubleSide });
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    scene.add(this.mesh);
    // each bird loops round a centre over the meadow or the terrace, at its own radius, height and pace
    this.birds = [];
    const spots = [[-16, -6], [-22, 8], [-14, -24], [-28, -18], [-10, 24], [-20, -44], [-30, 12], [-14, -62]];
    for (let i = 0; i < count; i++) {
      const [lx, lz] = spots[i % spots.length];
      const [wx, wz] = toWorld(lx, lz);
      this.birds.push({
        cx: wx, cz: wz, h: SITE.H0 + 4 + Math.random() * 6, r: 5 + Math.random() * 7, rz: 0.5 + Math.random() * 0.5,
        w: (0.28 + Math.random() * 0.2) * (Math.random() < 0.5 ? 1 : -1), a: Math.random() * 6.28,
        bob: 1 + Math.random() * 2, bobW: 0.3 + Math.random() * 0.4, ph: Math.random() * 6.28,
        flap: 1, next: 1 + Math.random() * 2, drift: Math.random() * 6.28,
      });
      this.phase.setX(i, Math.random() * 100);
    }
    this.phase.needsUpdate = true;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ');
    this._p = new THREE.Vector3(); this._s = new THREE.Vector3();
  }

  update(dt, time, dayK) {
    const show = dayK > 0.2;
    this.mesh.visible = show;
    if (!show) return;
    const grow = Math.min(1, (dayK - 0.2) / 0.3);
    this.birds.forEach((b, i) => {
      // flapping bursts and glides
      b.next -= dt;
      if (b.next < 0) { b.flap = b.flap ? 0 : 1; b.next = b.flap ? 0.8 + Math.random() * 1.6 : 1.2 + Math.random() * 2.5; }
      // the loop: an ellipse that itself drifts slowly, and a rise-and-fall through it
      b.drift += dt * 0.05;
      b.a += b.w * dt * (b.flap ? 1.1 : 0.95);
      const cx = b.cx + Math.sin(b.drift) * 6, cz = b.cz + Math.cos(b.drift * 0.8) * 6;
      const x = cx + Math.cos(b.a) * b.r, z = cz + Math.sin(b.a) * b.r * b.rz;
      const y = b.h + Math.sin(time * b.bobW + b.ph) * b.bob;
      // heading along the tangent, banking into the turn, nose up when climbing
      const vx = -Math.sin(b.a) * b.r * b.w, vz = Math.cos(b.a) * b.r * b.rz * b.w;
      const vy = Math.cos(time * b.bobW + b.ph) * b.bob * b.bobW;
      const heading = Math.atan2(vx, vz);
      const speed = Math.hypot(vx, vz) + 1e-4;
      const bank = -Math.sign(b.w) * 0.55 * (1 - 0.3 * b.flap);
      const pitch = -Math.atan2(vy, speed) * 0.8;
      this._e.set(pitch, heading, bank);
      this._q.setFromEuler(this._e);
      this._p.set(x, y, z);
      this._s.setScalar(grow * 1.4);
      this._m.compose(this._p, this._q, this._s);
      this.mesh.setMatrixAt(i, this._m);
      this.flap.setX(i, b.flap);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    this.flap.needsUpdate = true;
  }
}
