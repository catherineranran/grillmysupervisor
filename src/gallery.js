// The gallery itself: the corridor, its furniture, posters, banner, bin, terrace, door, steps and gate,
// built in its own local coordinates inside a group placed on the platform (see siteConst.js).
import * as THREE from 'three';
import { withClouds } from './materials.js';
import { SITE, toWorld } from './siteConst.js';
import { heightAt } from './terrain.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function buildGallery({ scene, maxAniso, isTouch }) {
const g = new THREE.Group();
g.position.set(SITE.cx, SITE.H0, SITE.cz); g.rotation.y = SITE.theta;
scene.add(g);

// ---------- helpers ----------
let seed = 7;
function rand(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const rr = (a,b)=> a + (b-a)*rand();
function makeTex(w,h,draw,srgb=true){
  const c = document.createElement('canvas'); c.width=w; c.height=h;
  draw(c.getContext('2d'),w,h);
  const t = new THREE.CanvasTexture(c);
  if(srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = maxAniso;
  return t;
}
function mesh(geo, mat, x=0,y=0,z=0, cast=true, recv=true){
  const m = new THREE.Mesh(geo, mat); m.position.set(x,y,z); m.castShadow=cast; m.receiveShadow=recv; return m;
}


// ---------- textures ----------
const woodTex = makeTex(1024,1024,(g,w,h)=>{
  const planks=8, pw=w/planks;
  for(let i=0;i<planks;i++){
    let y = -rand()*h*0.8;
    while(y<h){
      const len = h*(0.5+rand()*0.6);
      g.fillStyle = `hsl(${30+rand()*8},${14+rand()*10}%,${76+rand()*8}%)`;
      g.fillRect(i*pw, y, pw, len);
      for(let k=0;k<46;k++){
        const gx = i*pw + rand()*pw, amp = rand()*4, fr = 0.004+rand()*0.02, ph=rand()*6;
        g.strokeStyle = `rgba(120,92,66,${0.03+rand()*0.09})`;
        g.lineWidth = 0.5+rand()*1.6;
        g.beginPath(); g.moveTo(gx, Math.max(y,0));
        for(let yy=Math.max(y,0); yy<Math.min(y+len,h); yy+=10) g.lineTo(gx+Math.sin(yy*fr+ph)*amp, yy);
        g.stroke();
      }
      // a few cathedral knots
      if(rand()<0.5){ const cx=i*pw+rand()*pw, cy=y+rand()*len; g.strokeStyle='rgba(110,82,60,.12)'; for(let r=4;r<26;r+=4){ g.beginPath(); g.ellipse(cx,cy,r*0.5,r*1.6,0,0,Math.PI*2); g.stroke(); } }
      g.fillStyle='rgba(95,72,55,.32)'; g.fillRect(i*pw, y, pw, 2);
      y += len;
    }
    g.fillStyle='rgba(95,72,55,.3)'; g.fillRect(i*pw, 0, 1.5, h);
  }
});

function stoneDraw(g,w,h,base){
  g.fillStyle = '#7d6459'; g.fillRect(0,0,w,h);
  const rows=5, rh=h/rows;
  for(let r=0;r<rows;r++){
    let x = -rand()*220;
    while(x<w){
      const bw = 150+rand()*190;
      const hue = base.h + rr(-5,6), sat = base.s + rr(-6,8), l = base.l + rr(-7,7);
      for(const ox of [0,w]){ // wrap seam
        const bx = x - ox; if(bx+bw<0||bx>w) continue;
        g.fillStyle = `hsl(${hue},${sat}%,${l}%)`;
        g.fillRect(bx+2, r*rh+2, bw-4, rh-4);
        g.save(); g.beginPath(); g.rect(bx+2, r*rh+2, bw-4, rh-4); g.clip();
        for(let k=0;k<70;k++){
          g.fillStyle = `hsla(${hue+rr(-8,8)},${sat+rr(-6,6)}%,${l+rr(-10,10)}%,${rr(0.05,0.18)})`;
          g.beginPath(); g.ellipse(bx+rand()*bw, r*rh+rand()*rh, rr(8,60), rr(4,30), rand()*3, 0, Math.PI*2); g.fill();
        }
        for(let k=0;k<160;k++){ g.fillStyle=`rgba(${rand()<.5?255:60},${rand()<.5?240:40},${rand()<.5?230:30},${rr(0.04,0.14)})`; g.fillRect(bx+rand()*bw, r*rh+rand()*rh, 2, 2); }
        // soft bevel
        const gr = g.createLinearGradient(0, r*rh, 0, r*rh+rh);
        gr.addColorStop(0,'rgba(255,255,255,.07)'); gr.addColorStop(1,'rgba(0,0,0,.08)');
        g.fillStyle=gr; g.fillRect(bx, r*rh, bw, rh);
        g.restore();
      }
      x += bw;
    }
  }
}
const stoneTex = makeTex(1024,1024,(g,w,h)=>stoneDraw(g,w,h,{h:16,s:20,l:63}));
const planterTex = makeTex(1024,1024,(g,w,h)=>stoneDraw(g,w,h,{h:12,s:22,l:52}));

const paveTex = makeTex(1024,1024,(g,w,h)=>{
  g.fillStyle='#6f6a63'; g.fillRect(0,0,w,h);
  const cols=4, rows=2;
  for(let i=0;i<cols;i++) for(let j=0;j<rows;j++){
    const l = 62+rr(-5,5);
    g.fillStyle=`hsl(${30+rr(-4,4)},${6+rr(0,4)}%,${l}%)`;
    g.fillRect(i*w/cols+3, j*h/rows+3, w/cols-6, h/rows-6);
    for(let k=0;k<120;k++){ g.fillStyle=`hsla(30,8%,${l+rr(-12,10)}%,.12)`; g.beginPath(); g.arc(i*w/cols+rand()*w/cols, j*h/rows+rand()*h/rows, rr(2,18),0,Math.PI*2); g.fill(); }
  }
});

const grilleTex = makeTex(64,256,(g,w,h)=>{
  g.fillStyle='#2b2a28'; g.fillRect(0,0,w,h);
  for(let y=0;y<h;y+=32){ g.fillStyle='#b9b7b2'; g.fillRect(4,y+4,w-8,14); g.fillStyle='#8f8d88'; g.fillRect(4,y+16,w-8,3); }
  g.fillStyle='#d4d2cd'; g.fillRect(0,0,4,h); g.fillRect(w-4,0,4,h);
});

const leafTex = makeTex(256,256,(g,w,h)=>{
  // monstera leaf: heart shape, splits and holes
  g.clearRect(0,0,w,h);
  const grd = g.createLinearGradient(0,h,0,0);
  grd.addColorStop(0,'#2f5a2c'); grd.addColorStop(1,'#4f8a3e');
  g.fillStyle=grd;
  g.beginPath();
  g.moveTo(128,250);
  g.bezierCurveTo(10,235, -6,90, 70,22);
  g.bezierCurveTo(98,0, 128,18, 128,30);
  g.bezierCurveTo(128,18, 158,0, 186,22);
  g.bezierCurveTo(262,90, 246,235, 128,250);
  g.fill();
  g.globalCompositeOperation='destination-out';
  g.lineCap='round';
  for(let i=0;i<7;i++){
    const a = -0.9 + i*0.3;
    for(const side of [-1,1]){
      const ang = Math.PI/2 + side*(0.55 + i*0.28);
      const sx = 128 + Math.cos(ang)*230, sy = 140 - Math.sin(ang)*-0 + i*14 - 40;
      g.lineWidth = 7;
      g.beginPath(); g.moveTo(128+side*(70+i*4), 70+i*24); g.lineTo(128+side*150, 40+i*30); g.stroke();
      if(i%2===0){ g.beginPath(); g.ellipse(128+side*(38+i*2), 88+i*22, 6, 11, side*0.5, 0, Math.PI*2); g.fill(); }
    }
  }
  g.globalCompositeOperation='source-over';
  g.strokeStyle='rgba(180,220,140,.55)'; g.lineWidth=3;
  g.beginPath(); g.moveTo(128,248); g.lineTo(128,34); g.stroke();
  g.lineWidth=1.2; g.strokeStyle='rgba(180,220,140,.3)';
  for(let i=0;i<8;i++){ for(const s of [-1,1]){ g.beginPath(); g.moveTo(128,220-i*24); g.quadraticCurveTo(128+s*40, 200-i*26, 128+s*96, 190-i*24); g.stroke(); } }
});
const bananaTex = makeTex(128,512,(g,w,h)=>{
  g.clearRect(0,0,w,h);
  const grd=g.createLinearGradient(0,0,w,0); grd.addColorStop(0,'#3d6e33'); grd.addColorStop(.5,'#6ea24c'); grd.addColorStop(1,'#3d6e33');
  g.fillStyle=grd;
  g.beginPath(); g.moveTo(64,510); g.bezierCurveTo(4,380,4,80,64,4); g.bezierCurveTo(124,80,124,380,64,510); g.fill();
  g.globalCompositeOperation='destination-out'; g.lineWidth=3;
  for(let i=0;i<9;i++){ const y=60+i*48+rand()*10; const s=rand()<.5?-1:1; g.beginPath(); g.moveTo(64+s*6,y); g.lineTo(64+s*70,y-26); g.stroke(); }
  g.globalCompositeOperation='source-over'; g.strokeStyle='rgba(210,230,170,.6)'; g.lineWidth=3; g.beginPath(); g.moveTo(64,510); g.lineTo(64,6); g.stroke();
});


// ---------- materials ----------
const M = {
  floor: withClouds(new THREE.MeshStandardMaterial({map:woodTex, roughness:0.58, metalness:0})),
  stone: withClouds(new THREE.MeshStandardMaterial({map:stoneTex, roughness:0.92})),
  planter: withClouds(new THREE.MeshStandardMaterial({map:planterTex, roughness:0.95})),
  // the slabs and walls cast with both faces, so no sun leaks in along the ceiling line or the corners
  ceiling: new THREE.MeshStandardMaterial({color:0xf2f0ec, roughness:0.95, shadowSide:THREE.DoubleSide}),
  plaster: new THREE.MeshStandardMaterial({color:0xece8e2, roughness:0.95, shadowSide:THREE.DoubleSide}),
  frame: new THREE.MeshStandardMaterial({color:0xe4e6e5, roughness:0.38, metalness:0.35}),
  frameDark: new THREE.MeshStandardMaterial({color:0x8c8f90, roughness:0.4, metalness:0.5}),
  glass: new THREE.MeshPhysicalMaterial({color:0xdfeaf0, roughness:0.04, metalness:0, transparent:true, opacity:0.1, depthWrite:false, side:THREE.DoubleSide}),
  pave: withClouds(new THREE.MeshStandardMaterial({map:paveTex, roughness:0.9})),
  grille: new THREE.MeshStandardMaterial({map:grilleTex, roughness:0.5, metalness:0.4}),
  fabric: new THREE.MeshStandardMaterial({color:0xf1ede6, roughness:0.96}),
  chrome: new THREE.MeshStandardMaterial({color:0xd5d8da, roughness:0.3, metalness:0.45}),
  pot: new THREE.MeshStandardMaterial({color:0xe6dccb, roughness:0.85}),
  stem: new THREE.MeshStandardMaterial({color:0x4d7a39, roughness:0.8}),
  door: new THREE.MeshStandardMaterial({color:0x5e3a2b, roughness:0.65}),
  doorFrame: new THREE.MeshStandardMaterial({color:0xc9ab9c, roughness:0.85}),
  soil: new THREE.MeshStandardMaterial({color:0x3e3328, roughness:1}),
  tableGlass: new THREE.MeshPhysicalMaterial({color:0xd8e2e4, roughness:0.05, transparent:true, opacity:0.35}),
};
function alphaLeafMat(tex){
  const m = new THREE.MeshStandardMaterial({map:tex, alphaTest:0.5, side:THREE.DoubleSide, roughness:0.6});
  m.userData.depth = new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking, map:tex, alphaTest:0.5});
  return m;
}
M.monstera = alphaLeafMat(leafTex);
M.banana = alphaLeafMat(bananaTex);

// image assets published next to the page
const texLoader = new THREE.TextureLoader();
function loadTex(url, opts){
  const t = texLoader.load(url, opts && opts.onLoad);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  if(opts && opts.repeat){ t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
function cutoutMat(tex, extra){
  const m = new THREE.MeshStandardMaterial(Object.assign({map:tex, alphaTest:0.5, side:THREE.DoubleSide, roughness:0.9}, extra||{}));
  m.userData.depth = new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking, map:tex, alphaTest:0.5});
  return m;
}
function cutoutMesh(geo, mat, cast){
  const m = new THREE.Mesh(geo, mat); m.castShadow = !!cast; m.receiveShadow = true;
  if(cast) m.customDepthMaterial = mat.userData.depth;
  return m;
}
const T = {
  banner: loadTex('assets/banner.png'),
  photos: loadTex('assets/photos.png'),
  bow: loadTex('assets/bow.png'),
  tulip: loadTex('assets/tulip.png'),
  minerva: loadTex('assets/minerva.png'),
  mpiBoard: loadTex('assets/mpi-board.jpg'),
  sausage: loadTex('assets/sausage.png'),
  avatar: loadTex('assets/avatar.png', {onLoad: () => { if(grillSign) grillSign.redraw(); if(wishSign) wishSign.redraw(); }}),
};
M.flag = cutoutMat(T.banner);
M.photo = cutoutMat(T.photos);
M.bow = cutoutMat(T.bow);
M.tulip = cutoutMat(T.tulip, {roughness:0.7});
M.minerva = new THREE.MeshStandardMaterial({map:T.minerva, transparent:true, depthWrite:false, roughness:0.95, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2});
M.mpiBoard = new THREE.MeshStandardMaterial({map:T.mpiBoard, roughness:0.8});
M.boardBack = new THREE.MeshStandardMaterial({color:0xf3efe8, roughness:0.85});
M.string = new THREE.MeshStandardMaterial({color:0xe8dcc4, roughness:0.9});


// ---------- architecture ----------
const L = 108, Z0 = 38, Z1 = Z0 - L, ZC = (Z0+Z1)/2, H = 4.6, XG = -2.0, XW = 2.0;
const world = g;

// floor
woodTex.repeat.set(4/1.6, L/1.6);
const floor = mesh(new THREE.PlaneGeometry(4, L), M.floor, 0, 0, ZC, false, true);
floor.rotation.x = -Math.PI/2; world.add(floor);
// the glass doors in the window wall, each centred in a bay between two mullions (pitch 2.85 from Z0-0.4) and
// swinging out onto the terrace: one near the start, with the steps down beside it, and two more along the hall
const DOORS = [[22.5, 21.3], [-0.3, -1.5], [-37.3, -38.5]].map(([z0, z1]) => ({z0, z1, h: 2.3, angle: 0, target: 0, pivot: null}));
const DOOR = DOORS[1];   // the one by the steps
const STAIR = {z0: -2.3, z1: -4.3, top: -8.0, bottom: -10.4};
// the stretches of glass wall between the doors
const BAYS = []; { let za = Z0; for(const d of DOORS){ BAYS.push([za, d.z0]); za = d.z1; } BAYS.push([za, Z1]); }
// floor grille along glass, split around the doors
for(const [za, zb] of BAYS){
  const len = za - zb, gt = grilleTex.clone(); gt.needsUpdate = true; gt.repeat.set(1, len/0.25);
  const gr = mesh(new THREE.PlaneGeometry(0.28, len), new THREE.MeshStandardMaterial({map:gt, roughness:0.5, metalness:0.4}), XG+0.22, 0.004, (za+zb)/2, false, true);
  gr.rotation.x = -Math.PI/2; world.add(gr);
}

// ceiling slab (overhangs outside)
world.add(mesh(new THREE.BoxGeometry(5.0, 0.4, L+0.4), M.ceiling, -0.5, H+0.2, ZC));
// fascia outside
world.add(mesh(new THREE.BoxGeometry(0.12, 0.55, L+0.4), M.plaster, -3.0, H+0.18, ZC));

// stone wall
stoneTex.repeat.set(L/2.75, H/2.75);
const wall = mesh(new THREE.PlaneGeometry(L, H), M.stone, XW, H/2, ZC, false, true);
wall.rotation.y = -Math.PI/2; world.add(wall);
// back of wall (so it blocks light from inside view)
world.add(mesh(new THREE.BoxGeometry(0.3, H, L), M.plaster, XW+0.16, H/2, ZC, true, false));

// the near end wall (the far one, with the locked door to the back room, is built with the room below)
world.add(mesh(new THREE.BoxGeometry(4.4, H, 0.25), M.plaster, 0, H/2, Z0+0.12));

// glazing
for(const [za, zb] of BAYS) world.add(mesh(new THREE.BoxGeometry(0.24, 0.07, za-zb), M.frame, XG, 0.035, (za+zb)/2));
world.add(mesh(new THREE.BoxGeometry(0.26, 0.16, L), M.frame, XG, H-0.08, ZC));
function glassPane(za, zb, y0, y1){
  const g = new THREE.Mesh(new THREE.PlaneGeometry(za-zb, y1-y0), M.glass);
  g.rotation.y = Math.PI/2; g.position.set(XG, (y0+y1)/2, (za+zb)/2); g.renderOrder = 2; world.add(g);
}
for(const [za, zb] of BAYS) glassPane(za, zb, 0, H);
for(const d of DOORS) glassPane(d.z0, d.z1, d.h+0.08, H);
// each door: frame and the leaf, hinged on the far post, swinging out to the terrace
for(const D of DOORS){
  for(const z of [D.z0, D.z1]) world.add(mesh(new THREE.BoxGeometry(0.2, D.h+0.1, 0.09), M.frame, XG, (D.h+0.1)/2, z));
  world.add(mesh(new THREE.BoxGeometry(0.2, 0.1, D.z0-D.z1+0.09), M.frame, XG, D.h+0.04, (D.z0+D.z1)/2));
  const pivot = new THREE.Group(); pivot.position.set(XG, 0, D.z1); world.add(pivot); D.pivot = pivot;
  const w = D.z0 - D.z1 - 0.1, leaf = new THREE.Group(); leaf.position.z = 0.05; pivot.add(leaf);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(w-0.1, D.h-0.14), M.glass); pane.rotation.y = Math.PI/2; pane.position.set(0, D.h/2, w/2); pane.renderOrder = 2; leaf.add(pane);
  for(const z of [0.03, w-0.03]) leaf.add(mesh(new THREE.BoxGeometry(0.05, D.h-0.02, 0.06), M.frame, 0, D.h/2, z));
  for(const y of [0.03, D.h-0.05]) leaf.add(mesh(new THREE.BoxGeometry(0.05, 0.06, w), M.frame, 0, y, w/2));
  leaf.add(mesh(new THREE.BoxGeometry(0.05, 0.3, w), M.frame, 0, 0.17, w/2));
  for(const x of [-0.06, 0.06]) leaf.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 10), M.chrome, x, 1.05, w-0.14));
  for(const x of [-0.06, 0.06]) for(const y of [0.9, 1.2]) leaf.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6), M.chrome, x/2, y, w-0.14, false, false));
}
const doorPivot = DOOR.pivot;
const mullGeo = new THREE.BoxGeometry(0.2, H, 0.075);
const finGeo = new THREE.BoxGeometry(0.06, H, 0.04);
for(let z = Z0 - 0.4; z > Z1; z -= 2.85){
  world.add(mesh(mullGeo, M.frame, XG, H/2, z));
  world.add(mesh(finGeo, M.frameDark, XG-0.13, H/2, z, true, false));
}


// ---------- outside ----------
// terrace
const TL = SITE.rect.z1 - SITE.rect.z0;
paveTex.repeat.set(7.1/2.4, TL/1.2);
const terrace = mesh(new THREE.PlaneGeometry(7.1, TL), M.pave, XG-3.55, -0.02, (SITE.rect.z1 + SITE.rect.z0)/2, false, true);   // out to the retaining wall, the whole length of the platform
terrace.rotation.x = -Math.PI/2; world.add(terrace);
// planter wall with ivy
planterTex.repeat.set((L+10)/2.75, 1/2.75);
for(const [za, zb] of [[Z0+5, STAIR.z0], [STAIR.z1, Z1]]){   // the terrace ends at the back room's wall
  world.add(mesh(new THREE.BoxGeometry(0.7, 1.0, za-zb), M.planter, -8.35, 0.48, (za+zb)/2));
  world.add(mesh(new THREE.BoxGeometry(0.62, 0.02, za-zb), M.soil, -8.35, 0.99, (za+zb)/2, false, true));
}
// the platform's retaining wall, all the way round (the ground outside is a step lower)
{
  const wallTex = planterTex.clone(); wallTex.needsUpdate = true; wallTex.repeat.set(4, 0.55);
  const wallMat = withClouds(new THREE.MeshStandardMaterial({map:wallTex, roughness:0.95}));
  const R = SITE.rect, hgt = 1.62, yc = -1.5 + hgt/2, t = 0.3;
  const seg = (x0, x1, z0, z1) => world.add(mesh(new THREE.BoxGeometry(x1-x0, hgt, z1-z0), wallMat, (x0+x1)/2, yc, (z0+z1)/2, true, true));
  seg(R.x0 - t, R.x0, R.z0 - t, STAIR.z1);        // glass side, in two pieces around the steps
  seg(R.x0 - t, R.x0, STAIR.z0, R.z1 + t);
  seg(R.x1, R.x1 + t, R.z0 - t, R.z1 + t);        // behind the stone wall
  seg(R.x0, R.x1, R.z0 - t, R.z0);                // the two ends
  seg(R.x0, R.x1, R.z1, R.z1 + t);
  // the terrace beyond the corridor's near end (the far end is the back room)
  { const p = mesh(new THREE.PlaneGeometry(4.6, 5), M.pave, 0.3, -0.02, Z0+2.5, false, true); p.rotation.x = -Math.PI/2; world.add(p); }
}

// ivy
{
  const ivyGeo = new THREE.IcosahedronGeometry(0.11, 0);
  const n = 6000;
  const ivy = new THREE.InstancedMesh(ivyGeo, new THREE.MeshStandardMaterial({flatShading:true, roughness:0.9}), n);
  const d = new THREE.Object3D(), col = new THREE.Color();
  for(let i=0;i<n;i++){
    let z; do { z = Z0 + 5 - rand()*(L+5); } while(z > STAIR.z1 - 0.25 && z < STAIR.z0 + 0.25);
    const spill = rand() < 0.35;
    if(spill){ d.position.set(-7.98 - rand()*0.04, rr(0.2, 1.0), z); }
    else { d.position.set(rr(-8.7,-7.95), rr(1.0, 1.55) - (rand()<0.3?0:0), z); }
    const s = rr(0.6, 1.5); d.scale.set(s, s*rr(0.6,1), s);
    d.rotation.set(rand()*3, rand()*3, rand()*3); d.updateMatrix();
    ivy.setMatrixAt(i, d.matrix);
    col.setHSL(rr(0.22,0.3), rr(0.3,0.5), rr(0.18,0.32)); ivy.setColorAt(i, col);
  }
  ivy.castShadow = true; ivy.receiveShadow = true; ivy.frustumCulled = false; world.add(ivy);
}

// ---------- the trees along the terrace (the gallery's own, from its first version) ----------
// airy yellow-green crowns standing on the meadow just beyond the retaining wall; their feet follow the valley floor
// bark: a streaked, slightly ridged texture rather than a flat colour
const barkTex = makeTex(256, 512, (g, w, h) => {
  g.fillStyle = '#6f665c'; g.fillRect(0, 0, w, h);
  for(let i=0;i<260;i++){
    const x = rand()*w, y0 = rand()*h, len = rr(30, 160), wd = rr(1, 4);
    g.strokeStyle = `hsla(${rr(24, 36)},${rr(10, 22)}%,${rr(24, 52)}%,${rr(0.25, 0.7)})`; g.lineWidth = wd;
    g.beginPath(); g.moveTo(x, y0); g.lineTo(x + rr(-6, 6), y0 + len); g.stroke();
  }
  for(let i=0;i<60;i++){ g.fillStyle = `rgba(230,220,200,${rr(0.05, 0.18)})`; g.fillRect(rand()*w, rand()*h, rr(1, 3), rr(6, 30)); }
});
barkTex.repeat.set(2, 3);
M.bark = new THREE.MeshStandardMaterial({map:barkTex, roughness:0.95});
const TREES = [
  {x:-12.4,z:1.8,h:11,r:4.2}, {x:-13.5,z:-15,h:9.5,r:3.6}, {x:-11,z:-27,h:10.5,r:4},
  {x:-14,z:-39,h:12,r:4.4}, {x:-11.8,z:-52,h:9,r:3.5}, {x:-13,z:-64,h:11,r:4}, {x:-12,z:9,h:10,r:3.8},
  {x:-11,z:21,h:11,r:4}, {x:-13.5,z:33,h:10,r:3.8}, {x:-12,z:45,h:10.5,r:4}, {x:-13.9,z:-76,h:10,r:3.6},
  {x:-5.5,z:-86.5,h:10.5,r:3.9}, {x:1.0,z:-88.5,h:9.5,r:3.5},   // beyond the back room's end glass
];
{
  // the crowns: rounded clumps of leaves for the mass, and cards of drawn leaf clusters over them for the lace
  // at the edges; both take the tree's yellow-greens per instance, lighter on top, deeper down in the crown
  const leafCardTex = makeTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for(let i=0;i<11;i++){
      const cx = 128 + rr(-70, 70), cy = 128 + rr(-70, 70), L = rr(44, 70), W = L*rr(0.42, 0.6), a = rand()*Math.PI*2;
      g.save(); g.translate(cx, cy); g.rotate(a);
      const grd = g.createLinearGradient(-L/2, 0, L/2, 0); grd.addColorStop(0, `hsl(${rr(62, 74)},${rr(45, 60)}%,${rr(62, 74)}%)`); grd.addColorStop(1, `hsl(${rr(64, 78)},${rr(40, 55)}%,${rr(48, 60)}%)`);
      g.fillStyle = grd; g.beginPath(); g.moveTo(-L/2, 0); g.quadraticCurveTo(0, -W, L/2, 0); g.quadraticCurveTo(0, W, -L/2, 0); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(70,80,30,0.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-L/2, 0); g.lineTo(L/2, 0); g.stroke();
      for(let k=-2;k<=2;k++){ if(!k) continue; g.beginPath(); g.moveTo(k*L*0.17, 0); g.lineTo(k*L*0.17 + L*0.12, -Math.sign(k)*0.0 - W*0.55*(k > 0 ? 1 : -1)); g.stroke(); }
      g.restore();
    }
  });
  leafCardTex.wrapS = leafCardTex.wrapT = THREE.ClampToEdgeWrapping;
  const cardMat = new THREE.MeshStandardMaterial({map:leafCardTex, alphaTest:0.5, side:THREE.DoubleSide, roughness:0.75});
  const cardDepth = new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking, map:leafCardTex, alphaTest:0.5});
  const clumpGeo = new THREE.IcosahedronGeometry(0.3, 1);
  const cardGeo = new THREE.PlaneGeometry(0.9, 0.9);
  const perClump = 1000, perCard = 950;
  const clumps = new THREE.InstancedMesh(clumpGeo, new THREE.MeshStandardMaterial({roughness:0.85}), TREES.length*perClump);
  const cards = new THREE.InstancedMesh(cardGeo, cardMat, TREES.length*perCard);
  cards.customDepthMaterial = cardDepth;
  const d = new THREE.Object3D(), col = new THREE.Color();
  const palette = [0xb7ad5a, 0xcabb6c, 0x9c9b4c, 0xd6c57a, 0x87903f, 0xbfae62];
  let ic = 0, ik = 0;
  const trunkTop = new THREE.Vector3(), tmpV = new THREE.Vector3();
  for(const t of TREES){
    const [wx, wz] = toWorld(t.x, t.z);
    const ground = t.ground = heightAt(wx, wz) - SITE.H0 - 0.12;   // the foot sinks a little into the turf
    const trunkH = t.h*0.55, lean = rr(-0.06, 0.06), leanDir = rand()*Math.PI*2;
    // the trunk in three tapering lengths, leaning a touch, with a flare at the root
    let y = ground, px = t.x, pz = t.z;
    for(let seg=0; seg<3; seg++){
      const len = trunkH/3, r0 = 0.3 - seg*0.07, r1 = 0.23 - seg*0.07;
      const m = mesh(new THREE.CylinderGeometry(r1, r0, len, 10), M.bark, 0, 0, 0);
      m.geometry.translate(0, len/2, 0);
      m.position.set(px, y, pz); m.rotation.set(Math.sin(leanDir)*lean*(seg+1), 0, Math.cos(leanDir)*lean*(seg+1));
      world.add(m);
      px += Math.sin(leanDir)*lean*len*(seg+1); pz += Math.cos(leanDir)*lean*len*(seg+1); y += len*0.985;
    }
    world.add(mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.25, 10), M.bark, t.x, ground + 0.12, t.z));
    trunkTop.set(px, y, pz);
    const cy = ground + t.h*0.62;
    // branches: nine from the top of the trunk, each with a couple of twigs
    for(let b=0;b<9;b++){
      const len = rr(2.2, 3.8), a = b/9*Math.PI*2 + rr(-0.3, 0.3), tilt = rr(0.45, 0.95);
      const br = mesh(new THREE.CylinderGeometry(0.035, 0.11, len, 7), M.bark, 0, 0, 0);
      br.geometry.translate(0, len/2, 0);
      br.position.set(px, y - trunkH*rr(0.02, 0.3), pz);
      br.rotation.set(Math.sin(a)*tilt, 0, Math.cos(a)*tilt);
      world.add(br);
      for(let k=0;k<2;k++){
        const tl = rr(1.0, 1.8), tw = mesh(new THREE.CylinderGeometry(0.02, 0.045, tl, 5), M.bark, 0, 0, 0);
        tw.geometry.translate(0, tl/2, 0);
        tmpV.set(0, len*rr(0.55, 0.95), 0).applyEuler(br.rotation).add(br.position);
        tw.position.copy(tmpV); tw.rotation.set(Math.sin(a + rr(-0.9, 0.9))*rr(0.6, 1.2), 0, Math.cos(a + rr(-0.9, 0.9))*rr(0.6, 1.2));
        world.add(tw);
      }
    }
    const place = (i, radiusK, sizeA, sizeB, isCard) => {
      let x, yy, z; do{ x = rr(-1, 1); yy = rr(-1, 1); z = rr(-1, 1); } while(x*x + yy*yy + z*z > 1);
      const k = radiusK + (1 - radiusK)*Math.pow(rand(), 0.4);
      const l = Math.hypot(x, yy, z) || 1; x = x/l*k; yy = yy/l*k; z = z/l*k;
      d.position.set(t.x + x*t.r, cy + yy*t.h*0.36, t.z + z*t.r);
      const s = rr(sizeA, sizeB); d.scale.set(s, s*rr(0.75, 1.1), s);
      d.rotation.set(rand()*3, rand()*3, rand()*3); d.updateMatrix();
      col.set(palette[(rand()*palette.length)|0]); col.offsetHSL(rr(-0.02, 0.02), 0, rr(-0.05, 0.06) + yy*0.05);   // lighter up top
      if(isCard){ cards.setMatrixAt(i, d.matrix); cards.setColorAt(i, col); } else { clumps.setMatrixAt(i, d.matrix); clumps.setColorAt(i, col); }
    };
    for(let i=0;i<perClump;i++) place(ic++, 0.4, 0.3, 0.62, false);
    for(let i=0;i<perCard;i++) place(ik++, 0.55, 1.1, 2.0, true);
  }
  for(const m of [clumps, cards]){ m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; world.add(m); }
}


// ---------- furniture ----------
const colliders = [];
function addBox(minX,maxX,minZ,maxZ){ colliders.push({minX,maxX,minZ,maxZ}); }

const sofaZs = [];
// leather: cognac, with a clear coat for the sheen; the backs and arms carry a baked diamond-tufting texture
const tuftTex = makeTex(1024, 512, (g, w, h) => {
  g.fillStyle = '#7a4424'; g.fillRect(0, 0, w, h);
  const cx = 128, cy = 128;   // diamond cell
  for(let y = -cy; y <= h + cy; y += cy) for(let x = ((y/cy) % 2 ? cx/2 : 0) - cx; x <= w + cx; x += cx){
    const grd = g.createRadialGradient(x - 10, y - 16, 6, x, y, cx*0.8);
    grd.addColorStop(0, '#b0703f'); grd.addColorStop(0.5, '#8c502b'); grd.addColorStop(1, '#55290f');
    g.fillStyle = grd; g.beginPath(); g.moveTo(x, y - cy/2); g.lineTo(x + cx/2, y); g.lineTo(x, y + cy/2); g.lineTo(x - cx/2, y); g.closePath(); g.fill();
  }
  // the seams and the buttons at the pleats
  g.strokeStyle = 'rgba(40,18,8,0.6)'; g.lineWidth = 4;
  for(let y = -cy; y <= h + cy; y += cy) for(let x = ((y/cy) % 2 ? cx/2 : 0) - cx; x <= w + cx; x += cx){
    g.beginPath(); g.moveTo(x, y - cy/2); g.lineTo(x + cx/2, y); g.lineTo(x, y + cy/2); g.lineTo(x - cx/2, y); g.closePath(); g.stroke();
  }
  for(let y = -cy; y <= h + cy; y += cy) for(let x = ((y/cy) % 2 ? cx/2 : 0) - cx; x <= w + cx; x += cx){
    for(const [px, py] of [[x, y - cy/2], [x + cx/2, y]]){
      const b = g.createRadialGradient(px - 4, py - 4, 2, px, py, 13); b.addColorStop(0, '#8c5a36'); b.addColorStop(0.6, '#4a2410'); b.addColorStop(1, '#2d1409');
      g.fillStyle = b; g.beginPath(); g.arc(px, py, 11, 0, Math.PI*2); g.fill();
      g.strokeStyle = 'rgba(255,220,180,0.25)'; g.lineWidth = 1.5; g.beginPath(); g.arc(px, py, 9, 0, Math.PI*2); g.stroke();
    }
  }
});
tuftTex.repeat.set(1, 1);
// a fine grain for the plain leather, and the tufting's own relief as a bump map
const grainTex = makeTex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for(let i=0;i<9000;i++){ g.fillStyle = `rgba(${rand()<0.5?60:200},${rand()<0.5?60:200},${rand()<0.5?60:200},0.12)`; g.fillRect(rand()*w, rand()*h, 1.5, 1.5); } }, false);
grainTex.repeat.set(3, 3);
const leather = new THREE.MeshPhysicalMaterial({color:0x7a4424, roughness:0.42, metalness:0, clearcoat:0.55, clearcoatRoughness:0.3, bumpMap:grainTex, bumpScale:0.0012});
const leatherTuft = new THREE.MeshPhysicalMaterial({map:tuftTex, roughness:0.42, metalness:0, clearcoat:0.55, clearcoatRoughness:0.3, bumpMap:tuftTex, bumpScale:0.012});
const leatherDark = new THREE.MeshPhysicalMaterial({color:0x5a2f16, roughness:0.5, clearcoat:0.4, bumpMap:grainTex, bumpScale:0.0012});
const velvetTex = makeTex(128, 128, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for(let i=0;i<4000;i++){ g.fillStyle = `rgba(${rand()<0.5?90:170},${rand()<0.5?90:170},${rand()<0.5?90:170},0.2)`; g.fillRect(rand()*w, rand()*h, 1, 2); } }, false);
velvetTex.repeat.set(4, 4);
const velvet = [0x2f5d4a, 0xc99a3a, 0x5b3f6e].map((c) => new THREE.MeshPhysicalMaterial({color:c, roughness:0.9, sheen:0.8, sheenRoughness:0.6, sheenColor:new THREE.Color(c).offsetHSL(0, 0, 0.25), bumpMap:velvetTex, bumpScale:0.002}));
const walnut = new THREE.MeshStandardMaterial({color:0x3a2516, roughness:0.55, metalness:0.05});
const brass = new THREE.MeshStandardMaterial({color:0xd4b05a, roughness:0.3, metalness:0.85});
const nailGeo = new THREE.SphereGeometry(0.009, 8, 6), nailMats = [];
function sofa(zc){
  sofaZs.push(zc);
  const g = new THREE.Group(); g.position.set(1.48, 0, zc);
  const len = 1.8, dep = 0.74;
  const k = sofaZs.length;
  // plinth and the two seat cushions
  g.add(mesh(new THREE.BoxGeometry(dep-0.1, 0.2, len-0.08), leatherDark, 0, 0.24, 0));
  // two plump seat cushions, with piping round the top edge and a slight sag in the middle
  for(const sz of [-1, 1]){
    const cu = mesh(new RoundedBoxGeometry(dep-0.26, 0.18, len/2-0.14, 6, 0.07), leather, -0.04, 0.42, sz*(len/4-0.04)); cu.scale.set(1, 0.95, 1); g.add(cu);
    const pipe = new THREE.Mesh(new THREE.TorusGeometry(1, 0.008, 6, 48), leatherDark); pipe.scale.set((dep-0.26)/2 - 0.02, (len/2-0.14)/2 - 0.02, 1); pipe.rotation.x = Math.PI/2; pipe.position.set(-0.04, 0.505, sz*(len/4-0.04)); g.add(pipe);
  }
  // the tufted back, with real relief in the pleats, rolled over at the top
  const backMats = [leather, leatherTuft, leather, leather, leather, leather];   // the face towards the seat is tufted
  const back = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.5, len-0.3, 3, 0.03), backMats); back.position.set(0.25, 0.66, 0); back.rotation.z = -0.14; back.castShadow = true; back.receiveShadow = true; g.add(back);
  const backRoll = mesh(new THREE.CylinderGeometry(0.11, 0.11, len-0.3, 32), leather, 0.2, 0.92, 0); backRoll.rotation.x = Math.PI/2; g.add(backRoll);
  for(const sz of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.11, 24, 16), leather, 0.2, 0.92, sz*(len/2-0.15)));
  // rolled, tufted arms with brass nailheads along the outer edge
  for(const sz of [-1, 1]){
    const armMats = [leather, leather, leather, leather, sz > 0 ? leatherTuft : leather, sz > 0 ? leather : leatherTuft];
    const armBody = new THREE.Mesh(new THREE.BoxGeometry(dep-0.1, 0.3, 0.22), armMats); armBody.position.set(-0.02, 0.5, sz*(len/2-0.12)); armBody.castShadow = true; armBody.receiveShadow = true; g.add(armBody);
    const arm = mesh(new THREE.CylinderGeometry(0.13, 0.13, dep+0.02, 32), leather, -0.02, 0.66, sz*(len/2-0.12)); arm.rotation.z = Math.PI/2; g.add(arm);
    g.add(mesh(new THREE.SphereGeometry(0.13, 24, 16), leather, -0.02 - (dep+0.02)/2, 0.66, sz*(len/2-0.12)));
    for(let i=0;i<14;i++){ const n = mesh(nailGeo, brass, -0.37 + i*0.052, 0.37, sz*(len/2-0.005), false, false); g.add(n); }
    for(let i=0;i<8;i++){ const a = Math.PI*(0.15 + i/7*0.7); g.add(mesh(nailGeo, brass, -0.02 - (dep+0.02)/2 - Math.cos(a)*0.13, 0.66 + Math.sin(a)*0.13, sz*(len/2-0.005), false, false)); }
  }
  // turned walnut feet: a bun, a neck and a collar
  for(const sx of [-0.28, 0.26]) for(const sz of [-1, 1]){
    const fz = sz*(len/2-0.14);
    g.add(mesh(new THREE.SphereGeometry(0.045, 14, 10), walnut, sx, 0.045, fz));
    g.add(mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.06, 12), walnut, sx, 0.1, fz));
    g.add(mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.025, 14), walnut, sx, 0.142, fz, false, false));
  }
  // a velvet cushion in each corner, piped
  for(const sz of [-1, 1]){
    const vm = velvet[(k + (sz > 0 ? 1 : 0)) % velvet.length];
    const cu = mesh(new RoundedBoxGeometry(0.1, 0.4, 0.4, 4, 0.045), vm, 0.1, 0.72, sz*(len/2-0.36));
    cu.rotation.z = -0.22; cu.rotation.y = sz*0.18; g.add(cu);
    const pipe = new THREE.Mesh(new THREE.TorusGeometry(1, 0.007, 6, 40), new THREE.MeshStandardMaterial({color:vm.color.clone().offsetHSL(0, 0, 0.18), roughness:0.9})); pipe.scale.set(0.18, 0.18, 1); pipe.rotation.y = Math.PI/2; cu.add(pipe); pipe.position.x = 0.0;
  }
  world.add(g);
  addBox(1.08, 2, zc-len/2, zc+len/2);
}

function sideTable(zc){
  const g = new THREE.Group(); g.position.set(1.62, 0, zc);
  g.add(mesh(new THREE.BoxGeometry(0.36, 0.015, 0.36), M.tableGlass, 0, 0.5, 0, false, false));
  for(const x of [-0.17,0.17]) for(const z of [-0.17,0.17]) g.add(mesh(new THREE.BoxGeometry(0.018,0.5,0.018), M.chrome, x, 0.25, z));
  g.add(mesh(new THREE.BoxGeometry(0.36,0.015,0.36), M.chrome, 0, 0.12, 0));
  world.add(g);
  addBox(1.42, 1.82, zc-0.2, zc+0.2);
}

function plant(zc, x = 1.48){
  const g = new THREE.Group(); g.position.set(x, 0, zc);
  g.add(mesh(new THREE.CylinderGeometry(0.34, 0.27, 0.5, 28), M.pot, 0, 0.25, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.02, 28), M.soil, 0, 0.49, 0, false, true));
  const leafGeo = new THREE.PlaneGeometry(0.62, 0.62); leafGeo.translate(0, 0.31, 0);
  const banGeo = new THREE.PlaneGeometry(0.3, 1.3); banGeo.translate(0, 0.65, 0);
  function addLeaf(geo, mat, h, yaw, pitch, rollv){
    const stemTop = new THREE.Vector3(Math.sin(yaw)*0.28*h, 0.5+h, Math.cos(yaw)*0.28*h);
    const st = new THREE.Vector3(0,0.5,0);
    const len = stemTop.distanceTo(st);
    const stem = mesh(new THREE.CylinderGeometry(0.008, 0.014, len, 5), M.stem);
    stem.position.copy(st).add(stemTop).multiplyScalar(0.5);
    stem.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), stemTop.clone().sub(st).normalize());
    g.add(stem);
    const leaf = new THREE.Mesh(geo, mat); leaf.castShadow = true; leaf.receiveShadow = true;
    leaf.customDepthMaterial = mat.userData.depth;
    leaf.position.copy(stemTop);
    leaf.rotation.order = 'YXZ'; leaf.rotation.set(pitch, yaw, rollv);
    g.add(leaf);
  }
  for(let i=0;i<18;i++) addLeaf(leafGeo, M.monstera, rr(0.45, 1.65), rand()*Math.PI*2, rr(0.5, 1.25), rr(-0.3,0.3));
  for(let i=0;i<4;i++) addLeaf(banGeo, M.banana, rr(1.2, 1.7), rand()*Math.PI*2, rr(0.15, 0.55), rr(-0.2,0.2));
  world.add(g);
  addBox(x-0.4, x+0.4, zc-0.42, zc+0.42);
}

// the tulip from Ranran's website, potted: two crossed cut-out planes (the drawing's mound is cropped so the stems sit in the soil)
const tulipGeos = (()=>{
  const w = 0.92, h = w * (1754*0.86/900);
  const g = new THREE.PlaneGeometry(w, h); g.translate(0, h/2, 0);
  const uv = g.attributes.uv; for(let i=0;i<uv.count;i++) uv.setY(i, 0.14 + uv.getY(i)*0.86);
  return g;
})();
function tulipPlant(zc){
  const g = new THREE.Group(); g.position.set(1.48, 0, zc);
  g.add(mesh(new THREE.CylinderGeometry(0.34, 0.27, 0.5, 28), M.pot, 0, 0.25, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.02, 28), M.soil, 0, 0.49, 0, false, true));
  const yaw = rr(0, Math.PI);
  for(const a of [0, Math.PI/2]){
    const leaf = cutoutMesh(tulipGeos, M.tulip, true);
    leaf.position.y = 0.47; leaf.rotation.y = yaw + a;
    g.add(leaf);
  }
  world.add(g);
  addBox(1.08, 2, zc-0.42, zc+0.42);
}

const lampLights = [];
function lamp(zc, x = 1.18){
  const g = new THREE.Group(); g.position.set(x, 0, zc);
  g.add(mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.025, 24), M.chrome, 0, 0.012, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.009, 0.009, 1.3, 8), M.chrome, 0, 0.66, 0));
  const shadeMat = new THREE.MeshStandardMaterial({color:0xd9a33a, emissive:0xe79a2a, emissiveIntensity:0.85, roughness:0.7, side:THREE.DoubleSide, transparent:true, opacity:0.96});
  const shade = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.52, 28, 1, true), shadeMat, 0, 1.48, 0, true, false);
  g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({color:0xfff0c8}));
  bulb.position.y = 1.45; g.add(bulb);
  const pl = new THREE.PointLight(0xffb45a, 0.9, 5.5, 2); pl.position.y = 1.45; g.add(pl);
  lampLights.push({light:pl, mat:shadeMat});
  world.add(g);
  addBox(x-0.18, x+0.18, zc-0.18, zc+0.18);
}

function doorway(zc){
  world.add(mesh(new THREE.BoxGeometry(0.08, 2.45, 1.1), M.door, XW-0.02, 1.225, zc, false, true));
  world.add(mesh(new THREE.BoxGeometry(0.1, 0.1, 1.3), M.doorFrame, XW-0.03, 2.5, zc, false, true));
  for(const s of [-1,1]) world.add(mesh(new THREE.BoxGeometry(0.1, 2.55, 0.1), M.doorFrame, XW-0.03, 1.275, zc+s*0.6, false, true));
  world.add(mesh(new THREE.BoxGeometry(0.06, 0.03, 0.18), M.chrome, XW-0.08, 1.05, zc+0.38, false, false));
}

// ---------- bookshelves ----------
const bookMats = [], bookCols = [];
const shelfWood = woodTex.clone(); shelfWood.needsUpdate = true; shelfWood.repeat.set(0.6, 0.35); shelfWood.rotation = Math.PI/2;
const shelfMat = new THREE.MeshStandardMaterial({map:shelfWood, color:0xcdb08a, roughness:0.7});
const shelfBack = new THREE.MeshStandardMaterial({color:0xa88c66, roughness:0.85});
const bookPalette = [0x8c3b2e,0x2f4a5e,0x6d7a4a,0xc9b48a,0x3d3a36,0xa8673a,0xe8e1d3,0x5a4a6b,0x9e8d6c,0x34584f,0xb7472f,0xd9c7a0];
function bookshelf(zc){
  const W = 0.92, D = 0.36, HT = 2.15, T = 0.03, x = XW - D/2 - 0.01;
  const g = new THREE.Group(); g.position.set(x, 0, zc);
  for(const s of [-1,1]) g.add(mesh(new THREE.BoxGeometry(D, HT, T), shelfMat, 0, HT/2, s*(W/2 - T/2)));
  g.add(mesh(new THREE.BoxGeometry(0.02, HT, W), shelfBack, D/2-0.01, HT/2, 0));
  g.add(mesh(new THREE.BoxGeometry(D, 0.08, W), shelfMat, 0, 0.04, 0));
  const levels = [0.08, 0.5, 0.9, 1.3, 1.7, HT - T];
  for(const y of levels.slice(1)){
    g.add(mesh(new THREE.BoxGeometry(D, T, W - 2*T), shelfMat, 0, y + T/2, 0));
    g.add(mesh(new THREE.BoxGeometry(0.012, T + 0.016, W - 2*T), shelfMat, -D/2 + 0.006, y + T/2, 0, false, true));   // a lip along the front edge
  }
  g.add(mesh(new THREE.BoxGeometry(D + 0.02, 0.05, W + 0.02), shelfMat, 0, HT + 0.025, 0));   // the cornice
  world.add(g);
  addBox(x - D/2, XW, zc - W/2, zc + W/2);
  // books on each level
  const d = new THREE.Object3D();
  for(let li=0; li<levels.length-1; li++){
    const base = levels[li] + (li===0?0:T), room = levels[li+1] - base - 0.02;
    let z = zc - W/2 + T + 0.01; const zEnd = zc + W/2 - T - 0.01;
    const fill = rr(0.55, 0.95);
    while(z < zc - W/2 + T + (W - 2*T)*fill){
      if(rand() < 0.1 && z + 0.24 < zEnd){ // a short horizontal stack
        let y = base; const n = 2 + (rand()*3|0);
        for(let k=0;k<n;k++){ const th = rr(0.025,0.045), wd = rr(0.17,0.23);
          d.position.set(x + 0.03 - rr(0,0.02), y + th/2, z + 0.12); d.rotation.set(0, rr(-0.15,0.15), 0); d.scale.set(rr(0.2,0.26), th, wd); d.updateMatrix();
          bookMats.push(d.matrix.clone()); bookCols.push(bookPalette[rand()*bookPalette.length|0]); y += th; }
        z += 0.26; continue;
      }
      const th = rr(0.02, 0.055), ht = Math.min(room, rr(0.19, 0.32)), dp = rr(0.18, 0.26);
      if(z + th > zEnd) break;
      const lean = (rand() < 0.06) ? rr(0.15, 0.3) : 0;
      d.position.set(x + 0.04 - dp/2 + 0.1, base + ht/2, z + th/2 + lean*ht*0.5);
      d.rotation.set(lean, 0, 0); d.scale.set(dp, ht, th); d.updateMatrix();
      bookMats.push(d.matrix.clone()); bookCols.push(bookPalette[rand()*bookPalette.length|0]);
      z += th + (lean ? ht*0.35 : 0.002);
    }
  }
}

const tulipAt = new Set([26.75, -7.05, -51.25]);
for(const z0 of [32, 12, -1.8, -24, -46]){
  bookshelf(z0 + 1.45);
  bookshelf(z0 + 2.4);
  sofa(z0);
  sofa(z0 - 2.2);
  sideTable(z0 - 3.55);
  lamp(z0 - 4.6);
  if(tulipAt.has(z0 - 5.25)) tulipPlant(z0 - 5.25); else plant(z0 - 5.25);
  doorway(z0 - 7.4);
}
// a few lone benches further along
for(const z of [20, -16, -38, -60]){ sofa(z); bookshelf(z + 1.45); }
plant(-66.5); lamp(-65.6);
plant(36.4); lamp(35.6);
{
  // spines in four designs (bands, a title block, ridges), drawn pale so each book's own colour tints them
  const spineTex = (design) => makeTex(128, 512, (g, w, h) => {
    g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, 6, h); g.fillRect(w - 6, 0, 6, h);
    if(design === 0){ for(const y of [40, 60, h - 70, h - 50]){ g.fillStyle = '#5a4a3a'; g.fillRect(14, y, w - 28, 5); } g.fillStyle = '#4a4a4a'; for(let i=0;i<3;i++) g.fillRect(24, 150 + i*26, w - 48 - i*18, 10); }
    else if(design === 1){ g.fillStyle = 'rgba(255,255,255,0.65)'; g.fillRect(16, 120, w - 32, 170); g.fillStyle = '#3a3a3a'; for(let i=0;i<4;i++) g.fillRect(28, 150 + i*28, w - 56 - (i%2)*20, 9); g.fillStyle = '#6a5636'; g.fillRect(16, h - 90, w - 32, 6); }
    else if(design === 2){ g.fillStyle = '#4f4336'; for(const y of [30, h - 40]) g.fillRect(10, y, w - 20, 9); for(let i=0;i<5;i++){ g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(10, 90 + i*70, w - 20, 14); } g.fillStyle = '#3a3a3a'; g.fillRect(30, 220, w - 60, 12); }
    else { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 0, w, 70); g.fillRect(0, h - 70, w, 70); g.fillStyle = '#f4f0e8'; g.fillRect(26, 180, w - 52, 8); g.fillRect(36, 204, w - 72, 8); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(0, 300, w, 3); }
  });
  const designs = [0, 1, 2, 3].map((d) => { const t = spineTex(d); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; });
  const groups = designs.map(() => []);
  bookMats.forEach((m, i) => groups[i % 4].push(i));
  const c = new THREE.Color();
  groups.forEach((idx, d) => {
    if(!idx.length) return;
    const cover = new THREE.MeshStandardMaterial({roughness:0.75});
    const spine = new THREE.MeshStandardMaterial({map:designs[d], roughness:0.7});
    // BoxGeometry faces: +x -x +y -y +z -z; the spine faces the corridor (-x), the covers are the ±z faces
    const books = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), [cover, spine, cover, cover, cover, cover], idx.length);
    idx.forEach((i, k) => {
      books.setMatrixAt(k, bookMats[i]);
      c.set(bookCols[i]).offsetHSL(0, rr(-0.05, 0.05), rr(-0.06, 0.06)); books.setColorAt(k, c);
    });
    books.castShadow = true; books.receiveShadow = true; books.frustumCulled = false; world.add(books);
  });
}


// ---------- posters (one above each sofa): landscape glass boards on chrome standoffs ----------
const posters = [];
const POSTER_W = 1.6, POSTER_H = 1.0, POSTER_Y = 3.2;
{
  const posterGeo = new THREE.PlaneGeometry(POSTER_W, POSTER_H);
  const standoffGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.05, 12), capGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.012, 12);
  const edgeGeo = new THREE.BoxGeometry(0.012, POSTER_H+0.012, POSTER_W+0.012);   // the pane's thickness, a pale rim just behind the face
  const glassEdge = new THREE.MeshPhysicalMaterial({color:0xcfe6e4, roughness:0.1, metalness:0, transparent:true, opacity:0.55});
  const zs = sofaZs.slice().sort((a,b)=>b-a);
  zs.forEach((z,i)=>{
    const c = document.createElement('canvas'); c.width = 1024; c.height = 640;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso;
    // the glass: the canvas carries its own alpha (frosted pane, paper notes stuck on it), with a glossy clear coat
    const mat = new THREE.MeshPhysicalMaterial({map:tex, transparent:true, roughness:0.12, metalness:0, clearcoat:0.9, clearcoatRoughness:0.08, envMapIntensity:0.6, depthWrite:true});
    const m = new THREE.Mesh(posterGeo, mat);
    m.rotation.y = -Math.PI/2; m.position.set(XW-0.062, POSTER_Y, z); m.receiveShadow = true; m.renderOrder = 3;
    m.userData = {kind:'poster', n:i+1};
    world.add(m);
    // the pane's thickness, seen as a pale edge
    const edge = mesh(edgeGeo, glassEdge, XW-0.054, POSTER_Y, z, false, false); edge.renderOrder = 2; world.add(edge);
    // four chrome standoffs hold the pane off the stone
    for(const dy of [-1, 1]) for(const dz of [-1, 1]){
      const so = mesh(standoffGeo, M.chrome, XW-0.03, POSTER_Y + dy*(POSTER_H/2-0.06), z + dz*(POSTER_W/2-0.06), true, false); so.rotation.z = Math.PI/2; world.add(so);
      const cap = mesh(capGeo, M.chrome, XW-0.066, POSTER_Y + dy*(POSTER_H/2-0.06), z + dz*(POSTER_W/2-0.06), false, false); cap.rotation.z = Math.PI/2; world.add(cap);
    }
    posters.push({n:i+1, z, mesh:m, mat, canvas:c, ctx:c.getContext('2d'), tex, key:null});
  });
}


// ---------- the birthday signature board (on the stone wall, past the bin) ----------
// Everyone who visits can sign it; the names go up in a hand and a colour of their own. Balloons and bunting round it.
const SIGN_FONTS = ['Caveat', 'Pacifico', 'Kalam', 'Satisfy', 'Permanent Marker', 'Shadows Into Light', 'Gloria Hallelujah', 'Dancing Script'];
const SIGN_COLORS = ['#d7263d', '#f46036', '#f2a541', '#2e86ab', '#1b998b', '#7b2cbf', '#e63946', '#0a9396', '#ee9b00', '#6a4c93', '#ff5d8f', '#3a86ff', '#06a77d', '#bc4749'];
const SIGN = { z: -11.95, y: 2.3, w: 2.6, h: 1.625 };   // between the wall door and the next bookshelf
function signHash(str){ let h = 2166136261; for(let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
// the hand and the colour of a signature: chosen by the signer (sig = 'f<hand>c<ink>', or 'c<ink>' for a drawn one), else by hash
function signLook(x){
  const h = signHash(x.id || x.text || '');
  let font = SIGN_FONTS[(h >>> 16) % SIGN_FONTS.length], color = SIGN_COLORS[(h >>> 20) % SIGN_COLORS.length];
  const m = /^(?:f(\d+))?c(\d+)$/.exec(x.sig || '');
  if(m){ if(m[1] !== undefined) font = SIGN_FONTS[Number(m[1]) % SIGN_FONTS.length]; color = SIGN_COLORS[Number(m[2]) % SIGN_COLORS.length]; }
  return { font, color };
}
let signHit, setSignatures;
{
  const c = document.createElement('canvas'); c.width = 2048; c.height = 1280; const g2 = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso;
  const mat = new THREE.MeshStandardMaterial({map:tex, roughness:0.85, emissive:0xffffff, emissiveMap:tex, emissiveIntensity:0.3});   // lit like a notice board, so the colours stay bright in the shade and at night
  let names = [];
  let sd = 5; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const dots = []; for(let i=0;i<140;i++) dots.push({x:r()*2048, y:r()*1280, s:5+r()*9, c:SIGN_COLORS[(r()*SIGN_COLORS.length)|0], a:r()*Math.PI, k:r()});
  function hash(str){ let h = 2166136261; for(let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function balloon(x, y, rad, col){
    g2.save(); g2.translate(x, y);
    const grd = g2.createRadialGradient(-rad*0.35, -rad*0.4, rad*0.1, 0, 0, rad*1.1);
    grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.12, col); grd.addColorStop(1, col);
    g2.fillStyle = grd; g2.globalAlpha = 0.92;
    g2.beginPath(); g2.ellipse(0, 0, rad*0.85, rad, 0, 0, Math.PI*2); g2.fill();
    g2.beginPath(); g2.moveTo(-rad*0.14, rad*0.98); g2.lineTo(rad*0.14, rad*0.98); g2.lineTo(0, rad*1.16); g2.closePath(); g2.fill();
    g2.strokeStyle = '#6b6b6b'; g2.lineWidth = 3; g2.globalAlpha = 0.6;
    g2.beginPath(); g2.moveTo(0, rad*1.16); g2.bezierCurveTo(rad*0.4, rad*1.7, -rad*0.4, rad*2.2, rad*0.1, rad*2.9); g2.stroke();
    g2.restore();
  }
  function draw(){
    const W = 2048, H = 1280;
    g2.globalAlpha = 1; g2.fillStyle = '#fffaf0'; g2.fillRect(0, 0, W, H);
    // soft colour wash in the corners, confetti everywhere
    for(const [x, y, col] of [[0, 0, '#ffe3ec'], [W, 0, '#e3f2ff'], [0, H, '#fff4d6'], [W, H, '#e6f7ee']]){
      const grd = g2.createRadialGradient(x, y, 20, x, y, 900); grd.addColorStop(0, col); grd.addColorStop(1, 'rgba(255,250,240,0)');
      g2.fillStyle = grd; g2.fillRect(0, 0, W, H);
    }
    for(const d of dots){ g2.save(); g2.translate(d.x, d.y); g2.rotate(d.a); g2.fillStyle = d.c; g2.globalAlpha = 0.55;
      if(d.k < 0.5) g2.fillRect(-d.s/2, -d.s/3, d.s, d.s*0.66); else { g2.beginPath(); g2.arc(0, 0, d.s*0.45, 0, Math.PI*2); g2.fill(); }
      g2.restore(); }
    g2.globalAlpha = 1;
    // balloons in the top corners
    balloon(150, 150, 70, '#e63946'); balloon(240, 110, 58, '#f2a541'); balloon(96, 262, 50, '#3a86ff');
    balloon(W-150, 150, 70, '#1b998b'); balloon(W-240, 112, 58, '#7b2cbf'); balloon(W-96, 262, 50, '#ff5d8f');
    // the header, letter by letter in party colours
    g2.textAlign = 'center'; g2.textBaseline = 'middle';
    const title = 'HAPPY BIRTHDAY!';
    g2.font = '700 150px "Bricolage Grotesque", ui-sans-serif, sans-serif';
    let total = 0; const widths = [...title].map((ch) => { const w = g2.measureText(ch).width; total += w; return w; });
    let x = W/2 - total/2;
    [...title].forEach((ch, i) => {
      g2.save(); g2.translate(x + widths[i]/2, 190 + Math.sin(i*1.3)*10); g2.rotate((Math.sin(i*2.1))*0.06);
      g2.fillStyle = 'rgba(60,40,30,0.18)'; g2.fillText(ch, 5, 6);
      g2.fillStyle = SIGN_COLORS[i % SIGN_COLORS.length]; g2.fillText(ch, 0, 0); g2.restore();
      x += widths[i];
    });
    g2.fillStyle = '#5d554d'; g2.font = '500 40px "DM Mono", ui-monospace, monospace';
    g2.fillText('— signed by everyone who came by —', W/2, 300);
    // the signatures: a jittered grid that tightens as the board fills
    const n = names.length;
    const cols = n <= 8 ? 3 : n <= 20 ? 4 : n <= 40 ? 5 : 6, rows = n <= 8 ? 3 : n <= 20 ? 5 : n <= 40 ? 8 : 10, maxShow = cols*rows;
    const size = n <= 8 ? 104 : n <= 20 ? 78 : n <= 40 ? 58 : 46;
    const x0 = 120, x1 = W - 120, y0 = 380, y1 = H - 90;
    const cw = (x1 - x0)/cols, rh = (y1 - y0)/rows;
    names.slice(0, maxShow).forEach((nm, i) => {
      const h = hash(nm.id || nm.text);
      const col = i % cols, row = (i / cols) | 0;
      const jx = ((h & 255)/255 - 0.5) * cw * 0.3, jy = (((h >>> 8) & 255)/255 - 0.5) * rh * 0.3;
      const cx = x0 + cw*(col + 0.5) + jx, cy = y0 + rh*(row + 0.5) + jy;
      const { font, color } = signLook(nm);
      const rot = (((h >>> 24) & 255)/255 - 0.5) * 0.28;
      g2.save(); g2.translate(cx, cy); g2.rotate(rot);
      let ink = null;
      if(nm.ink){ try { ink = JSON.parse(nm.ink); } catch(e){ ink = null; } }
      if(Array.isArray(ink) && ink.length){
        // a hand-drawn signature: scale its strokes (pad space 1000 × 333) into the slot
        let x0i = 1e9, y0i = 1e9, x1i = -1e9, y1i = -1e9;
        for(const st of ink) for(const q of st){ x0i = Math.min(x0i, q[0]); y0i = Math.min(y0i, q[1]); x1i = Math.max(x1i, q[0]); y1i = Math.max(y1i, q[1]); }
        const bw = Math.max(40, x1i - x0i), bh = Math.max(40, y1i - y0i);
        const sc = Math.min(cw*0.95/bw, rh*0.9/bh, size/70);
        const ox = (x0i + x1i)/2, oy = (y0i + y1i)/2;
        g2.lineCap = 'round'; g2.lineJoin = 'round';
        for(const pass of [[3, 'rgba(60,40,30,0.12)'], [0, color]]){
          g2.strokeStyle = pass[1]; g2.fillStyle = pass[1]; g2.lineWidth = Math.max(4, 11*sc);
          for(const st of ink){
            if(st.length === 1){ g2.beginPath(); g2.arc((st[0][0]-ox)*sc + pass[0], (st[0][1]-oy)*sc + pass[0], Math.max(1.5, 3.5*sc), 0, Math.PI*2); g2.fill(); continue; }
            g2.beginPath(); g2.moveTo((st[0][0]-ox)*sc + pass[0], (st[0][1]-oy)*sc + pass[0]);
            for(let k=1;k<st.length;k++) g2.lineTo((st[k][0]-ox)*sc + pass[0], (st[k][1]-oy)*sc + pass[0]);
            g2.stroke();
          }
        }
      } else {
        let fs = size; g2.font = '700 ' + fs + 'px "' + font + '", cursive';
        while(fs > 22 && g2.measureText(nm.text).width > cw*0.95){ fs -= 4; g2.font = '700 ' + fs + 'px "' + font + '", cursive'; }
        g2.fillStyle = 'rgba(60,40,30,0.12)'; g2.fillText(nm.text, 3, 3);
        g2.fillStyle = color; g2.fillText(nm.text, 0, 0);
      }
      g2.restore();
    });
    if(!n){ g2.fillStyle = '#a39b90'; g2.font = '600 54px "Caveat", cursive'; g2.fillText('be the first to sign…', W/2, (y0+y1)/2); }
    if(n > maxShow){ g2.fillStyle = '#5d554d'; g2.font = '500 34px "DM Mono", ui-monospace, monospace'; g2.textAlign = 'right'; g2.fillText('+ ' + (n - maxShow) + ' more', W - 60, H - 40); g2.textAlign = 'center'; }
    tex.needsUpdate = true;
  }
  draw();
  if(document.fonts && document.fonts.load){
    Promise.all(SIGN_FONTS.concat(['Bricolage Grotesque', 'DM Mono']).map((f) => document.fonts.load('40px "' + f + '"').catch(() => null))).then(draw, draw);
    if(document.fonts.ready) document.fonts.ready.then(draw);
  }
  setSignatures = function(list){ names = list.slice().reverse(); draw(); };   // oldest first, so early signers keep their spot
  if(location.search.includes('debug')) window.__signCanvas = c;
  // the board on the wall, in a gold-ish frame
  const board = new THREE.Mesh(new THREE.PlaneGeometry(SIGN.w, SIGN.h), mat);
  board.rotation.y = -Math.PI/2; board.position.set(XW-0.053, SIGN.y, SIGN.z); board.receiveShadow = true;   // just proud of the frame's face
  board.userData = {kind:'sign'}; world.add(board); signHit = board;
  const gold = new THREE.MeshStandardMaterial({color:0xc9a227, roughness:0.35, metalness:0.6});
  world.add(mesh(new THREE.BoxGeometry(0.04, SIGN.h+0.12, SIGN.w+0.12), gold, XW-0.025, SIGN.y, SIGN.z, false, true));
  // balloons tied to the frame, bunting above
  const string = new THREE.MeshStandardMaterial({color:0x8a8178, roughness:0.9});
  for(const [dz, dy, col, rad] of [[-1.55, 0.95, 0xe63946, 0.17], [-1.72, 0.62, 0xf2a541, 0.14], [-1.4, 0.45, 0x3a86ff, 0.12], [1.55, 0.95, 0x1b998b, 0.17], [1.72, 0.62, 0x7b2cbf, 0.14], [1.4, 0.45, 0xff5d8f, 0.12]]){
    const b = mesh(new THREE.SphereGeometry(rad, 20, 14), new THREE.MeshStandardMaterial({color:col, roughness:0.3, metalness:0.05}), XW-0.28, SIGN.y+dy+0.2, SIGN.z+dz);
    b.scale.y = 1.15; world.add(b);
    world.add(mesh(new THREE.ConeGeometry(0.03, 0.05, 8), new THREE.MeshStandardMaterial({color:col, roughness:0.4}), XW-0.28, SIGN.y+dy+0.2-rad*1.15-0.02, SIGN.z+dz, false, false));
    const knot = SIGN.y+dy+0.2-rad*1.15-0.02, len = knot - 0.03 - SIGN.y;   // tied off at the frame's mid-height
    world.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, len, 5), string, XW-0.28, SIGN.y + len/2, SIGN.z+dz, false, false));
  }
  {
    const n = 14, zA = SIGN.z - SIGN.w/2 - 0.2, zB = SIGN.z + SIGN.w/2 + 0.2, top = SIGN.y + SIGN.h/2 + 0.32;
    const pts = []; for(let i=0;i<=n;i++){ const t = i/n; pts.push(new THREE.Vector3(XW-0.12, top - Math.sin(Math.PI*t)*0.14, zA + (zB-zA)*t)); }
    world.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.005, 5, false), string));
    const flag = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,-0.09), new THREE.Vector3(0,0,0.09), new THREE.Vector3(0,-0.17,0)]);
    flag.setIndex([0,1,2]); flag.computeVertexNormals();
    for(let i=0;i<n;i++){ const t = (i+0.5)/n; const f = new THREE.Mesh(flag, new THREE.MeshStandardMaterial({color:SIGN_COLORS[i % SIGN_COLORS.length], roughness:0.8, side:THREE.DoubleSide}));
      f.position.set(XW-0.12, top - Math.sin(Math.PI*t)*0.14 - 0.005, zA + (zB-zA)*t); world.add(f); }
  }
}

// ---------- numbered balloons: the way round the party ----------
// 1 the wish board, 2 the signature board, 3 the grill; the fourth drifts from the door down to the grassland and back
function balloonSprite(num, label, col, dark){
  // a glossy balloon, egg-shaped, with its number printed on it (the texture's middle sits on the balloon's +x,
  // and the balloon turns so that side faces you), a knot at the bottom, a curling string and a paper tag with the label
  const g = new THREE.Group();
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const cx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso;
  const paint = () => {
    cx.fillStyle = col; cx.fillRect(0, 0, 1024, 512);
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.font = '700 300px "Bricolage Grotesque", ui-sans-serif, sans-serif';
    cx.lineWidth = 22; cx.strokeStyle = dark; cx.strokeText(String(num), 512, 236);
    cx.fillStyle = '#ffffff'; cx.fillText(String(num), 512, 236);
    tex.needsUpdate = true;
  };
  paint();
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(paint);
  const skin = new THREE.MeshPhysicalMaterial({map:tex, roughness:0.18, metalness:0, clearcoat:1, clearcoatRoughness:0.08, sheen:0.4, sheenColor:new THREE.Color(0xffffff)});
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.26, 48, 32), skin); body.scale.set(1, 1.18, 1); body.castShadow = true; g.add(body);
  const darkMat = new THREE.MeshStandardMaterial({color:dark, roughness:0.4});
  const knot = mesh(new THREE.ConeGeometry(0.035, 0.05, 10), darkMat, 0, -0.325, 0, false, false); knot.rotation.x = Math.PI; g.add(knot);
  const ring = mesh(new THREE.TorusGeometry(0.018, 0.008, 8, 16), darkMat, 0, -0.35, 0, false, false); ring.rotation.x = Math.PI/2; g.add(ring);
  // the string: a curling line down to the tag
  const pts = []; for(let i=0;i<=24;i++){ const t = i/24; pts.push(new THREE.Vector3(Math.sin(t*9)*0.025*(1-t), -0.36 - t*0.62, Math.cos(t*7)*0.02*(1-t))); }
  const string = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.003, 5, false), new THREE.MeshStandardMaterial({color:0xf4f1ea, roughness:0.9})); g.add(string);
  // the tag
  const tc = document.createElement('canvas'); tc.width = 512; tc.height = 128; const tg = tc.getContext('2d');
  const ttex = new THREE.CanvasTexture(tc); ttex.colorSpace = THREE.SRGBColorSpace; ttex.anisotropy = maxAniso;
  const paintTag = () => {
    tg.fillStyle = '#f7f1e3'; tg.fillRect(0, 0, 512, 128); tg.strokeStyle = dark; tg.lineWidth = 6; tg.strokeRect(5, 5, 502, 118);
    tg.fillStyle = dark; tg.font = '700 52px "Bricolage Grotesque", ui-sans-serif, sans-serif'; tg.textAlign = 'center'; tg.textBaseline = 'middle';
    let size = 52; tg.font = '700 ' + size + 'px "Bricolage Grotesque", ui-sans-serif, sans-serif';
    while(tg.measureText(label).width > 470 && size > 30){ size -= 2; tg.font = '700 ' + size + 'px "Bricolage Grotesque", ui-sans-serif, sans-serif'; }
    tg.fillText(label, 256, 66); ttex.needsUpdate = true;
  };
  paintTag();
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(paintTag);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.1), new THREE.MeshStandardMaterial({map:ttex, roughness:0.9, side:THREE.DoubleSide})); tag.position.set(0, -1.02, 0); g.add(tag);
  g.userData.body = body; g.userData.tag = tag; g.userData.mat = skin;
  return g;
}
const guideBalloons = [];
{
  const specs = [
    [1, 'send a greeting', '#e8485b', '#8d1f2e', [-0.95, 2.05, -2.7]],
    [2, 'sign the board', '#3f8ae6', '#1d4a8a', [1.05, 3.55, -11.95]],
    [3, 'the grill', '#f0962e', '#9a5210', [-4.6, 2.45, -6.7]],
  ];
  for(const [n, label, col, dark, pos] of specs){
    const sp = balloonSprite(n, label, col, dark); sp.position.set(pos[0], pos[1], pos[2]); world.add(sp);
    guideBalloons.push({ sp, base: pos.slice(), phase: n * 1.7 });
  }
  // the fourth balloon's route: in at the door, across the terrace, down the steps, over the meadow to the gate
  const route = [[-1.3, 2.3, 1.2], [-2.6, 2.3, -0.9], [-5.6, 2.3, -2.2], [-8.6, 2.2, -3.3], [-11.4, 1.1, -3.3], [-15.5, 0.85, -5.5], [-20.5, 0.8, -9.5], [-25.6, 0.85, -13.4]];
  const curve = new THREE.CatmullRomCurve3(route.map((r) => new THREE.Vector3(r[0], r[1], r[2])), false, 'centripetal', 0.5);
  const sp = balloonSprite(4, 'to the grassland', '#3bb273', '#1d6b43'); world.add(sp);
  guideBalloons.push({ sp, phase: 4.2, route: curve, t: 0, len: curve.getLength(), wait: 0, pos: new THREE.Vector3(), fade: 1 });
}
function faceBalloon(b, cam){
  // turn the printed side (+x) and the tag towards the camera
  if(!cam) return;
  const dx = cam.x - b.sp.position.x, dz = cam.z - b.sp.position.z;
  b.sp.rotation.y = Math.atan2(-dz, dx);
  b.sp.userData.tag.rotation.y = Math.PI/2;
}
function setBalloonFade(b, k){
  const m = b.sp.userData.mat; m.transparent = k < 0.999; m.opacity = k;
  b.sp.userData.tag.material.transparent = k < 0.999; b.sp.userData.tag.material.opacity = k;
  b.sp.visible = k > 0.01;
}
function tickBalloons(dt, time, cam){
  for(const b of guideBalloons){
    if(!b.route){
      b.sp.position.set(b.base[0] + Math.sin(time*0.7 + b.phase)*0.06, b.base[1] + Math.sin(time*1.3 + b.phase)*0.09, b.base[2] + Math.cos(time*0.9 + b.phase)*0.06);
      b.sp.rotation.z = Math.sin(time*0.9 + b.phase)*0.05;
      faceBalloon(b, cam);
      continue;
    }
    // drift along the route at walking pace, wait at the gate, fade, and start again at the door
    if(b.wait > 0){ b.wait -= dt; setBalloonFade(b, Math.min(1, Math.max(0, b.wait < 1 ? b.wait : 1))); if(b.wait <= 0){ b.t = 0; } continue; }
    b.t += dt * 1.15 / b.len;
    if(b.t >= 1){ b.t = 1; b.wait = 4; }
    b.route.getPointAt(Math.min(1, Math.max(0, b.t)), b.pos);
    setBalloonFade(b, Math.min(1, b.t * b.len / 2) * Math.min(1, (1 - b.t) * b.len / 1.5 + 0.35));
    b.sp.position.set(b.pos.x + Math.sin(time*0.8 + b.phase)*0.05, b.pos.y + Math.sin(time*1.4 + b.phase)*0.08, b.pos.z);
    b.sp.rotation.z = Math.sin(time*0.9 + b.phase)*0.06;
    faceBalloon(b, cam);
  }
}

// ---------- photo banners (pennants on a string across the sofas) ----------
const FLAGS = 15, flagGeos = [];
for(let i=0;i<FLAGS;i++){
  const g = new THREE.PlaneGeometry(0.27, 0.37); g.translate(0, -0.185, 0);
  const uv = g.attributes.uv, u0 = (i%8)/8, v1 = 1 - ((i/8)|0)/2;
  for(let k=0;k<uv.count;k++) uv.setXY(k, u0 + uv.getX(k)/8, v1 - (1-uv.getY(k))/2);
  flagGeos.push(g);
}
const bowGeo = new THREE.PlaneGeometry(0.22, 0.183);

// Two more pennants with real photos: each person is cut out of the picture in two layers (head and body, in
// assets/photos.png) so they can come alive on the string — the body sways from its base and the head bobbles on
// the neck, like a paper figure in a draught. Sizes are in pennant pixels (320x440 per flag), as the atlas was laid out.
const PHOTOS = [
  {frame:[0, 0, 640, 880], head:[1280, 0, 371, 512], body:[1664, 0, 371, 512], w:165.5, h:228.2, cx:0, bottom:274, neck:[0.475, 0.521]},
  {frame:[640, 0, 640, 880], head:[1280, 512, 384, 453], body:[1664, 512, 384, 453], w:194.2, h:229.4, cx:0, bottom:274, neck:[0.499, 0.53]},
];
const PX = 0.27/320, ATLAS = [2048, 1024];
function atlasUV(geo, r){
  const uv = geo.attributes.uv, u0 = r[0]/ATLAS[0], u1 = (r[0]+r[2])/ATLAS[0], vT = 1 - r[1]/ATLAS[1], vB = 1 - (r[1]+r[3])/ATLAS[1];
  for(let k=0;k<uv.count;k++) uv.setXY(k, u0 + uv.getX(k)*(u1-u0), vB + uv.getY(k)*(vT-vB));
  return geo;
}
const photoGeos = PHOTOS.map(p => {
  const frame = atlasUV(new THREE.PlaneGeometry(0.27, 0.37), p.frame); frame.translate(0, -0.185, 0);
  const w = p.w*PX, h = p.h*PX, nx = (p.neck[0]-0.5)*w, ny = p.neck[1]*h;
  const body = atlasUV(new THREE.PlaneGeometry(w, h), p.body); body.translate(0, h/2, 0);            // origin at its base
  const head = atlasUV(new THREE.PlaneGeometry(w, h), p.head); head.translate(-nx, h/2 - ny, 0);     // origin at the neck
  return { frame, body, head, base: new THREE.Vector3(p.cx*PX, -p.bottom*PX, 0.0025), neck: new THREE.Vector3(nx, ny, 0.002) };
});
const livePhotos = [];
function photoFlag(i){
  const g = new THREE.Group(), pg = photoGeos[i];
  g.add(cutoutMesh(pg.frame, M.photo, true));
  const body = cutoutMesh(pg.body, M.photo, true); body.position.copy(pg.base); g.add(body);
  const head = cutoutMesh(pg.head, M.photo, true); head.position.copy(pg.neck); body.add(head);
  livePhotos.push({ body, head, ph: rr(0, 6.28), w: rr(0.9, 1.15) });
  return g;
}
function tickPhotos(dt, time){
  for(const p of livePhotos){
    const t = time*p.w + p.ph;
    // the body leans a touch from side to side and breathes; the head nods and tilts on the neck, with the odd quick double-nod
    p.body.rotation.z = 0.03*Math.sin(t*1.1) + 0.012*Math.sin(t*2.3 + 1.0);
    const b = 1 + 0.01*Math.sin(t*1.7); p.body.scale.set(b, b, 1);
    const nod = Math.max(0, Math.sin(t*0.37 + 0.6)) ** 6;
    p.head.rotation.z = 0.11*Math.sin(t*1.9) + 0.03*Math.sin(t*4.1 + 0.7);
    p.head.rotation.x = 0.06*Math.sin(t*1.3 + 2.0) + 0.12*nod*Math.sin(t*7.0);
    p.head.rotation.y = 0.10*Math.sin(t*0.8 + 1.2);
  }
}

function banner(zc, span, yEnd, sag, scale){
  const g = new THREE.Group(); world.add(g);
  const pts = [];
  for(let i=0;i<=24;i++){ const t = i/24, u = 2*t-1; pts.push(new THREE.Vector3(XW-0.075, yEnd - sag*(1-u*u), zc + span/2 - t*span)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  g.add(mesh(new THREE.TubeGeometry(curve, 48, 0.004, 5, false), M.string, 0,0,0, false, false));
  // the fifteen drawn portraits with the two photographs among them
  const seq = []; for(let i=0;i<FLAGS;i++){ if(i === 5) seq.push(-1); if(i === 11) seq.push(-2); seq.push(i); }
  seq.forEach((id, k) => {
    const t = (k + 0.5)/seq.length;
    const p = curve.getPointAt(t);
    const f = id >= 0 ? cutoutMesh(flagGeos[id], M.flag, true) : photoFlag(-id - 1);
    f.position.copy(p); f.position.x -= 0.004;
    f.rotation.set(0, -Math.PI/2, 0);
    f.rotateX(rr(-0.08, 0.08)); f.rotateZ(rr(-0.03, 0.03));
    f.scale.setScalar(scale);
    g.add(f);
  });
  for(const s of [-1, 1]){
    const b = cutoutMesh(bowGeo, M.bow, false);
    b.position.set(XW-0.07, yEnd + 0.02, zc + s*span/2); b.rotation.set(0, -Math.PI/2, 0); b.scale.setScalar(scale*1.1);
    g.add(b);
  }
}
for(const z0 of [32, 12, -1.8, -24, -46]) banner(z0 - 1.1, 4.3, 2.52, 0.36, 1);
for(const z of [20, -16, -38, -60]) banner(z, 2.85, 2.5, 0.3, 0.78);

// ---------- MPI boards leaning by the shelves ----------
{
  const boardGeo = new THREE.PlaneGeometry(1.1, 0.3);
  const backGeo = new THREE.BoxGeometry(0.012, 0.3, 1.1);
  for(const z of [1.75, 2.95, -20.4]){
    const gg = new THREE.Group(); gg.position.set(XW - 0.095, 0, z); gg.rotation.z = -0.21;
    const back = mesh(backGeo, M.boardBack, 0.006, 0.15, 0); gg.add(back);
    const face = mesh(boardGeo, M.mpiBoard, -0.001, 0.15, 0, false, true); face.rotation.y = -Math.PI/2; gg.add(face);
    world.add(gg);
  }
}

// ---------- VR Minerva decals on the floor, glass side ----------
{
  const decalGeo = new THREE.PlaneGeometry(1, 753/768);
  const spots = []; let tries = 0;
  while(spots.length < 26 && tries++ < 600){
    const z = rr(Z1+2, Z0-2), x = rr(-1.55, -0.55);
    if(spots.some(s => Math.abs(s.z - z) < 1.6)) continue;
    spots.push({x, z});
  }
  for(const s of spots){
    const d = mesh(decalGeo, M.minerva, s.x, 0.004, s.z, false, true);
    d.rotation.set(-Math.PI/2, 0, rr(0, Math.PI*2)); d.scale.setScalar(rr(0.5, 0.78));
    world.add(d);
  }
}

// ---------- the grills on the terrace ----------
// One kettle grill by the board, and as many more as the sausages need: every sausage lies in a single layer on a
// grate where it can be seen (twelve to a grate), and when a grate is full the next grill is wheeled out beside
// it along the terrace. Visitors add sausages from the board beside the first grill; the board carries the count.
const smoke = [];
let setGrill;
{
  const black = new THREE.MeshStandardMaterial({color:0x1d1c1b, roughness:0.45, metalness:0.35});
  const steel = new THREE.MeshStandardMaterial({color:0xaeb2b5, roughness:0.35, metalness:0.8});
  const blackGloss = new THREE.MeshPhysicalMaterial({color:0x1d1c1b, roughness:0.35, metalness:0.2, clearcoat:0.6, clearcoatRoughness:0.25});
  const R = 0.28, Y = 0.74;
  const emberTex = makeTex(256, 256, (g, w, h) => {
    g.fillStyle = '#1a1210'; g.fillRect(0, 0, w, h);
    for(let i=0;i<90;i++){ const x = rand()*w, y = rand()*h, r = rr(8, 26); const grd = g.createRadialGradient(x, y, 0, x, y, r); grd.addColorStop(0, `rgba(255,${rr(90, 170)|0},30,0.95)`); grd.addColorStop(0.6, 'rgba(200,60,10,0.5)'); grd.addColorStop(1, 'rgba(60,20,10,0)'); g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, Math.PI*2); g.fill(); }
    for(let i=0;i<60;i++){ g.fillStyle = `rgba(30,22,20,${rr(0.5, 0.9)})`; g.beginPath(); g.ellipse(rand()*w, rand()*h, rr(6, 16), rr(4, 10), rand()*3, 0, Math.PI*2); g.fill(); }
  });
  const coalMat = new THREE.MeshStandardMaterial({map:emberTex, emissiveMap:emberTex, emissive:0xffffff, emissiveIntensity:1.1, roughness:1});
  const gripMat = new THREE.MeshStandardMaterial({color:0x6b4a2c, roughness:0.6});
  const thermoMat = new THREE.MeshStandardMaterial({color:0xf2efe8, roughness:0.5});
  const patty = new THREE.MeshStandardMaterial({color:0x6b3f28, roughness:0.7});
  // the sausages: little avatar sausages — the supervisor, in cartoon, wrapped round each one
  const SR = 0.033, SL = 0.10;
  const sausageSide = new THREE.MeshStandardMaterial({map:T.sausage, roughness:0.55});
  const sausageEnd = new THREE.MeshStandardMaterial({color:0x9c4a2a, roughness:0.55});
  const sideGeo = new THREE.CylinderGeometry(SR, SR, SL, 24, 1, true);
  const capGeo = new THREE.SphereGeometry(SR, 16, 10, 0, Math.PI*2, 0, Math.PI/2);
  // twelve places on a grate, all in one layer so none hides another: seven rows across the bars, two end to end
  // in the middle five, one in each of the outer two
  const SLOTS = [];
  for(const [z, n] of [[-0.216, 1], [-0.144, 2], [-0.072, 2], [0, 2], [0.072, 2], [0.144, 2], [0.216, 1]]){
    for(let i=0;i<n;i++) SLOTS.push({ x: (i - (n-1)/2)*0.176, z, y: Y + SR + 0.004, yaw: 0 });
  }
  const PER_GRILL = SLOTS.length;
  const smokeTex = (() => {
    const sc = document.createElement('canvas'); sc.width = sc.height = 64;
    const sg = sc.getContext('2d'); const grd = sg.createRadialGradient(32,32,2,32,32,30); grd.addColorStop(0,'rgba(235,232,228,0.9)'); grd.addColorStop(1,'rgba(235,232,228,0)');
    sg.fillStyle = grd; sg.fillRect(0,0,64,64);
    return new THREE.CanvasTexture(sc);
  })();
  const grills = [];
  function makeGrill(x, z, yaw, withShelf){
    const gg = new THREE.Group(); gg.position.set(x, 0, z); gg.rotation.y = yaw; world.add(gg);
    gg.add(mesh(new THREE.SphereGeometry(R, 48, 24, 0, Math.PI*2, Math.PI/2, Math.PI/2), blackGloss, 0, Y, 0));
    const rim = mesh(new THREE.TorusGeometry(R, 0.012, 10, 64), steel, 0, Y, 0); rim.rotation.x = Math.PI/2; gg.add(rim);
    // lid, hinged open at the back, with its wooden grip, vent and thermometer
    const hinge = new THREE.Group(); hinge.position.set(-R, Y, 0); hinge.rotation.z = 1.95; gg.add(hinge);
    hinge.add(mesh(new THREE.SphereGeometry(R, 48, 24, 0, Math.PI*2, 0, Math.PI/2), blackGloss, R, 0, 0));
    const lidRim = mesh(new THREE.TorusGeometry(R, 0.012, 10, 64), steel, R, 0, 0); lidRim.rotation.x = Math.PI/2; hinge.add(lidRim);
    for(const dz of [-0.06, 0.06]) hinge.add(mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.07, 8), steel, R, R+0.03, dz));
    const grip = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.2, 12), gripMat, R, R+0.07, 0); grip.rotation.x = Math.PI/2; hinge.add(grip);
    hinge.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.008, 16), steel, R + 0.12, R*0.9, 0.1, false, false));
    for(let k=0;k<4;k++) hinge.add(mesh(new THREE.BoxGeometry(0.035, 0.002, 0.004), black, R + 0.12, R*0.9 + 0.005, 0.1 - 0.012 + k*0.008, false, false));
    const thermo = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 20), thermoMat, R - 0.1, R*0.93, -0.1, false, false); thermo.rotation.x = -0.3; hinge.add(thermo);
    const thermoRim = mesh(new THREE.TorusGeometry(0.022, 0.004, 6, 24), steel, R - 0.1, R*0.93, -0.1, false, false); thermoRim.rotation.x = Math.PI/2 - 0.3; hinge.add(thermoRim);
    // grate and coals
    const coals = new THREE.Mesh(new THREE.CircleGeometry(R*0.8, 40), coalMat); coals.rotation.x = -Math.PI/2; coals.position.y = Y - 0.12; gg.add(coals);
    for(let i=-5;i<=5;i++){ const w = Math.sqrt(Math.max(0.01, R*R - (i*0.045)*(i*0.045)))*2*0.9; const bar = mesh(new THREE.CylinderGeometry(0.004, 0.004, w, 8), steel, 0, Y+0.005, i*0.045); bar.rotation.z = Math.PI/2; gg.add(bar); }
    for(const cx of [-0.16, 0.16]){ const cross = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.44, 8), steel, cx, Y, 0); cross.rotation.x = Math.PI/2; gg.add(cross); }
    const grateRing = mesh(new THREE.TorusGeometry(R*0.9, 0.004, 6, 48), steel, 0, Y+0.003, 0); grateRing.rotation.x = Math.PI/2; gg.add(grateRing);
    const sausages = [];
    for(const sl of SLOTS){
      const g = new THREE.Group(); g.position.set(sl.x, sl.y, sl.z); g.rotation.set(0, sl.yaw + rr(-0.1, 0.1), 0);
      const body = new THREE.Group(); body.rotation.x = Math.PI/2; g.add(body);     // the axis along z, the wrap's middle facing up
      body.add(mesh(sideGeo, sausageSide, 0, 0, 0));
      body.add(mesh(capGeo, sausageEnd, 0, SL/2, 0));
      const c2 = mesh(capGeo, sausageEnd, 0, -SL/2, 0); c2.rotation.x = Math.PI; body.add(c2);
      g.visible = false; gg.add(g); sausages.push(g);
    }
    // legs, wheels, ash pan
    for(const [ax, az, wheel] of [[-0.6, 0.8, true], [-0.6, -0.8, true], [1, 0, false]]){
      const leg = mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.56, 8), steel, ax*0.2, Y-R-0.1, az*0.2);
      leg.rotation.z = -ax*0.22; leg.rotation.x = az*0.22; gg.add(leg);
      if(wheel){ const wh = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 18), black, ax*0.3, 0.07, az*0.3); wh.rotation.x = Math.PI/2; gg.add(wh); }
    }
    gg.add(mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.04, 24), black, 0, Y-R-0.06, 0));
    if(withShelf){   // a slatted side shelf with the tongs, a brush and a jar of mustard, on the first grill only
      const slat = new THREE.MeshStandardMaterial({color:0x8a6a44, roughness:0.75});
      for(const cx of [-0.195, 0.195]) gg.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.025, 16), patty, cx, Y+0.02, 0.2, false, false));
      for(let k=0;k<4;k++) gg.add(mesh(new THREE.BoxGeometry(0.3, 0.012, 0.045), slat, 0.1, Y - 0.02, R + 0.08 + k*0.055));
      for(const cx of [-0.04, 0.24]) gg.add(mesh(new THREE.BoxGeometry(0.012, 0.012, 0.22), steel, cx, Y - 0.03, R + 0.16));
      for(const cx of [-0.04, 0.24]){ const brace = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.26, 6), steel, cx, Y - 0.13, R + 0.08); brace.rotation.x = 0.6; gg.add(brace); }
      const tongs = new THREE.Group(); tongs.position.set(0.06, Y - 0.01, R + 0.17); tongs.rotation.y = 0.4; gg.add(tongs);
      const tongSteel = new THREE.MeshStandardMaterial({color:0x9a9ea2, roughness:0.6, metalness:0.6});
      for(const dz of [-0.012, 0.012]) tongs.add(mesh(new THREE.BoxGeometry(0.26, 0.006, 0.012), tongSteel, 0, 0, dz, false, false));
      tongs.add(mesh(new THREE.BoxGeometry(0.03, 0.01, 0.04), new THREE.MeshStandardMaterial({color:0x2a2a2a}), -0.11, 0, 0, false, false));
      gg.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.07, 16), new THREE.MeshStandardMaterial({color:0xd9a520, roughness:0.4}), 0.2, Y + 0.025, R + 0.2));
      gg.add(mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.015, 16), new THREE.MeshStandardMaterial({color:0xe8e2d6, roughness:0.5}), 0.2, Y + 0.067, R + 0.2, false, false));
      const brush = mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.18, 8), gripMat, 0.22, Y - 0.005, R + 0.1, false, false); brush.rotation.z = Math.PI/2; brush.rotation.y = 0.3; gg.add(brush);
    }
    for(let i=0;i<7;i++){
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:smokeTex, transparent:true, opacity:0.5, depthWrite:false}));
      sp.userData.t = i/7; gg.add(sp); smoke.push(sp);
    }
    addBox(x - 0.45, x + 0.45, z - 0.45, z + 0.45);
    grills.push({ gg, sausages });
    return gg;
  }
  makeGrill(-5.3, -6.2, 0.5, true);
  // the next grills go down the terrace along the planter, a stride apart
  const nextSpot = (k) => [-6.4, -8.3 - 1.5*(k - 1), 0.2 + rr(-0.25, 0.25)];
  setGrill = function(n){
    while(grills.length*PER_GRILL < n && grills.length < 44){ const [x, z, yaw] = nextSpot(grills.length); makeGrill(x, z, yaw, false); }
    let left = n;
    grills.forEach((gr, gi) => {
      const last = gi === grills.length - 1;
      gr.sausages.forEach((sg, i) => { sg.visible = i < left; });
      left = Math.max(0, left - PER_GRILL);
      if(last && left > 0) gr.sausages.forEach((sg) => { sg.visible = true; });   // past 44 grills they just keep piling on the last one
    });
    grillBoard.count = n; if(grillSign) grillSign.redraw();
  };
}

// sandwich boards: a canvas face on an A-frame; look at one and press E (or tap) to use it
const boardWoodTex = woodTex.clone(); boardWoodTex.needsUpdate = true; boardWoodTex.repeat.set(0.5, 0.7);
const boardWood = new THREE.MeshStandardMaterial({map:boardWoodTex, color:0x7a5a3c, roughness:0.8});
const paperTex = makeTex(256, 256, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); for(let i=0;i<5000;i++){ g.fillStyle = `rgba(${rand()<0.5?200:255},${rand()<0.5?190:245},${rand()<0.5?170:230},0.18)`; g.fillRect(rand()*w, rand()*h, rr(1, 3), 1); } });
function sandwichBoard(x, z, yaw, kind, paint){
  const bg = new THREE.Group(); bg.position.set(x, 0, z); bg.rotation.y = yaw; world.add(bg);
  const W = 0.64, Hh = 0.84, tilt = 0.17;
  const bc = document.createElement('canvas'); bc.width = 1024; bc.height = 1344; const bx = bc.getContext('2d');   // drawn at 1.6× the old size
  const bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace; bt.anisotropy = maxAniso;
  const redraw = () => {
    bx.setTransform(1.6, 0, 0, 1.6, 0, 0);
    bx.fillStyle = '#f3ead8'; bx.fillRect(0,0,640,840);
    const paper = paperTex.image; bx.globalAlpha = 0.5; for(let yy=0; yy<840; yy+=160) for(let xx=0; xx<640; xx+=160) bx.drawImage(paper, xx, yy, 160, 160); bx.globalAlpha = 1;
    bx.strokeStyle = '#2b3a2a'; bx.lineWidth = 10; bx.strokeRect(5,5,630,830);
    bx.strokeStyle = 'rgba(43,58,42,0.35)'; bx.lineWidth = 2; bx.strokeRect(16,16,608,808);
    bx.textAlign = 'center'; bx.textBaseline = 'middle';
    paint(bx); bt.needsUpdate = true;
  };
  redraw();
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
  const faceMat = new THREE.MeshStandardMaterial({map:bt, roughness:0.92});
  const panelGeo = new THREE.PlaneGeometry(W, Hh), frameGeo = new RoundedBoxGeometry(W+0.07, Hh+0.07, 0.03, 3, 0.01);
  for(const s of [1, -1]){
    const pivot = new THREE.Group(); pivot.position.set(0, 0.95, 0); pivot.rotation.x = -s*tilt; bg.add(pivot);
    pivot.add(mesh(frameGeo, boardWood, 0, -Hh/2-0.04, s*0.015));
    const face = new THREE.Mesh(panelGeo, faceMat); face.position.set(0, -Hh/2-0.04, s*0.031);
    if(s < 0) face.rotation.y = Math.PI;
    face.castShadow = true; face.receiveShadow = true; pivot.add(face);
    // the chain that keeps the legs from splaying
    const chain = mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.26, 5), M.chrome, 0, -Hh - 0.02, s*0.12, false, false); chain.rotation.x = Math.PI/2; bg.add(chain);
  }
  bg.add(mesh(new THREE.BoxGeometry(W+0.07, 0.05, 0.07), boardWood, 0, 0.96, 0));
  for(const sx of [-W/2 + 0.04, W/2 - 0.04]){ const h = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 10), M.chrome, sx, 0.965, 0, false, false); h.rotation.z = Math.PI/2; bg.add(h); }
  const hit = new THREE.Mesh(new THREE.BoxGeometry(W+0.1, 1.3, 0.5), new THREE.MeshBasicMaterial({transparent:true, opacity:0, depthWrite:false, colorWrite:false}));
  hit.position.y = 0.65; hit.userData = {kind}; bg.add(hit);
  addBox(x-0.36, x+0.36, z-0.25, z+0.25);
  return { group: bg, hit, redraw };
}
function drawAvatar(bx, y, h){
  const im = T.avatar.image;
  if(im && im.complete && im.naturalWidth){ const w = h*im.naturalWidth/im.naturalHeight; bx.drawImage(im, 320-w/2, y, w, h); }
}

// beside the grill: "Want to grill the supervisor?" — adds a sausage
const grillBoard = { count: 0 };
const grillSign = sandwichBoard(-5.0, -4.75, 0.25, 'grill', (bx) => {
  const n = grillBoard.count;
  bx.fillStyle = '#5d554d'; bx.font = '500 26px "DM Mono", ui-monospace, monospace'; bx.fillText('THE TERRACE GRILL', 320, 62);
  bx.fillStyle = '#2b3a2a'; bx.font = '700 60px "Bricolage Grotesque", ui-sans-serif, sans-serif';
  bx.fillText('Want to grill', 320, 134); bx.fillText('the supervisor?', 320, 198);
  drawAvatar(bx, 248, 300);
  bx.fillStyle = '#b5482f'; bx.font = '700 44px "Bricolage Grotesque", ui-sans-serif, sans-serif';
  bx.fillText(n ? n + (n === 1 ? ' sausage' : ' sausages') + (n > 12 ? ' on the grills' : ' on the grill') : 'The grate is still empty', 320, 608);
  bx.fillStyle = '#5d554d'; bx.font = '500 28px "DM Mono", ui-monospace, monospace';
  bx.fillText(isTouch ? 'tap here to add a sausage' : 'E / click here to add a sausage', 320, 676);
  bx.font = '500 24px "DM Mono", ui-monospace, monospace'; bx.fillText('every sausage is a little him', 320, 736);
});
const grillHit = grillSign.hit, drawGrillBoard = grillSign.redraw;

// just past the first glass door, inside: "Make a wish for the supervisor" — the wish gets pinned on a poster
const wishBoard = { count: 0 };
const confetti = []; { let sd = 11; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const cols = ['#e9a23b', '#c94f3d', '#5a8fd6', '#6aa84f', '#d46aa3', '#f2d16b'];
  for(let i=0;i<34;i++) confetti.push({ x: 20 + r()*600, y: 14 + r()*820, s: 4 + r()*6, c: cols[(r()*cols.length)|0], a: r()*Math.PI }); }
const wishSign = sandwichBoard(-0.95, -2.7, 0.15, 'wish', (bx) => {
  const n = wishBoard.count;
  for(const c of confetti){ bx.save(); bx.translate(c.x, c.y); bx.rotate(c.a); bx.fillStyle = c.c; bx.globalAlpha = 0.85; bx.fillRect(-c.s/2, -c.s/3, c.s, c.s*0.66); bx.restore(); }
  bx.globalAlpha = 1;
  bx.fillStyle = '#5d554d'; bx.font = '500 26px "DM Mono", ui-monospace, monospace'; bx.fillText('GREETINGS FOR THE SUPERVISOR', 320, 62);
  bx.fillStyle = '#2b3a2a'; bx.font = '700 46px "Bricolage Grotesque", ui-sans-serif, sans-serif';
  bx.fillText('Send your greeting', 320, 128); bx.fillText('messages or appreciations', 320, 182);
  drawAvatar(bx, 222, 250);
  bx.fillStyle = '#b5482f'; bx.font = '700 40px "Bricolage Grotesque", ui-sans-serif, sans-serif';
  bx.fillText(n ? n + (n === 1 ? ' message' : ' messages') + ' on the wall' : 'Nothing on the wall yet', 320, 520);
  bx.fillStyle = '#5d554d'; bx.font = '500 27px "DM Mono", ui-monospace, monospace';
  bx.fillText(isTouch ? 'tap here to write one' : 'E / click here to write one', 320, 578);
  bx.font = '500 22px "DM Mono", ui-monospace, monospace';
  bx.fillText('it gets pinned on one of the posters', 320, 632); bx.fillText('along the wall', 320, 662);
  bx.fillStyle = '#3f3a35'; bx.font = '600 22px "Bricolage Grotesque", ui-sans-serif, sans-serif';
  bx.fillText('Want to deliver complaints?', 320, 722);
  bx.font = '500 21px "Bricolage Grotesque", ui-sans-serif, sans-serif';
  bx.fillText('Follow the sign to the grill,', 320, 756); bx.fillText('or go find the trash-can.', 320, 786);
});
const wishHit = wishSign.hit;
function setWishes(n){ wishBoard.count = n; wishSign.redraw(); }

function tickSmoke(dt){
  for(const sp of smoke){
    sp.userData.t += dt*0.22; if(sp.userData.t > 1) sp.userData.t -= 1;
    const t = sp.userData.t;
    sp.position.set(Math.sin(t*9)*0.08 + t*0.15, 0.95 + t*1.3, Math.cos(t*7)*0.06);
    const sz = 0.18 + t*0.5; sp.scale.set(sz, sz, 1);
    sp.material.opacity = 0.42*(1-t)*(t < 0.1 ? t/0.1 : 1);
  }
}


// ---------- outdoors: steps, meadow, gate, alpacas ----------
function groundY(x, z){
  if(x > STAIR.top) return 0;
  if(z > STAIR.z1 && z < STAIR.z0 && x > STAIR.bottom) return -1.4 * Math.min(1, (STAIR.top - x)/(STAIR.top - STAIR.bottom));
  return -1.4;
}
M.step = new THREE.MeshStandardMaterial({color:0xcbc3b5, roughness:0.9});
{
  const n = 7, run = (STAIR.top - STAIR.bottom)/n, w = STAIR.z0 - STAIR.z1, zc = (STAIR.z0 + STAIR.z1)/2;
  for(let k=0;k<n;k++){
    const top = -0.2*(k+1), xa = STAIR.top - k*run, hgt = top + 1.42;
    world.add(mesh(new THREE.BoxGeometry(run, hgt, w), M.step, xa - run/2, -1.4 + hgt/2, zc, true, true));
  }
  for(const z of [STAIR.z0, STAIR.z1]) world.add(mesh(new THREE.BoxGeometry(2.4, 1.42, 0.12), M.step, STAIR.top - 1.2, -0.69, z + (z===STAIR.z0 ? 0.06 : -0.06), true, true));
  addBox(-9.1, STAIR.top, STAIR.z0, Z0+5); addBox(-9.1, STAIR.top, Z1, STAIR.z1);
  addBox(STAIR.bottom, STAIR.top, STAIR.z0, STAIR.z0+0.15); addBox(STAIR.bottom, STAIR.top, STAIR.z1-0.15, STAIR.z1);
}
for(const t of TREES) addBox(t.x-0.32, t.x+0.32, t.z-0.32, t.z+0.32);   // the trunks

// the gate to the Ili grassland (a separate world: vibe-shepherding)
let gateHit, owl, owlHead; const owlEyes = [];
{
  const GX = -27, GZ = -15, wood = new THREE.MeshStandardMaterial({color:0x8a6a48, roughness:0.85});
  const gg = new THREE.Group(); gg.position.set(GX, -1.47, GZ); world.add(gg);
  for(const z of [-1.1, 1.1]) gg.add(mesh(new THREE.BoxGeometry(0.16, 2.3, 0.16), wood, 0, 1.15, z));
  gg.add(mesh(new THREE.BoxGeometry(0.12, 0.12, 2.36), wood, 0, 2.3, 0));
  const leaf = new THREE.Group(); leaf.position.set(0, 0, -1.02); leaf.rotation.y = 0.9; gg.add(leaf);
  for(let i=0;i<6;i++) leaf.add(mesh(new THREE.BoxGeometry(0.03, 1.1 + (i%2)*0.1, 0.09), wood, 0, 0.62, 0.12 + i*0.33));
  for(const y of [0.35, 0.95]) leaf.add(mesh(new THREE.BoxGeometry(0.035, 0.07, 1.95), wood, 0.03, y, 1.0));
  const sc = document.createElement('canvas'); sc.width = 1024; sc.height = 400; const sg = sc.getContext('2d');
  function drawSign(){
    sg.fillStyle = '#f1e9d8'; sg.fillRect(0,0,1024,400); sg.strokeStyle = '#8a6a48'; sg.lineWidth = 14; sg.strokeRect(7,7,1010,386);
    sg.textAlign = 'center'; sg.textBaseline = 'middle';
    sg.fillStyle = '#2b3a2a'; sg.font = '700 96px "Bricolage Grotesque", ui-sans-serif, sans-serif'; sg.fillText('ILI GRASSLAND  →', 512, 112);
    sg.fillStyle = '#5d554d'; sg.font = '500 40px "DM Mono", ui-monospace, monospace';
    sg.fillText('Ranran raises these cute alpacas', 512, 232); sg.fillText('as she vibe-shepherds everyday', 512, 300);
  }
  drawSign();
  const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace; st.anisotropy = maxAniso;
  const sign = mesh(new THREE.PlaneGeometry(1.6, 0.625), new THREE.MeshStandardMaterial({map:st, roughness:0.9, side:THREE.DoubleSide}), 0.02, 2.69, 0, true, true);
  sign.rotation.y = Math.PI/2; gg.add(sign);
  gg.add(mesh(new THREE.BoxGeometry(0.1, 0.1, 1.9), wood, 0, 3.06, 0));
  // the owl: out on the end of the top beam at night, turning its head now and then, hooting every so often
  {
    const feather = new THREE.MeshStandardMaterial({color:0x4a3826, roughness:0.95, flatShading:true});
    const pale = new THREE.MeshStandardMaterial({color:0x8a7357, roughness:0.95, flatShading:true});
    const o = new THREE.Group(); o.position.set(0, 3.11, 0.72); o.rotation.y = -0.9; gg.add(o); owl = o;
    const body = mesh(new THREE.SphereGeometry(1, 10, 8), feather, 0, 0.14, 0); body.scale.set(0.085, 0.14, 0.09); o.add(body);
    const breast = mesh(new THREE.SphereGeometry(1, 10, 8), pale, 0, 0.12, 0.035, false, false); breast.scale.set(0.06, 0.1, 0.06); o.add(breast);
    const head = new THREE.Group(); head.position.y = 0.27; o.add(head); owlHead = head;
    head.add(mesh(new THREE.SphereGeometry(0.068, 12, 10), feather, 0, 0, 0));
    for(const sx of [-1, 1]){
      const tuft = mesh(new THREE.ConeGeometry(0.018, 0.05, 6), feather, sx*0.045, 0.06, -0.01); tuft.rotation.z = -sx*0.5; head.add(tuft);
      head.add(mesh(new THREE.CircleGeometry(0.02, 12), pale, sx*0.026, 0.008, 0.062, false, false));
      const eye = mesh(new THREE.SphereGeometry(0.011, 10, 8), new THREE.MeshStandardMaterial({color:0xffd34d, emissive:0xffb400, emissiveIntensity:1.4}), sx*0.026, 0.008, 0.07, false, false);
      head.add(eye); owlEyes.push(eye);
      head.add(mesh(new THREE.SphereGeometry(0.005, 8, 6), new THREE.MeshBasicMaterial({color:0x111111}), sx*0.026, 0.008, 0.08, false, false));
    }
    const beak = mesh(new THREE.ConeGeometry(0.009, 0.022, 6), new THREE.MeshStandardMaterial({color:0x2b2117}), 0, -0.012, 0.072, false, false); beak.rotation.x = Math.PI/2; head.add(beak);
    for(const sx of [-1, 1]) o.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 6), pale, sx*0.025, 0.02, 0.02, false, false));
    o.visible = false;
  }
  gateHit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.2, 2.6), new THREE.MeshBasicMaterial({transparent:true, opacity:0, depthWrite:false, colorWrite:false}));
  gateHit.position.y = 1.6; gateHit.userData = {kind:'gate'}; gg.add(gateHit);
  addBox(GX-0.1, GX+0.1, GZ-1.2, GZ-1.0); addBox(GX-0.1, GX+0.1, GZ+1.0, GZ+1.2);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(()=>{ drawSign(); st.needsUpdate = true; });
}

// ---------- the one and only bin ----------
const BIN = {x:1.62, z:-5.88, r:0.13, h:0.32};
const binMat = new THREE.MeshStandardMaterial({color:0x2f2d2a, roughness:0.45, metalness:0.6});
let binHit, balls;
const BALL_CAP = 40;
{
  const gg = new THREE.Group(); gg.position.set(BIN.x, 0, BIN.z);
  gg.add(mesh(new THREE.CylinderGeometry(BIN.r, BIN.r, 0.012, 24), binMat, 0, 0.006, 0));
  for(let i=0;i<22;i++){ const a = i/22*Math.PI*2; gg.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, BIN.h, 5), binMat, Math.cos(a)*BIN.r, BIN.h/2, Math.sin(a)*BIN.r)); }
  for(const y of [0.03, 0.17, BIN.h-0.006]){ const ring = mesh(new THREE.TorusGeometry(BIN.r, 0.005, 6, 40), binMat, 0, y, 0); ring.rotation.x = Math.PI/2; gg.add(ring); }
  binHit = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.6, 12), new THREE.MeshBasicMaterial({transparent:true, opacity:0, depthWrite:false, colorWrite:false}));
  binHit.position.y = 0.3; binHit.userData = {kind:'bin'}; gg.add(binHit);
  world.add(gg);
  addBox(BIN.x-0.16, BIN.x+0.16, BIN.z-0.16, BIN.z+0.16);

  // crumpled paper: one ball per complaint
  const ballGeo = new THREE.SphereGeometry(0.046, 8, 6);
  { const pa = ballGeo.attributes.position; for(let i=0;i<pa.count;i++) pa.setXYZ(i, pa.getX(i)*rr(0.7,1.25), pa.getY(i)*rr(0.7,1.25), pa.getZ(i)*rr(0.7,1.25)); ballGeo.computeVertexNormals(); }
  balls = new THREE.InstancedMesh(ballGeo, new THREE.MeshStandardMaterial({color:0xf3eee4, roughness:0.95, flatShading:true}), BALL_CAP);
  const d = new THREE.Object3D();
  for(let i=0;i<BALL_CAP;i++){
    if(i < 16){ const a = rand()*Math.PI*2, rad = rand()*0.07; d.position.set(BIN.x+Math.cos(a)*rad, 0.045 + i*0.016, BIN.z+Math.sin(a)*rad); }
    else { d.position.set(BIN.x - 0.26 - rand()*0.34, 0.04, BIN.z + rr(-0.4, 0.4)); }
    d.rotation.set(rand()*3, rand()*3, rand()*3); const sc = rr(0.8,1.15); d.scale.set(sc,sc,sc); d.updateMatrix();
    balls.setMatrixAt(i, d.matrix);
  }
  balls.instanceMatrix.needsUpdate = true;
  balls.count = 0; balls.castShadow = true; balls.receiveShadow = true; balls.frustumCulled = false;
  world.add(balls);
}


// ---------- the tally, on the stone wall by where you start ----------
let setStats;
{
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso;
  const stats = { wall: 0, sign: 0, grill: 0, bin: 0, fire: 0 };
  const draw = () => {
    const W = c.width, H = c.height;
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#141a2c'); bg.addColorStop(1, '#0b0f1c');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const sheen = g.createRadialGradient(W*0.2, 0, 0, W*0.2, 0, W*0.9); sheen.addColorStop(0, 'rgba(120,150,220,0.18)'); sheen.addColorStop(1, 'rgba(120,150,220,0)');
    g.fillStyle = sheen; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(190,205,240,0.35)'; g.lineWidth = 3; g.strokeRect(14, 14, W-28, H-28);
    g.textBaseline = 'middle';
    g.fillStyle = 'rgba(190,205,240,0.75)'; g.font = '500 30px "DM Mono", ui-monospace, monospace'; g.textAlign = 'left';
    g.fillText('SO FAR, FOR THE SUPERVISOR', 56, 70);
    const rows = [['greetings', stats.wall, '#ffd27a'], ['signatures', stats.sign, '#9fe0ff'], ['sausages', stats.grill, '#ffa36b'], ['marshmallows', stats.fire, '#ffe7c2'], ['complaints', stats.bin, '#c9b8ff']];
    rows.forEach(([label, n, col], i) => {
      const y = 150 + i*74;
      g.fillStyle = col; g.font = '700 58px "Bricolage Grotesque", ui-sans-serif, sans-serif'; g.textAlign = 'right'; g.fillText(String(n), 300, y);
      g.shadowColor = col; g.shadowBlur = 18; g.fillText(String(n), 300, y); g.shadowBlur = 0;
      g.fillStyle = 'rgba(232,236,248,0.9)'; g.font = '500 36px "DM Mono", ui-monospace, monospace'; g.textAlign = 'left'; g.fillText(label, 340, y);
      g.fillStyle = 'rgba(190,205,240,0.15)'; g.fillRect(56, y + 36, W - 112, 1);
    });
    tex.needsUpdate = true;
  };
  draw();
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  const z = 2.5, y = 1.95;
  world.add(mesh(new THREE.BoxGeometry(0.05, 0.62, 1.2), new THREE.MeshStandardMaterial({color:0x202226, roughness:0.4, metalness:0.5}), XW - 0.03, y, z));
  const face = mesh(new THREE.PlaneGeometry(1.14, 0.57), new THREE.MeshStandardMaterial({map:tex, emissive:0xffffff, emissiveMap:tex, emissiveIntensity:0.9, roughness:0.25}), XW - 0.058, y, z, false, false);
  face.rotation.y = -Math.PI/2; world.add(face);
  setStats = (counts) => { Object.assign(stats, counts); draw(); };
}

// ---------- the campfire by the stream ----------
// Down on the meadow past the gate, a few metres from the bank: a ring of stones, logs to sit on, flames (three
// crossed sheets of shader fire), sparks, smoke, a light that flickers at night, and marshmallows on sticks —
// one per visitor who toasts one (a 'fire' note; up to 12 show round the fire, the pop-up carries the count).
const FIRE = { x: SITE.fire.x, z: SITE.fire.z };
let fireHit, setFire, tickFire, tickOwl, owlWorld;
{
  const [wx, wz] = toWorld(FIRE.x, FIRE.z);
  const fy = heightAt(wx, wz) - SITE.H0;
  FIRE.y = fy;
  const fg = new THREE.Group(); fg.position.set(FIRE.x, fy, FIRE.z); world.add(fg);
  const stone = new THREE.MeshStandardMaterial({color:0x7d7a74, roughness:0.95, flatShading:true});
  const charred = new THREE.MeshStandardMaterial({color:0x2a211b, roughness:0.95});
  for(let i=0;i<15;i++){
    const a = i/15*Math.PI*2 + rr(-0.1, 0.1), r = 0.58 + rr(-0.03, 0.03), sc = rr(0.09, 0.15);
    const st = mesh(new THREE.DodecahedronGeometry(1, 0), stone, Math.cos(a)*r, sc*0.45, Math.sin(a)*r); st.scale.set(sc*rr(1, 1.5), sc*0.8, sc*rr(0.9, 1.3)); st.rotation.set(rand()*3, rand()*3, rand()*3); fg.add(st);
  }
  const ash = mesh(new THREE.CircleGeometry(0.5, 20), new THREE.MeshStandardMaterial({color:0x3b3733, roughness:1}), 0, 0.012, 0, false, true); ash.rotation.x = -Math.PI/2; fg.add(ash);
  for(let i=0;i<4;i++){   // the logs on the fire, crossed
    const log = mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.72, 9), M.bark, 0, 0.09 + i*0.03, 0);
    log.rotation.set(0, i*0.8 + 0.3, Math.PI/2 - 0.18 + rr(-0.1, 0.1)); fg.add(log);
    const end = mesh(new THREE.SphereGeometry(0.07, 8, 6), charred, Math.cos(i*0.8 + 0.3)*0.0, 0.11 + i*0.03, 0, false, false); end.scale.set(1, 0.6, 1); fg.add(end);
  }
  const embers = mesh(new THREE.CircleGeometry(0.3, 18), new THREE.MeshStandardMaterial({color:0x5a2a12, emissive:0xff6a1f, emissiveIntensity:1.2, roughness:1}), 0, 0.03, 0, false, false);
  embers.rotation.x = -Math.PI/2; fg.add(embers);
  // the flames
  const flameVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const flameFrag = `
    uniform float uTime; uniform float uSeed; uniform float uHeat;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
    float fbm(vec2 p){ return 0.5*noise(p) + 0.25*noise(p*2.03 + 1.7) + 0.125*noise(p*4.1 + 3.1); }
    void main(){
      vec2 uv = vUv;
      float x = (uv.x - 0.5) * 2.0;
      float n = fbm(vec2(uv.x*3.0 + uSeed, uv.y*3.5 - uTime*2.0 + uSeed*3.0));
      float n2 = fbm(vec2(uv.x*5.0 - uSeed, uv.y*6.0 - uTime*3.0));
      float width = (1.0 - uv.y*0.8) * (0.7 + 0.5*n);
      float body = 1.0 - smoothstep(width*0.45, width, abs(x + (n2 - 0.5)*0.5*uv.y));
      float tip = 1.0 - smoothstep(0.45 + 0.45*n, 1.0, uv.y);
      float base = smoothstep(0.0, 0.1, uv.y);
      float f = body * tip * base * uHeat;
      float core = smoothstep(0.4, 1.0, f) * (1.0 - uv.y*0.6);
      vec3 col = mix(vec3(0.85, 0.12, 0.01), vec3(1.0, 0.5, 0.06), smoothstep(0.08, 0.45, f));
      col = mix(col, vec3(1.0, 0.93, 0.62), core);
      gl_FragColor = vec4(col, f);
    }`;
  const flames = [];
  for(let i=0;i<3;i++){
    const mat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uSeed: { value: i*1.37 }, uHeat: { value: 1 } }, vertexShader: flameVert, fragmentShader: flameFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.05), mat); fl.position.y = 0.52; fl.rotation.y = i*Math.PI/3; fl.frustumCulled = false; fg.add(fl); flames.push(fl);
  }
  const light = new THREE.PointLight(0xff8c3c, 0, 10, 2); light.position.y = 0.6; fg.add(light);
  // sparks
  const NS = 48, sparkPos = new Float32Array(NS*3), sparkA = new Float32Array(NS), sparks = [];
  for(let i=0;i<NS;i++) sparks.push({ t: rand()*1.6, life: rr(0.9, 1.8), x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3).setUsage(THREE.DynamicDrawUsage));
  sparkGeo.setAttribute('aGlow', new THREE.BufferAttribute(sparkA, 1).setUsage(THREE.DynamicDrawUsage));
  const sparkMat = new THREE.ShaderMaterial({ uniforms: { uPixelRatio: { value: 1 } },
    vertexShader: `attribute float aGlow; uniform float uPixelRatio; varying float vG; void main(){ vG = aGlow; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = min(4.0 * (8.0 / max(-mv.z, 1.0)), 16.0) * uPixelRatio; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vG; void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.2, r) * vG; gl_FragColor = vec4(mix(vec3(1.0, 0.4, 0.05), vec3(1.0, 0.9, 0.5), vG), a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const sparkPts = new THREE.Points(sparkGeo, sparkMat); sparkPts.frustumCulled = false; fg.add(sparkPts);
  // smoke
  const sc = document.createElement('canvas'); sc.width = sc.height = 64; const sg = sc.getContext('2d');
  const grd = sg.createRadialGradient(32,32,2,32,32,30); grd.addColorStop(0,'rgba(200,196,190,0.85)'); grd.addColorStop(1,'rgba(200,196,190,0)'); sg.fillStyle = grd; sg.fillRect(0,0,64,64);
  const smokeTex = new THREE.CanvasTexture(sc); const puffs = [];
  for(let i=0;i<6;i++){ const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:smokeTex, transparent:true, opacity:0.35, depthWrite:false})); sp.userData.t = i/6; fg.add(sp); puffs.push(sp); }
  // logs to sit on, round the fire
  const logEnd = new THREE.MeshStandardMaterial({color:0xb79a72, roughness:0.9});
  for(const a of [0.4, 2.5, 4.4]){   // lying across the line to the fire, so you sit facing it
    const cx = Math.cos(a)*1.55, cz = Math.sin(a)*1.55, ax = -Math.sin(a), az = Math.cos(a);
    const seat = mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.4, 12), M.bark, cx, 0.17, cz); seat.rotation.set(0, Math.PI/2 - a, Math.PI/2); fg.add(seat);
    for(const e of [-0.7, 0.7]){ const cap = mesh(new THREE.CircleGeometry(0.17, 12), logEnd, cx + ax*e, 0.17, cz + az*e, false, false); cap.rotation.y = -a + (e > 0 ? 0 : Math.PI); fg.add(cap); }
    const ex = Math.abs(ax)*0.7 + Math.abs(az)*0.2, ez = Math.abs(az)*0.7 + Math.abs(ax)*0.2;
    addBox(FIRE.x + cx - ex, FIRE.x + cx + ex, FIRE.z + cz - ez, FIRE.z + cz + ez);
  }
  addBox(FIRE.x - 0.62, FIRE.x + 0.62, FIRE.z - 0.62, FIRE.z + 0.62);
  // marshmallows on sticks, held out towards the fire from round about
  const mallowTex = makeTex(64, 32, (g, w, h) => { g.fillStyle = '#f7f1e8'; g.fillRect(0, 0, w, h); const t = g.createLinearGradient(0, 0, w, 0); t.addColorStop(0, 'rgba(120,70,30,0)'); t.addColorStop(0.55, 'rgba(120,70,30,0.15)'); t.addColorStop(1, 'rgba(90,45,15,0.85)'); g.fillStyle = t; g.fillRect(0, 0, w, h); });
  const mallowMat = new THREE.MeshStandardMaterial({map:mallowTex, roughness:0.8});
  const stickMat = new THREE.MeshStandardMaterial({color:0xcbb088, roughness:0.9});
  const sticks = [];
  for(let i=0;i<12;i++){
    const a = 0.15 + i*(Math.PI*2/12) + rr(-0.06, 0.06), r0 = 1.25, r1 = 0.36, y0 = 0.62, y1 = 0.5;
    const p0 = new THREE.Vector3(Math.cos(a)*r0, y0, Math.sin(a)*r0), p1 = new THREE.Vector3(Math.cos(a)*r1, y1, Math.sin(a)*r1);
    const len = p0.distanceTo(p1);
    const st = mesh(new THREE.CylinderGeometry(0.007, 0.009, len, 6), stickMat); st.position.copy(p0).add(p1).multiplyScalar(0.5);
    st.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize());
    const mm = mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.052, 14), mallowMat, 0, 0, 0); mm.position.copy(p1); mm.quaternion.copy(st.quaternion); mm.rotation.y += rand()*3;
    const grp = new THREE.Group(); grp.add(st, mm); grp.visible = false; fg.add(grp); sticks.push(grp);
  }
  setFire = (n) => { for(let i=0;i<sticks.length;i++) sticks[i].visible = i < n; };
  // the little sign on a post, facing the way you come from the gate
  const signTex = makeTex(512, 256, (g, w, h) => {
    g.fillStyle = '#e9dcc2'; g.fillRect(0, 0, w, h); g.strokeStyle = '#6b5236'; g.lineWidth = 10; g.strokeRect(5, 5, w-10, h-10);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#2b3a2a'; g.font = '700 58px "Bricolage Grotesque", ui-sans-serif, sans-serif'; g.fillText('Toast a marshmallow', w/2, 84);
    g.fillStyle = '#5d554d'; g.font = '500 30px "DM Mono", ui-monospace, monospace'; g.fillText('for the supervisor — ' + (isTouch ? 'tap the fire' : 'E at the fire'), w/2, 168);
  });
  const post = new THREE.Group(); post.position.set(2.35, 0, 0.35); post.rotation.y = -0.85; fg.add(post);
  post.add(mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.1, 8), M.bark, 0, 0.55, 0));
  post.add(mesh(new THREE.PlaneGeometry(0.7, 0.35), new THREE.MeshStandardMaterial({map:signTex, roughness:0.9, side:THREE.DoubleSide}), 0, 1.05, 0.02));
  addBox(FIRE.x + 2.35 - 0.08, FIRE.x + 2.35 + 0.08, FIRE.z + 0.35 - 0.08, FIRE.z + 0.35 + 0.08);
  fireHit = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 1.7, 12), new THREE.MeshBasicMaterial({transparent:true, opacity:0, depthWrite:false, colorWrite:false}));
  fireHit.position.y = 0.85; fireHit.userData = {kind:'fire'}; fg.add(fireHit);
  tickFire = (dt, time, night) => {
    const flicker = 0.78 + 0.14*Math.sin(time*11.3) + 0.08*Math.sin(time*17.7 + 1.0);
    light.intensity = 7 * flicker * (0.15 + 0.85*night);
    embers.material.emissiveIntensity = 0.9 + 0.5*flicker;
    for(const fl of flames) fl.material.uniforms.uTime.value = time;
    for(let i=0;i<NS;i++){
      const s = sparks[i]; s.t += dt;
      if(s.t > s.life){ s.t = 0; s.life = rr(0.8, 1.9); s.x = rr(-0.12, 0.12); s.y = rr(0.3, 0.6); s.z = rr(-0.12, 0.12); s.vx = rr(-0.35, 0.35); s.vy = rr(0.9, 1.9); s.vz = rr(-0.35, 0.35); }
      s.vx += Math.sin(time*7 + i)*0.9*dt; s.vz += Math.cos(time*6 + i*1.3)*0.9*dt; s.vy -= 0.15*dt;
      s.x += s.vx*dt; s.y += s.vy*dt; s.z += s.vz*dt;
      sparkPos[i*3] = s.x; sparkPos[i*3+1] = s.y; sparkPos[i*3+2] = s.z;
      sparkA[i] = Math.max(0, 1 - s.t/s.life) * (0.5 + 0.5*night);
    }
    sparkGeo.attributes.position.needsUpdate = true; sparkGeo.attributes.aGlow.needsUpdate = true;
    for(const sp of puffs){
      sp.userData.t += dt*0.18; if(sp.userData.t > 1) sp.userData.t -= 1;
      const t = sp.userData.t;
      sp.position.set(Math.sin(t*6)*0.12 + t*0.35, 0.9 + t*2.0, Math.cos(t*5)*0.1);
      const sz = 0.3 + t*0.9; sp.scale.set(sz, sz, 1);
      sp.material.opacity = 0.3*(1-t)*(t < 0.12 ? t/0.12 : 1);
    }
  };
  // the owl: out at night, head turning, a blink now and then; returns true on the frames it hoots
  let owlNext = 25 + rand()*20, owlBlink = 3 + rand()*4, owlPuff = 0;
  owlWorld = (() => { const [ox, oz] = toWorld(-27, -15 + 0.72); return { x: ox, y: SITE.H0 - 1.47 + 3.11 + 0.3, z: oz }; })();
  tickOwl = (dt, time, night) => {
    if(!owl) return false;
    owl.visible = night > 0.35;
    if(!owl.visible) return false;
    owlHead.rotation.y = Math.sin(time*0.25)*0.7 + Math.sin(time*0.9)*0.15;
    owlBlink -= dt;
    const blinking = owlBlink < 0.14;
    for(const e of owlEyes) e.scale.y = blinking ? 0.12 : 1;
    if(owlBlink < 0) owlBlink = 3 + rand()*5;
    if(owlPuff > 0){ owlPuff -= dt; const k = 1 + 0.08*Math.sin(Math.PI*Math.max(0, owlPuff)/0.5); owl.scale.set(k, k, k); } else owl.scale.set(1, 1, 1);
    owlNext -= dt;
    if(owlNext < 0 && night > 0.5){ owlNext = 22 + rand()*28; owlPuff = 0.5; return true; }
    return false;
  };
}

// ---------- the room at the very back: Ranran's, behind a locked door ----------
// Through the far door of the corridor, the full width of the platform and ten metres deep: a glass pavilion at the
// end of the hall. The left wall and the end wall are glass from floor to ceiling, looking out on the valley itself —
// the meadow a step below, the trees along the terrace, the mountains. Three standing screens stand in an arc in
// front of the end glass, each a door to one of Ranran's projects.
const ROOM = { x0: -8.75, x1: XW, z0: Z1 - 0.245, z1: Z1 - 10.25 };   // inside faces; x0 and z1 are the lines of the glass
const FARDOOR = { x0: 0.0, x1: 1.2, h: 2.4, angle: 0, target: 0, open: false, pivot: null, box: null };
let lockHit, setScreen, openFarDoor, tickFarDoor;
const screens = [], portalHits = [];
{
  const OUT0 = -9.1, OUT1 = 2.35, endZ = Z1 - 0.12;
  // the corridor's far end wall, now right across the platform, with the doorway in it
  for(const [a, b, y0, y1] of [[ROOM.x0, FARDOOR.x0, 0, H + 0.4], [FARDOOR.x1, XW, 0, H + 0.4], [FARDOOR.x0, FARDOOR.x1, FARDOOR.h, H + 0.4]])   // up to the roof, so no light leaks in over it
    world.add(mesh(new THREE.BoxGeometry(b - a, y1 - y0, 0.25), M.plaster, (a + b)/2, (y0 + y1)/2, endZ));
  for(const dz of [-0.14, 0.14]){
    world.add(mesh(new THREE.BoxGeometry(FARDOOR.x1 - FARDOOR.x0 + 0.2, 0.1, 0.06), M.doorFrame, (FARDOOR.x0 + FARDOOR.x1)/2, FARDOOR.h + 0.05, endZ + dz, false, true));
    for(const x of [FARDOOR.x0 - 0.05, FARDOOR.x1 + 0.05]) world.add(mesh(new THREE.BoxGeometry(0.1, FARDOOR.h + 0.1, 0.06), M.doorFrame, x, (FARDOOR.h + 0.1)/2, endZ + dz, false, true));
  }
  // the door: hinged on the left post, on the room side of the wall, swinging into the room
  const pivot = new THREE.Group(); pivot.position.set(FARDOOR.x0, 0, Z1 - 0.28); world.add(pivot); FARDOOR.pivot = pivot;
  const lw = FARDOOR.x1 - FARDOOR.x0 - 0.06;
  pivot.add(mesh(new THREE.BoxGeometry(lw, FARDOOR.h - 0.05, 0.05), M.door, 0.03 + lw/2, (FARDOOR.h - 0.05)/2 + 0.01, 0));
  for(const s of [-1, 1]){
    for(const [py, ph] of [[0.72, 0.95], [1.72, 0.8]]) pivot.add(mesh(new THREE.BoxGeometry(lw - 0.28, ph, 0.016), M.doorFrame, 0.03 + lw/2, py, s*0.03, false, false));
    pivot.add(mesh(new THREE.BoxGeometry(0.03, 0.25, 0.06), M.chrome, lw - 0.1, 1.05, s*0.05, false, false));
  }
  for(const y of [0.4, 2.0]) world.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 8), M.chrome, FARDOOR.x0, y, Z1 - 0.28, false, false));
  // the plate beside the door says only that it is locked
  const plateTex = makeTex(640, 128, (g, w, h) => {
    g.fillStyle = '#c9a85c'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(80,60,20,0.5)'; g.lineWidth = 6; g.strokeRect(8, 8, w-16, h-16);
    g.fillStyle = '#3a2d12'; g.font = '600 40px "DM Mono", ui-monospace, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('LOCKED · PASSWORD REQUIRED', w/2, h/2 + 2);
  });
  world.add(mesh(new THREE.PlaneGeometry(0.55, 0.11), new THREE.MeshStandardMaterial({map:plateTex, roughness:0.35, metalness:0.6}), FARDOOR.x0 - 0.48, 1.72, Z1 + 0.007, false, false));
  // the lock: looking at the door asks for the password
  lockHit = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.8), new THREE.MeshBasicMaterial({transparent:true, opacity:0, depthWrite:false, colorWrite:false}));
  lockHit.position.set((FARDOOR.x0 + FARDOOR.x1)/2, 1.25, endZ); lockHit.userData = {kind:'lock'}; world.add(lockHit);
  addBox(OUT0, FARDOOR.x0, Z1 - 0.245, Z1 + 0.005); addBox(FARDOOR.x1, 2.6, Z1 - 0.245, Z1 + 0.005);
  FARDOOR.box = {minX: FARDOOR.x0, maxX: FARDOOR.x1, minZ: Z1 - 0.32, maxZ: Z1 - 0.245}; colliders.push(FARDOOR.box);
  openFarDoor = () => {
    if(FARDOOR.open) return;
    FARDOOR.open = true; FARDOOR.target = 2.9;
    Object.assign(FARDOOR.box, {minX: FARDOOR.x0 - lw - 0.1, maxX: FARDOOR.x0 + 0.06, minZ: Z1 - 0.52, maxZ: Z1 - 0.245});   // the leaf, lying back against the wall
  };
  tickFarDoor = (dt) => {
    FARDOOR.angle += THREE.MathUtils.clamp(FARDOOR.target - FARDOOR.angle, -1.6*dt, 1.6*dt);
    pivot.rotation.y = FARDOOR.angle;
  };

  // the room: oak floor, stone on the right like the corridor, plaster elsewhere, a ceiling at the corridor's height
  const roomWood = woodTex.clone(); roomWood.needsUpdate = true; roomWood.repeat.set((ROOM.x1 - ROOM.x0)/1.6, (ROOM.z0 - ROOM.z1)/1.6);
  const rf = mesh(new THREE.PlaneGeometry(ROOM.x1 - ROOM.x0, ROOM.z0 - ROOM.z1), withClouds(new THREE.MeshStandardMaterial({map:roomWood, roughness:0.58})), (ROOM.x0 + ROOM.x1)/2, 0, (ROOM.z0 + ROOM.z1)/2, false, true);
  rf.rotation.x = -Math.PI/2; world.add(rf);
  const roomStone = stoneTex.clone(); roomStone.needsUpdate = true; roomStone.repeat.set((ROOM.z0 - ROOM.z1)/2.75, H/2.75);
  const rs = mesh(new THREE.PlaneGeometry(ROOM.z0 - ROOM.z1, H), withClouds(new THREE.MeshStandardMaterial({map:roomStone, roughness:0.92})), XW - 0.005, H/2, (ROOM.z0 + ROOM.z1)/2, false, true);
  rs.rotation.y = -Math.PI/2; world.add(rs);
  const roomLen = Z1 + 0.005 - ROOM.z1, roomZc = (Z1 + 0.005 + ROOM.z1)/2;
  world.add(mesh(new THREE.BoxGeometry(OUT1 - XW, H + 0.4, roomLen), M.plaster, (XW + OUT1)/2, (H + 0.4)/2, roomZc));   // the right wall, behind the stone
  world.add(mesh(new THREE.BoxGeometry(OUT1 - ROOM.x0, 0.4, (Z1 - 0.2) - ROOM.z1), M.ceiling, (ROOM.x0 + OUT1)/2, H + 0.2, ((Z1 - 0.2) + ROOM.z1)/2));   // the roof, out over the glass
  // the two walls of glass, left and across the end, meeting at a corner post; the valley is right there behind them
  {
    const glassWall = (len, cx, cz, yaw, bays) => {
      const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = yaw; world.add(g);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(len, H), M.glass); pane.position.set(0, H/2, 0); pane.renderOrder = 2; g.add(pane);
      g.add(mesh(new THREE.BoxGeometry(len, 0.08, 0.2), M.frame, 0, 0.04, 0));
      g.add(mesh(new THREE.BoxGeometry(len, 0.16, 0.22), M.frame, 0, H - 0.08, 0));
      for(let k = 1; k < bays; k++) g.add(mesh(new THREE.BoxGeometry(0.12, H, 0.14), M.frame, -len/2 + len*k/bays, H/2, 0));
    };
    glassWall(ROOM.z0 - ROOM.z1, ROOM.x0, (ROOM.z0 + ROOM.z1)/2, Math.PI/2, 5);     // the left wall, facing into the room
    glassWall(ROOM.x1 - ROOM.x0, (ROOM.x0 + ROOM.x1)/2, ROOM.z1, 0, 5);            // across the end
    world.add(mesh(new THREE.BoxGeometry(0.18, H, 0.18), M.frame, ROOM.x0 + 0.04, H/2, ROOM.z1 + 0.04));   // the corner post
    // the platform runs on a step beyond the end glass, paved like the terrace
    const p = mesh(new THREE.PlaneGeometry(OUT1 - OUT0, SITE.rect.z0 < ROOM.z1 ? ROOM.z1 - SITE.rect.z0 : 0.6), M.pave, (OUT0 + OUT1)/2, -0.02, (ROOM.z1 + SITE.rect.z0)/2, false, true);
    p.rotation.x = -Math.PI/2; world.add(p);
  }
  // a rug in the middle of the room
  const rugTex = makeTex(512, 384, (g, w, h) => {
    g.fillStyle = '#7a3b35'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d9b26a'; g.lineWidth = 10; g.strokeRect(22, 22, w-44, h-44); g.lineWidth = 3; g.strokeRect(44, 44, w-88, h-88);
    g.fillStyle = 'rgba(217,178,106,0.35)';
    for(let i=0;i<9;i++) for(let j=0;j<7;j++){ const x = 70 + i*46, y = 70 + j*38; g.beginPath(); g.moveTo(x, y-10); g.lineTo(x+10, y); g.lineTo(x, y+10); g.lineTo(x-10, y); g.closePath(); g.fill(); }
    for(let i=0;i<4000;i++){ g.fillStyle = `rgba(${rand()<0.5?40:230},${rand()<0.5?20:200},${rand()<0.5?20:150},0.06)`; g.fillRect(rand()*w, rand()*h, 2, 2); }
  });
  const rug = mesh(new THREE.PlaneGeometry(4.4, 3.0), new THREE.MeshStandardMaterial({map:rugTex, roughness:1}), (ROOM.x0 + ROOM.x1)/2, 0.006, Z1 - 3.6, false, true);
  rug.rotation.x = -Math.PI/2; world.add(rug);
  lamp(ROOM.z1 + 0.7, ROOM.x0 + 0.5); lamp(ROOM.z1 + 0.7, ROOM.x1 - 0.55);
  plant(Z1 - 1.3, ROOM.x0 + 0.55);

  // three standing screens in a row across the middle of the room, facing the door, each a doorway to one of
  // Ranran's own projects: look at one and press E (or tap) and it opens on ranranli.net in a new tab
  const SCREENS = [
    { title: 'ABISS_bystander', sub: 'AI Generation', blurb: 'An AI-generated bystander scenario, shown as a 140° magic window.', url: 'https://ranranli.net/projects/scalable-immersion-videos/generated-magic-window-bystander/', image: 'assets/screens/abiss-generated.jpg', label: true },
    { title: 'ABISS_bystander', sub: '3D world', blurb: 'The same scene rebuilt as a walkable 3D world.', url: 'https://ranranli.net/projects/scalable-immersion-videos/reconstructed-3Dworld/', image: 'assets/screens/abiss-3dworld.jpg', label: true },
    { title: 'The Pleasure Island Experiment', sub: 'Hedonism vs. sustainability', eyebrow: 'SHORT-TERM MINDSETS · BROWSER PROTOTYPE', blurb: 'One season on a fragile island: spend it as you like and see what is left.', url: 'https://ranranli.net/pleasure-island-experiment/', image: 'assets/screens/pleasure-island.jpg' },
  ];
  function screenTex(spec){
    const c = document.createElement('canvas'); c.width = 1024; c.height = 576; const g = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso;
    let img = null;
    if(spec.image){ img = new Image(); img.onload = () => { draw(); }; img.src = spec.image; }
    const draw = () => {
      const w = c.width, h = c.height;
      if(img && img.complete && img.naturalWidth){
        g.drawImage(img, 0, 0, w, h);
        if(!spec.label){ const band = g.createLinearGradient(0, h*0.55, 0, h); band.addColorStop(0, 'rgba(6,10,20,0)'); band.addColorStop(1, 'rgba(6,10,20,0.9)'); g.fillStyle = band; g.fillRect(0, 0, w, h); }
      } else if(spec.label){
        g.fillStyle = '#0b1120'; g.fillRect(0, 0, w, h);   // while the picture loads
      } else {
        // the dark look of the study pages: deep navy, a soft blue glow, and the motif of the scenario
        const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#0d1424'); bg.addColorStop(1, '#070a14'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
        const glow = g.createRadialGradient(w*0.5, h*0.42, 0, w*0.5, h*0.42, w*0.5); glow.addColorStop(0, 'rgba(90,140,230,0.28)'); glow.addColorStop(1, 'rgba(90,140,230,0)'); g.fillStyle = glow; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(150,190,255,0.5)'; g.lineWidth = 3;
        if(spec.look === 'window'){   // a 140° arc of a magic window, with the viewer at its centre
          for(const r of [150, 200, 250]){ g.beginPath(); g.arc(w*0.5, h*0.82, r, Math.PI*1.11, Math.PI*1.89); g.stroke(); }
          g.fillStyle = 'rgba(200,220,255,0.9)'; g.beginPath(); g.arc(w*0.5, h*0.82, 7, 0, Math.PI*2); g.fill();
          for(const a of [1.11, 1.89]){ g.beginPath(); g.moveTo(w*0.5, h*0.82); g.lineTo(w*0.5 + Math.cos(Math.PI*a)*260, h*0.82 + Math.sin(Math.PI*a)*260); g.stroke(); }
        } else {   // a grid floor in perspective, for the walkable world
          g.strokeStyle = 'rgba(150,190,255,0.35)';
          for(let k=-6;k<=6;k++){ g.beginPath(); g.moveTo(w*0.5 + k*26, h*0.5); g.lineTo(w*0.5 + k*150, h*0.96); g.stroke(); }
          for(let k=0;k<7;k++){ const y = h*0.5 + Math.pow(k/6, 1.7)*h*0.46; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
        }
      }
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      if(spec.label){
        // a preview card: the picture, and just the name as a label at the upper right
        g.font = '600 34px "Bricolage Grotesque", ui-sans-serif, sans-serif'; const w1 = g.measureText(spec.title).width;
        g.font = '500 34px "Bricolage Grotesque", ui-sans-serif, sans-serif'; const w2 = g.measureText(' · ' + spec.sub).width;
        const pw = w1 + w2 + 48, ph = 60, px = w - 36 - pw, py = 30;
        g.fillStyle = 'rgba(8,12,24,0.74)'; g.beginPath(); g.roundRect(px, py, pw, ph, 12); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 1.5; g.stroke();
        g.textBaseline = 'middle'; g.fillStyle = '#f4f6fb'; g.font = '600 34px "Bricolage Grotesque", ui-sans-serif, sans-serif'; g.fillText(spec.title, px + 24, py + ph/2 + 1);
        g.fillStyle = 'rgba(200,214,240,0.95)'; g.font = '500 34px "Bricolage Grotesque", ui-sans-serif, sans-serif'; g.fillText(' · ' + spec.sub, px + 24 + w1, py + ph/2 + 1);
        g.textBaseline = 'alphabetic';
      } else if(spec.image){
        // the page's own picture carries its title; only a caption in the band at the foot
        g.fillStyle = 'rgba(160,196,255,0.95)'; g.font = '500 22px "DM Mono", ui-monospace, monospace'; g.fillText(spec.eyebrow, 58, h - 92);
        g.fillStyle = 'rgba(244,246,251,0.9)'; g.font = '600 36px "Bricolage Grotesque", ui-sans-serif, sans-serif'; g.fillText(spec.sub, 58, h - 50);
      } else {
        g.fillStyle = 'rgba(160,196,255,0.95)'; g.font = '500 22px "DM Mono", ui-monospace, monospace'; g.fillText(spec.eyebrow, 58, 92);
        g.fillStyle = '#f4f6fb'; g.font = '700 72px "Bricolage Grotesque", ui-sans-serif, sans-serif'; g.fillText(spec.title, 56, 168);
        g.fillStyle = 'rgba(244,246,251,0.85)'; g.font = '600 38px "Bricolage Grotesque", ui-sans-serif, sans-serif'; g.fillText(spec.sub, 58, 224);
        g.fillStyle = 'rgba(200,214,240,0.75)'; g.font = '500 24px "DM Mono", ui-monospace, monospace'; g.fillText(spec.blurb, 58, 272);
      }
      if(!spec.label){
        g.textAlign = 'right'; g.fillStyle = 'rgba(160,196,255,0.9)'; g.font = '500 22px "DM Mono", ui-monospace, monospace'; g.fillText((isTouch ? 'tap' : 'E') + ' · ranranli.net ↗', w - 52, h - 44);
        g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 3; g.strokeRect(18, 18, w-36, h-36);
      }
      tex.needsUpdate = true;
    };
    draw();
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    return tex;
  }
  const screenDark = new THREE.MeshStandardMaterial({color:0x1c1c1e, roughness:0.45, metalness:0.3});
  const screenMetal = new THREE.MeshStandardMaterial({color:0x4a4d52, roughness:0.4, metalness:0.7});
  function screen(spec, x, z, yaw){
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw;
    g.add(mesh(new THREE.BoxGeometry(1.2, 0.03, 0.56), screenMetal, 0, 0.015, 0));
    for(const dx of [-0.42, 0.42]) g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10), screenMetal, dx, 0.04, 0.2, false, false));
    g.add(mesh(new THREE.BoxGeometry(0.1, 1.95, 0.07), screenMetal, 0, 1.0, -0.03));
    g.add(mesh(new THREE.BoxGeometry(2.24, 1.34, 0.06), screenDark, 0, 1.6, 0.02));
    const tex = screenTex(spec);
    const mat = new THREE.MeshStandardMaterial({map:tex, emissive:0xffffff, emissiveMap:tex, emissiveIntensity:0.55, roughness:0.3});
    const display = mesh(new THREE.PlaneGeometry(2.12, 1.22), mat, 0, 1.6, 0.052, false, false);
    g.add(display);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.5, 0.6), new THREE.MeshBasicMaterial({transparent:true, opacity:0, depthWrite:false, colorWrite:false}));
    hit.position.set(0, 1.6, 0.1); hit.userData = {kind:'portal', title: spec.title, sub: spec.sub, url: spec.url, blurb: spec.blurb}; g.add(hit); portalHits.push(hit);
    world.add(g);
    // its footprint (the panel and the base, turned), for walking round it
    const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
    let ex = 0, ez = 0;
    for(const [hw, hd] of [[1.12, 0.05], [0.6, 0.28]]){ ex = Math.max(ex, c*hw + s*hd); ez = Math.max(ez, s*hw + c*hd); }
    addBox(x - ex, x + ex, z - ez, z + ez);
    screens.push({ group: g, display, mat, spec });
  }
  { // on an arc round the spot just inside the door, each turned to face it
    const cx = (ROOM.x0 + ROOM.x1)/2, fz = Z1 - 2.6, R = 4.6, spread = 0.56;
    for(const [spec, a] of [[SCREENS[0], spread], [SCREENS[1], 0], [SCREENS[2], -spread]]) screen(spec, cx - Math.sin(a)*R, fz - Math.cos(a)*R, a);
  }
  setScreen = (i, src) => {
    const s = screens[i]; if(!s) return;
    const put = (tex) => { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso; s.mat.map = tex; s.mat.emissiveMap = tex; s.mat.needsUpdate = true; };
    if(src && src.isTexture) put(src); else texLoader.load(src, put);
  };

  // the room's right side is clad in the corridor's sandstone on the outside, like the hall's
  {
    const t = stoneTex.clone(); t.needsUpdate = true; t.repeat.set((Z1 + 0.005 - ROOM.z1)/2.75, (H + 0.4)/2.75);
    const m = mesh(new THREE.PlaneGeometry(Z1 + 0.005 - ROOM.z1, H + 0.4), withClouds(new THREE.MeshStandardMaterial({map:t, roughness:0.92})), OUT1 + 0.006, (H + 0.4)/2, (Z1 + 0.005 + ROOM.z1)/2, false, true);
    m.rotation.y = Math.PI/2; world.add(m);
  }
}


// ---------- drawing the posters ----------
function hashStr(str){ let h = 7; for(let i=0;i<str.length;i++) h = (h*31 + str.charCodeAt(i)) >>> 0; return h; }
const PAPER = ['#fbe6a6','#dde9cb','#f7d6d1','#d3e1ee','#f2e4c6','#e9dcf0'];
function wrapText(g, text, x, y, maxW, lh, maxLines){
  const lines = []; let line = '';
  for(const word of String(text).split(/\s+/).filter(Boolean)){
    let w = word;
    while(g.measureText(w).width > maxW){
      let cut = w.length; while(cut > 1 && g.measureText(w.slice(0,cut)).width > maxW) cut--;
      if(line){ lines.push(line); line = ''; }
      lines.push(w.slice(0,cut)); w = w.slice(cut);
    }
    const t = line ? line+' '+w : w;
    if(g.measureText(t).width > maxW){ lines.push(line); line = w; } else line = t;
  }
  if(line) lines.push(line);
  let out = lines;
  if(lines.length > maxLines){
    out = lines.slice(0, maxLines); let last = out[maxLines-1];
    while(last.length && g.measureText(last+'…').width > maxW) last = last.slice(0,-1);
    out[maxLines-1] = last+'…';
  }
  out.forEach((l,i)=> g.fillText(l, x, y+i*lh));
}
function drawPoster(p, notes){
  const g = p.ctx, W = p.canvas.width, H = p.canvas.height;
  g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,W,H); g.textAlign = 'left'; g.textBaseline = 'top';
  // frosted glass: faint, a little lighter at the top, with a pale rim and a soft inner shadow
  const wash = g.createLinearGradient(0, 0, 0, H); wash.addColorStop(0, 'rgba(240,248,250,0.42)'); wash.addColorStop(1, 'rgba(225,238,240,0.30)');
  g.fillStyle = wash; g.fillRect(0,0,W,H);
  const sheen = g.createLinearGradient(0, 0, W, H); sheen.addColorStop(0, 'rgba(255,255,255,0.22)'); sheen.addColorStop(0.45, 'rgba(255,255,255,0)'); sheen.addColorStop(0.6, 'rgba(255,255,255,0)'); sheen.addColorStop(1, 'rgba(255,255,255,0.14)');
  g.fillStyle = sheen; g.fillRect(0,0,W,H);
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 6; g.strokeRect(3,3,W-6,H-6);
  g.strokeStyle = 'rgba(40,60,70,0.18)'; g.lineWidth = 2; g.strokeRect(9,9,W-18,H-18);
  // the left third: heading and title, etched into the glass
  g.fillStyle = 'rgba(50,58,62,0.85)'; g.font = '500 17px "DM Mono", ui-monospace, monospace';
  g.fillText('WALL OF NOTES  ·  NO. '+p.n+' OF '+posters.length, 44, 46);
  g.fillStyle = 'rgba(22,26,28,0.92)';
  const title = (p.title || 'Leave a kind word').trim();
  let l1 = title, l2 = '';
  if(title.includes('\n')){ [l1, l2] = title.split('\n'); }
  else if(title.length > 11){ const cut = title.lastIndexOf(' ', Math.ceil(title.length/2) + 2); if(cut > 0){ l1 = title.slice(0, cut); l2 = title.slice(cut+1); } }
  const fit = (txt) => { let size = 54; g.font = '700 '+size+'px "Bricolage Grotesque", ui-sans-serif, sans-serif'; while(g.measureText(txt).width > 300 && size > 26){ size -= 2; g.font = '700 '+size+'px "Bricolage Grotesque", ui-sans-serif, sans-serif'; } };
  fit(l1); g.fillText(l1, 44, 84); if(l2){ fit(l2); g.fillText(l2, 44, 144); }
  g.fillStyle = 'rgba(40,50,56,0.45)'; g.fillRect(44, 214, 300, 2);
  g.fillStyle = 'rgba(50,58,62,0.8)'; g.font = '500 15px "DM Mono", ui-monospace, monospace';
  const hint = notes.length ? (isTouch ? 'TAP TO READ OR ADD' : 'PRESS E TO READ OR ADD') : (isTouch ? 'TAP THE BOARD TO WRITE' : 'PRESS E TO WRITE');
  g.fillText(hint, 44, H-62);
  // the right two thirds: paper notes stuck to the glass, newest first, four at a time
  const x0 = 384, y0 = 44, cw = 298, ch = 258, gap = 18, MAXN = 4, shown = notes.slice(0, MAXN);
  if(!notes.length){
    g.setLineDash([8,8]); g.strokeStyle = 'rgba(40,50,56,0.4)'; g.lineWidth = 2; g.strokeRect(x0, y0+40, W-x0-44, H-y0-124); g.setLineDash([]);
    g.fillStyle = 'rgba(40,50,56,0.75)'; g.font = '500 26px "Bricolage Grotesque", ui-sans-serif, sans-serif'; g.textAlign = 'center';
    g.fillText('Nothing pinned here yet.', (x0+W-44)/2, 250); g.fillText('Be the first.', (x0+W-44)/2, 290); g.textAlign = 'left';
  }
  shown.forEach((n,i)=>{
    const col = i % 2, row = (i / 2) | 0, h = hashStr(n.id);
    const x = x0 + col*(cw+gap), y = y0 + row*(ch+gap);
    g.save(); g.translate(x+cw/2, y+ch/2); g.rotate(((h%7)-3)*0.012);
    g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(-cw/2+3, -ch/2+5, cw, ch);
    g.fillStyle = PAPER[h % PAPER.length]; g.fillRect(-cw/2, -ch/2, cw, ch);
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(-cw/2+cw*0.3, -ch/2-6, cw*0.4, 18);   // a strip of tape
    g.fillStyle = '#24201c'; g.font = '500 21px "Bricolage Grotesque", ui-sans-serif, sans-serif';
    wrapText(g, n.text, -cw/2+16, -ch/2+28, cw-32, 26, 6);
    g.fillStyle = '#5d554d'; g.font = 'italic 500 16px "Bricolage Grotesque", ui-sans-serif, sans-serif'; g.textAlign = 'right';
    g.fillText('— '+(n.sig || 'someone'), cw/2-16, ch/2-30); g.textAlign = 'left';
    g.restore();
  });
  if(notes.length > MAXN){ g.fillStyle = 'rgba(40,50,56,0.8)'; g.font = '500 15px "DM Mono", ui-monospace, monospace'; g.textAlign = 'right'; g.fillText('+ '+(notes.length-MAXN)+' MORE', W-44, H-62); g.textAlign = 'left'; }
  p.tex.needsUpdate = true;
}
function redrawPosters(wallNotes, force){
  for(const p of posters){
    const notes = wallNotes.filter(n=>n.poster===p.n);
    const key = notes.map(n=>n.id).join(',');
    if(force || key !== p.key){ p.key = key; drawPoster(p, notes); }
  }
}
function updateBin(count){ balls.count = Math.min(count, BALL_CAP); }
redrawPosters([], true); updateBin(0);


return {
  group: g, colliders, posters, binHit, gateHit, lampLights, doorPivot, DOOR, DOORS, STAIR, BIN, TREES, binMat,
  groundY, redrawPosters, updateBin, setGrill, setWishes, setSignatures, signLook, SIGN_FONTS, SIGN_COLORS, tickSmoke, tickBalloons, tickPhotos, guideBalloons, M, T,
  ROOM, FARDOOR, lockHit, openFarDoor, tickFarDoor, setScreen, screens,
  setStats, FIRE, fireHit, setFire, tickFire, tickOwl, owlWorld,
  interactables: posters.map(p => p.mesh).concat([binHit, gateHit, grillHit, wishHit, signHit, lockHit, fireHit], portalHits),
  XG, XW, Z0, Z1, H, L,
};
}
