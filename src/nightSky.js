import * as THREE from 'three';

// Shooting stars for the night sky, after the starry background of ranranli.net: every 4.5–11 s a streak
// crosses part of the dome — a white head with a soft glow, a tail that fades to pale blue — most of them
// coming in from the right and falling at 18–33° below the horizontal, each gone within about a second.
// The group is a child of the sky dome, so it rides along with the camera like the stars do.

const RADIUS = 3800;   // beyond the far mountains (1300–3600) and inside the camera's far plane (4000)
const POOL = 4;

const vert = /* glsl */ `
attribute float aAlong;
attribute float aAcross;
varying float vAlong;
varying float vAcross;
void main() {
  vAlong = aAlong;
  vAcross = aAcross;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const frag = /* glsl */ `
uniform float uEnv;
varying float vAlong;
varying float vAcross;
void main() {
  float core = exp(-vAcross * vAcross * 3.2);
  float along = pow(1.0 - vAlong, 1.5);
  vec3 col = mix(vec3(1.0), vec3(0.67, 0.73, 1.0), smoothstep(0.0, 0.45, vAlong));
  gl_FragColor = vec4(col, along * core * uEnv);
}
`;

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const rand = (a, b) => a + Math.random() * (b - a);

export class Meteors {
  constructor(parent) {
    this.group = new THREE.Group();
    this.night = 0;
    this.nextAt = Infinity;
    this.pool = [];
    const glow = glowTexture();
    for (let i = 0; i < POOL; i++) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(4 * 3), 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('aAlong', new THREE.Float32BufferAttribute([0, 0, 1, 1], 1));
      geo.setAttribute('aAcross', new THREE.Float32BufferAttribute([-1, 1, -1, 1], 1));
      geo.setIndex([0, 2, 1, 1, 2, 3]);
      const mat = new THREE.ShaderMaterial({
        uniforms: { uEnv: { value: 0 } }, vertexShader: vert, fragmentShader: frag,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false; mesh.visible = false;
      const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      head.scale.setScalar(RADIUS * 0.009); head.visible = false;
      this.group.add(mesh, head);
      this.pool.push({ mesh, head, live: false, d0: new THREE.Vector3(), t0: new THREE.Vector3(), w: 0, len: 0, life: 0, age: 0 });
    }
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3(); this._c = new THREE.Vector3(); this._u = new THREE.Vector3();
    parent.add(this.group);
  }

  // one streak, somewhere up the dome, heading down and (mostly) to the left
  shoot() {
    const m = this.pool.find((x) => !x.live);
    if (!m) return;
    const az = rand(0, Math.PI * 2), el = rand(0.35, 1.1);   // 20°–63° up
    m.d0.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
    const side = this._a.set(-m.d0.z, 0, m.d0.x).normalize();            // sideways along the dome
    const up = this._b.crossVectors(m.d0, side).normalize();              // and upwards
    if (up.y < 0) up.negate();
    const fall = rand(0.32, 0.58), dir = Math.random() < 0.7 ? -1 : 1;
    m.t0.copy(side).multiplyScalar(Math.cos(fall) * dir).addScaledVector(up, -Math.sin(fall)).normalize();
    m.w = rand(0.6, 0.95);          // rad/s along the great circle
    m.len = rand(0.12, 0.26);       // the tail, in radians of arc
    m.life = rand(0.75, 1.25);
    m.age = 0; m.live = true;
    m.mesh.visible = m.head.visible = true;
  }

  update(dt, night) {
    this.night = night;
    const t = performance.now() / 1000;
    if (night > 0.05) {
      if (this.nextAt === Infinity) this.nextAt = t + rand(2.5, 5);
      if (t >= this.nextAt) { this.shoot(); this.nextAt = t + rand(4.5, 11); }
    } else this.nextAt = Infinity;
    const pos = this._c, u = this._u;
    for (const m of this.pool) {
      if (!m.live) continue;
      m.age += dt;
      const p = m.age / m.life;
      if (p >= 1) { m.live = false; m.mesh.visible = m.head.visible = false; continue; }
      const env = Math.min(1, p / 0.12) * (1 - Math.max(0, (p - 0.55) / 0.45)) * night;
      const a = m.w * m.age, tail = m.len * Math.min(1, m.age / 0.25);
      // the head and the tail's end, along the great circle through d0 in the direction t0
      const head = this._a.copy(m.d0).multiplyScalar(Math.cos(a)).addScaledVector(m.t0, Math.sin(a));
      const end = this._b.copy(m.d0).multiplyScalar(Math.cos(a - tail)).addScaledVector(m.t0, Math.sin(a - tail));
      const across = u.crossVectors(head, end).normalize().multiplyScalar(RADIUS * 0.003);
      const arr = m.mesh.geometry.attributes.position;
      pos.copy(head).multiplyScalar(RADIUS);
      arr.setXYZ(0, pos.x - across.x, pos.y - across.y, pos.z - across.z);
      arr.setXYZ(1, pos.x + across.x, pos.y + across.y, pos.z + across.z);
      m.head.position.copy(pos);
      pos.copy(end).multiplyScalar(RADIUS);
      arr.setXYZ(2, pos.x - across.x, pos.y - across.y, pos.z - across.z);
      arr.setXYZ(3, pos.x + across.x, pos.y + across.y, pos.z + across.z);
      arr.needsUpdate = true;
      m.mesh.material.uniforms.uEnv.value = env;
      m.head.material.opacity = env;
    }
  }
}
