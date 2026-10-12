import * as THREE from 'three';
import { COMMON } from './shaders.js';
import { PALETTE } from './config.js';

const vert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// 晴空：天顶深蓝，越近地平线越白；太阳周围有前向散射的光晕。
// 只有抬头看到的高处才有几朵云（地上的云影由它们投下）。
const frag = /* glsl */ `
${COMMON}
uniform vec3 uSunGlow;
uniform float uSkyDim;
uniform float uStars;
uniform vec3 uMilkyNormal;   // the Milky Way runs along the great circle normal to this
varying vec3 vDir;

float fbm5(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    s += a * vnoise(p);
    p = p * 2.02 + vec2(5.3, 1.7);
    a *= 0.5;
  }
  return s / 0.96875;
}

void main() {
  vec3 d = normalize(vDir);
  float h = max(d.y, 0.0);
  float sd = max(dot(d, uSunDir), 0.0);

  // 晴空：地平线一窄条浅色 + 大气边缘的亮线，往上很快是深蓝（和水面倒影共用 skyColorAt）
  vec3 col = skyColorAt(d);
  // 太阳方向一圈淡淡的暖色光晕（只在太阳附近，不把整片天冲白）
  col += uSunGlow / uExposure * pow(sd, 12.0) * 0.3;

  float cover = 0.0;
  if (d.y > 0.5) {
    vec2 uv = d.xz / (d.y + 0.18) * 1.4;
    vec2 drift = vec2(-0.004, 0.0013) * uTime;
    float n = fbm5(uv + drift);
    float n2 = fbm5(uv + drift + normalize(uSunDir.xz) * 0.05);
    cover = cloudMaskAt(n) * smoothstep(0.5, 0.72, d.y);
    float lit = clamp(0.6 + (n - n2) * 6.0, 0.0, 1.0);
    vec3 cc = mix(vec3(0.62, 0.67, 0.78), vec3(1.0), lit) / uExposure * uSkyDim;
    col = mix(col, cc, cover);
  }

  // the night sky, once the daylight has gone (uStars rises with the night) — after the starry background of
  // ranranli.net: a faint Milky Way with dust lanes, stars in a few tints that twinkle, and the odd bright sparkle
  if (uStars > 0.001 && d.y > 0.0) {
    float horiz = smoothstep(0.0, 0.12, d.y) * (1.0 - cover) * uStars;
    vec2 ang = vec2(atan(d.z, d.x), asin(d.y));
    // the Milky Way: a soft band along a tilted great circle, brighter clumps along it, darker lanes through it
    float off = dot(d, uMilkyNormal);
    float w = 0.13 + 0.07 * vnoise(ang * 2.0 + 5.0);
    float mw = exp(-off * off / (w * w));
    float clump = fbm5(ang * vec2(1.6, 5.0) + 3.0);
    float lane = smoothstep(0.56, 0.74, fbm5(ang * vec2(4.0, 11.0) + 11.0));
    mw *= (0.3 + 1.0 * clump) * (1.0 - 0.65 * lane);
    col += vec3(0.6, 0.66, 0.92) * mw * 0.16 * horiz;
    col += vec3(0.95, 0.8, 0.9) * mw * mw * 0.05 * horiz;
    // the stars: hashed cells of a 3D grid that the dome passes through (so they don't bunch up at the zenith).
    // Two layers — many faint ones (packed along the Milky Way) and brighter ones that twinkle, in the tints
    // of a real night: mostly white, some blue, a few warm and rosy
    vec3 ePhi = normalize(vec3(-d.z, 0.0, d.x)), eTheta = cross(d, ePhi);   // sideways and upwards on the dome
    vec3 stars = vec3(0.0);
    for (int layer = 0; layer < 2; layer++) {
      float scale = layer == 0 ? 150.0 : 52.0;
      vec3 cp = d * scale;
      vec3 cell = floor(cp), f = fract(cp);
      float rnd = fract(sin(dot(cell, vec3(127.1, 311.7, 74.7))) * 43758.5453);
      float rnd2 = fract(sin(dot(cell + 7.1, vec3(93.7, 201.3, 157.9))) * 43758.5453);
      vec3 cen = 0.15 + 0.7 * vec3(fract(sin(dot(cell + 1.3, vec3(269.5, 183.3, 61.1))) * 43758.5453),
                                   fract(sin(dot(cell + 2.7, vec3(419.2, 371.9, 113.5))) * 43758.5453),
                                   fract(sin(dot(cell + 4.1, vec3(173.3, 251.7, 331.1))) * 43758.5453));
      float keep = layer == 0 ? step(0.86 - 0.12 * mw, rnd) : step(0.88, rnd);
      vec3 v = f - cen;
      float dist = length(v);
      vec3 tint = rnd2 < 0.62 ? vec3(1.0) : rnd2 < 0.84 ? vec3(0.85, 0.9, 1.0) : rnd2 < 0.93 ? vec3(1.0, 0.94, 0.86) : vec3(1.0, 0.88, 0.93);
      if (layer == 0) {
        stars += tint * smoothstep(0.08, 0.0, dist) * keep * (0.35 + 0.5 * rnd2);
      } else {
        // twinkle: a slow swell with a quicker scintillation on top, deeper for some stars than others
        float depth = rnd2 < 0.6 ? 0.55 : 0.2;
        float sp = 0.6 + 2.6 * fract(rnd * 17.0), ph = rnd2 * 40.0;
        float slow = 0.5 + 0.5 * sin(uTime * sp + ph);
        float fast = 0.78 + 0.22 * sin(uTime * sp * 2.7 + ph * 1.7);
        float shine = 1.0 - depth + depth * slow * fast;
        float size = 0.08 + 0.06 * pow(fract(rnd * 7.0), 4.0);
        float star = smoothstep(size, 0.0, dist) * keep * (0.6 + 0.6 * rnd2) * shine;
        stars += tint * star * 2.0;
        // a few of the brightest are four-pointed sparkles with a soft halo, pulsing slowly
        float sparkle = step(0.985, rnd) * step(0.5, rnd2);
        float pulse = 0.55 + 0.45 * sin(uTime * (0.35 + 0.5 * rnd2) + ph);
        vec2 q = abs(vec2(dot(v, ePhi), dot(v, eTheta)));
        float spikes = smoothstep(0.014, 0.0, q.x) * smoothstep(0.45, 0.0, q.y) + smoothstep(0.014, 0.0, q.y) * smoothstep(0.45, 0.0, q.x);
        float halo = smoothstep(0.3, 0.0, dist) * 0.35;
        stars += tint * sparkle * keep * (spikes * 0.9 + halo) * (0.5 + 0.5 * pulse) * 2.0;
      }
    }
    col += stars * horiz;
  }

  // 日轮：很亮（会被辉光晕开），不随曝光换算
  col += vec3(1.0, 0.95, 0.85) * pow(sd, 800.0) * 6.0 * (1.0 - cover);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function createSky(U) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      ...U,
      uSunGlow: { value: new THREE.Color(PALETTE.sunGlow) },
      uSkyDim: { value: 1 },    // clouds dim with the daylight
      uStars: { value: 0 },     // stars come out at night
      uMilkyNormal: { value: new THREE.Vector3(0.55, 0.62, -0.56).normalize() },   // a band arching high across the sky
    },
    vertexShader: vert,
    fragmentShader: frag,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(3000, 48, 24), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return mesh;
}
