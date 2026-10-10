// Where the gallery stands in the valley: a level platform on the sunny side, glass facing the stream.
// Pure constants (no imports) so both the JS terrain and the GLSL terrain can use them.
//
// Valley coordinates: u along the flow (downstream = west = the sun), v across it. The gallery's own
// coordinates are "local": x across the building (-x = the glass side, +x = the stone wall), z along it
// (-z = towards the sun / downstream, where you face when you start). World = R(theta) * local + (cx, cz).

const FLOW = { x: -0.892036, z: 0.451965 };
const ACROSS = { x: -FLOW.z, z: FLOW.x };
const u0 = 380, v0 = 130;

export const SITE = {
  cx: u0 * FLOW.x + v0 * ACROSS.x,
  cz: u0 * FLOW.z + v0 * ACROSS.z,
  cos: -FLOW.z,            // rotation of the local x axis into world: (cos, -sin)
  sin: -FLOW.x,
  theta: Math.atan2(-FLOW.x, -FLOW.z),   // rotation.y of the gallery group
  rect: { x0: -9.1, x1: 2.6, z0: -75, z1: 43 },      // the platform (local)
  stair: { x0: -10.9, x1: -7.9, z0: -4.6, z1: -2.0 },  // the ground dips under the steps
  drop: 1.45,              // platform height above the meadow at its rim
  band: 16,                // metres over which the meadow blends back to the natural terrain
  H0: 0,                   // platform height (world); set by noise.js once the natural height is known
};

export function toLocal(wx, wz) {
  const dx = wx - SITE.cx, dz = wz - SITE.cz;
  return [dx * SITE.cos - dz * SITE.sin, dx * SITE.sin + dz * SITE.cos];
}
export function toWorld(lx, lz) {
  return [SITE.cx + lx * SITE.cos + lz * SITE.sin, SITE.cz - lx * SITE.sin + lz * SITE.cos];
}

// Where the platform and the steps are (local), as the terrain sees them
export function onPlatform(lx, lz) {
  const r = SITE.rect;
  return lx > r.x0 && lx < r.x1 && lz > r.z0 && lz < r.z1;
}
export function onStairs(lx, lz) {
  const s = SITE.stair;
  return lx > s.x0 && lx < s.x1 && lz > s.z0 && lz < s.z1;
}

// GLSL twin of noise.js's siteHeight, with the constants baked in
const f = (n) => Number(n).toFixed(6);
export const SITE_GLSL = /* glsl */ `
const vec2 SITE_C = vec2(${f(SITE.cx)}, ${f(SITE.cz)});
const vec2 SITE_R = vec2(${f(SITE.cos)}, ${f(SITE.sin)});
const vec4 SITE_RECT = vec4(${f(SITE.rect.x0)}, ${f(SITE.rect.x1)}, ${f(SITE.rect.z0)}, ${f(SITE.rect.z1)});
const vec4 SITE_STAIR = vec4(${f(SITE.stair.x0)}, ${f(SITE.stair.x1)}, ${f(SITE.stair.z0)}, ${f(SITE.stair.z1)});
uniform float uSiteH0;
vec2 siteLocal(vec2 p) {
  vec2 d = p - SITE_C;
  return vec2(d.x * SITE_R.x - d.y * SITE_R.y, d.x * SITE_R.y + d.y * SITE_R.x);
}
// 1 where the platform or the steps are (no grass, no flowers there)
float siteMask(vec2 p) {
  vec2 l = siteLocal(p);
  float onRect = step(SITE_RECT.x - 0.4, l.x) * step(l.x, SITE_RECT.y + 0.4) * step(SITE_RECT.z - 0.4, l.y) * step(l.y, SITE_RECT.w + 0.4);
  float onStair = step(SITE_STAIR.x, l.x) * step(l.x, SITE_STAIR.y) * step(SITE_STAIR.z, l.y) * step(l.y, SITE_STAIR.w);
  return max(onRect, onStair);
}
float siteHeight(vec2 p, float natural) {
  vec2 l = siteLocal(p);
  if (l.x > SITE_STAIR.x && l.x < SITE_STAIR.y && l.y > SITE_STAIR.z && l.y < SITE_STAIR.w) return uSiteH0 - ${f(SITE.drop)};
  float ox = max(max(SITE_RECT.x - l.x, l.x - SITE_RECT.y), 0.0);
  float oz = max(max(SITE_RECT.z - l.y, l.y - SITE_RECT.w), 0.0);
  if (ox == 0.0 && oz == 0.0) return uSiteH0 - 0.05;
  float t = smoothstep(0.0, ${f(SITE.band)}, length(vec2(ox, oz)));
  return mix(uSiteH0 - ${f(SITE.drop)}, natural, t);
}
`;
