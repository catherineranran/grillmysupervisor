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
  ceiling: new THREE.MeshStandardMaterial({color:0xf2f0ec, roughness:0.95}),
  plaster: new THREE.MeshStandardMaterial({color:0xece8e2, roughness:0.95}),
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
  bow: loadTex('assets/bow.png'),
  tulip: loadTex('assets/tulip.png'),
  minerva: loadTex('assets/minerva.png'),
  mpiBoard: loadTex('assets/mpi-board.jpg'),
  sausage: loadTex('assets/sausage.png'),
  avatar: loadTex('assets/avatar.png', {onLoad: () => { if(grillSign) grillSign.redraw(); if(wishSign) wishSign.redraw(); }}),
};
M.flag = cutoutMat(T.banner);
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

// end walls
world.add(mesh(new THREE.BoxGeometry(4.4, H, 0.25), M.plaster, 0, H/2, Z0+0.12));
world.add(mesh(new THREE.BoxGeometry(4.4, H, 0.25), M.plaster, 0, H/2, Z1-0.12));
// far door
world.add(mesh(new THREE.BoxGeometry(1.2, 2.4, 0.05), M.door, 0.6, 1.2, Z1+0.02, false, true));
world.add(mesh(new THREE.BoxGeometry(0.03, 0.25, 0.06), M.chrome, 0.1, 1.05, Z1+0.05, false, false));

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
paveTex.repeat.set(7.1/2.4, (L+10)/1.2);
const terrace = mesh(new THREE.PlaneGeometry(7.1, L+10), M.pave, XG-3.55, -0.02, ZC, false, true);   // out to the retaining wall
terrace.rotation.x = -Math.PI/2; world.add(terrace);
// planter wall with ivy
planterTex.repeat.set((L+10)/2.75, 1/2.75);
for(const [za, zb] of [[Z0+5, STAIR.z0], [STAIR.z1, Z1-5]]){
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
  // the terrace beyond the corridor ends
  for(const [za, zb] of [[Z0+5, Z0], [Z1, Z1-5]]){ const p = mesh(new THREE.PlaneGeometry(4.6, za-zb), M.pave, 0.3, -0.02, (za+zb)/2, false, true); p.rotation.x = -Math.PI/2; world.add(p); }
}

// ivy
{
  const ivyGeo = new THREE.IcosahedronGeometry(0.11, 0);
  const n = 6000;
  const ivy = new THREE.InstancedMesh(ivyGeo, new THREE.MeshStandardMaterial({flatShading:true, roughness:0.9}), n);
  const d = new THREE.Object3D(), col = new THREE.Color();
  for(let i=0;i<n;i++){
    let z; do { z = Z0 + 5 - rand()*(L+10); } while(z > STAIR.z1 - 0.25 && z < STAIR.z0 + 0.25);
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
M.bark = new THREE.MeshStandardMaterial({color:0x6f665c, roughness:0.95});
const TREES = [
  {x:-12.4,z:1.8,h:11,r:4.2}, {x:-13.5,z:-15,h:9.5,r:3.6}, {x:-11,z:-27,h:10.5,r:4},
  {x:-14,z:-39,h:12,r:4.4}, {x:-11.8,z:-52,h:9,r:3.5}, {x:-13,z:-64,h:11,r:4}, {x:-12,z:9,h:10,r:3.8},
  {x:-11,z:21,h:11,r:4}, {x:-13.5,z:33,h:10,r:3.8}, {x:-12,z:45,h:10.5,r:4}, {x:-12.5,z:-76,h:10,r:3.8},
];
{
  const clumpGeo = new THREE.IcosahedronGeometry(0.26, 0);
  const per = 1300, n = TREES.length*per;
  const leaves = new THREE.InstancedMesh(clumpGeo, new THREE.MeshStandardMaterial({flatShading:true, roughness:0.9}), n);
  const d = new THREE.Object3D(), col = new THREE.Color();
  const palette = [0xb7ad5a, 0xcabb6c, 0x9c9b4c, 0xd6c57a, 0x87903f, 0xbfae62];
  let idx = 0;
  for(const t of TREES){
    const [wx, wz] = toWorld(t.x, t.z);
    const ground = t.ground = heightAt(wx, wz) - SITE.H0 - 0.12;   // the foot sinks a little into the turf
    const trunkH = t.h*0.55;
    world.add(mesh(new THREE.CylinderGeometry(0.13, 0.26, trunkH, 8), M.bark, t.x, ground+trunkH/2, t.z));
    const cy = ground + t.h*0.62;
    for(let b=0;b<7;b++){
      const len = rr(2,3.6), a = rand()*Math.PI*2, tilt = rr(0.4,0.9);
      const br = mesh(new THREE.CylinderGeometry(0.04, 0.1, len, 6), M.bark, 0,0,0);
      br.geometry.translate(0, len/2, 0);
      br.position.set(t.x, ground+trunkH*rr(0.7,1), t.z);
      br.rotation.set(Math.sin(a)*tilt, 0, Math.cos(a)*tilt);
      world.add(br);
    }
    for(let i=0;i<per;i++){
      // airy crown: points in an ellipsoid, biased to the shell
      let x,y,z; do{ x=rr(-1,1); y=rr(-1,1); z=rr(-1,1);} while(x*x+y*y+z*z>1);
      const k = 0.55 + 0.45*Math.pow(rand(),0.4);
      const len = Math.hypot(x,y,z)||1;
      x = x/len*k; y = y/len*k; z = z/len*k;
      d.position.set(t.x + x*t.r, cy + y*t.h*0.36, t.z + z*t.r);
      const s = rr(0.5, 1.15); d.scale.set(s, s*rr(0.7,1.1), s);
      d.rotation.set(rand()*3, rand()*3, rand()*3); d.updateMatrix();
      leaves.setMatrixAt(idx, d.matrix);
      col.set(palette[(rand()*palette.length)|0]); col.offsetHSL(rr(-0.02,0.02), 0, rr(-0.06,0.05));
      leaves.setColorAt(idx, col);
      idx++;
    }
  }
  leaves.castShadow = true; leaves.receiveShadow = true; leaves.frustumCulled = false; world.add(leaves);
}


// ---------- furniture ----------
const colliders = [];
function addBox(minX,maxX,minZ,maxZ){ colliders.push({minX,maxX,minZ,maxZ}); }

const sofaZs = [];
// leather: cognac, with a clear coat for the sheen; the backs and arms carry a baked diamond-tufting texture
const tuftTex = makeTex(512, 256, (g, w, h) => {
  g.fillStyle = '#7a4424'; g.fillRect(0, 0, w, h);
  const cx = 64, cy = 64;   // diamond cell
  for(let y = -cy; y <= h + cy; y += cy) for(let x = ((y/cy) % 2 ? cx/2 : 0) - cx; x <= w + cx; x += cx){
    const grd = g.createRadialGradient(x, y - 6, 4, x, y, cx*0.8);
    grd.addColorStop(0, '#a4653a'); grd.addColorStop(0.55, '#8a4f2a'); grd.addColorStop(1, '#5c3118');
    g.fillStyle = grd; g.beginPath(); g.moveTo(x, y - cy/2); g.lineTo(x + cx/2, y); g.lineTo(x, y + cy/2); g.lineTo(x - cx/2, y); g.closePath(); g.fill();
  }
  // the seams and the buttons at the pleats
  g.strokeStyle = 'rgba(40,18,8,0.55)'; g.lineWidth = 2;
  for(let y = -cy; y <= h + cy; y += cy) for(let x = ((y/cy) % 2 ? cx/2 : 0) - cx; x <= w + cx; x += cx){
    g.beginPath(); g.moveTo(x, y - cy/2); g.lineTo(x + cx/2, y); g.lineTo(x, y + cy/2); g.lineTo(x - cx/2, y); g.closePath(); g.stroke();
  }
  for(let y = -cy; y <= h + cy; y += cy) for(let x = ((y/cy) % 2 ? cx/2 : 0) - cx; x <= w + cx; x += cx){
    for(const [px, py] of [[x, y - cy/2], [x + cx/2, y]]){
      const b = g.createRadialGradient(px - 2, py - 2, 1, px, py, 7); b.addColorStop(0, '#7a4a2a'); b.addColorStop(1, '#2d1409');
      g.fillStyle = b; g.beginPath(); g.arc(px, py, 6, 0, Math.PI*2); g.fill();
    }
  }
});
tuftTex.repeat.set(1, 1);
const leather = new THREE.MeshPhysicalMaterial({color:0x7a4424, roughness:0.42, metalness:0, clearcoat:0.55, clearcoatRoughness:0.3});
const leatherTuft = new THREE.MeshPhysicalMaterial({map:tuftTex, roughness:0.42, metalness:0, clearcoat:0.55, clearcoatRoughness:0.3});
const leatherDark = new THREE.MeshPhysicalMaterial({color:0x5a2f16, roughness:0.5, clearcoat:0.4});
const velvet = [new THREE.MeshStandardMaterial({color:0x2f5d4a, roughness:0.95}), new THREE.MeshStandardMaterial({color:0xc99a3a, roughness:0.95}), new THREE.MeshStandardMaterial({color:0x5b3f6e, roughness:0.95})];
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
  for(const sz of [-1, 1]) g.add(mesh(new RoundedBoxGeometry(dep-0.26, 0.17, len/2-0.14, 3, 0.05), leather, -0.04, 0.42, sz*(len/4-0.04)));
  // the tufted back, rolled over at the top
  const backMats = [leather, leatherTuft, leather, leather, leather, leather];   // the face towards the seat is tufted
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, len-0.3), backMats); back.position.set(0.25, 0.66, 0); back.rotation.z = -0.14; back.castShadow = true; back.receiveShadow = true; g.add(back);
  const backRoll = mesh(new THREE.CylinderGeometry(0.11, 0.11, len-0.3, 20), leather, 0.2, 0.92, 0); backRoll.rotation.x = Math.PI/2; g.add(backRoll);
  // rolled, tufted arms with brass nailheads along the outer edge
  for(const sz of [-1, 1]){
    const armMats = [leather, leather, leather, leather, sz > 0 ? leatherTuft : leather, sz > 0 ? leather : leatherTuft];
    const armBody = new THREE.Mesh(new THREE.BoxGeometry(dep-0.1, 0.3, 0.22), armMats); armBody.position.set(-0.02, 0.5, sz*(len/2-0.12)); armBody.castShadow = true; armBody.receiveShadow = true; g.add(armBody);
    const arm = mesh(new THREE.CylinderGeometry(0.13, 0.13, dep+0.02, 20), leather, -0.02, 0.66, sz*(len/2-0.12)); arm.rotation.z = Math.PI/2; g.add(arm);
    for(let i=0;i<11;i++){ const n = mesh(nailGeo, brass, -0.34 + i*0.064, 0.37, sz*(len/2-0.005), false, false); g.add(n); }
  }
  // turned walnut feet
  for(const sx of [-0.28, 0.26]) for(const sz of [-1, 1]){
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.14, 10), walnut, sx, 0.07, sz*(len/2-0.14)));
    g.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 10), walnut, sx, 0.145, sz*(len/2-0.14), false, false));
  }
  // a velvet cushion in each corner
  for(const sz of [-1, 1]){
    const cu = mesh(new RoundedBoxGeometry(0.1, 0.4, 0.4, 3, 0.04), velvet[(k + (sz > 0 ? 1 : 0)) % velvet.length], 0.1, 0.72, sz*(len/2-0.36));
    cu.rotation.z = -0.22; cu.rotation.y = sz*0.18; g.add(cu);
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

function plant(zc){
  const g = new THREE.Group(); g.position.set(1.48, 0, zc);
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
  addBox(1.08, 2, zc-0.42, zc+0.42);
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
function lamp(zc){
  const g = new THREE.Group(); g.position.set(1.18, 0, zc);
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
  addBox(1.0, 1.36, zc-0.18, zc+0.18);
}

function doorway(zc){
  world.add(mesh(new THREE.BoxGeometry(0.08, 2.45, 1.1), M.door, XW-0.02, 1.225, zc, false, true));
  world.add(mesh(new THREE.BoxGeometry(0.1, 0.1, 1.3), M.doorFrame, XW-0.03, 2.5, zc, false, true));
  for(const s of [-1,1]) world.add(mesh(new THREE.BoxGeometry(0.1, 2.55, 0.1), M.doorFrame, XW-0.03, 1.275, zc+s*0.6, false, true));
  world.add(mesh(new THREE.BoxGeometry(0.06, 0.03, 0.18), M.chrome, XW-0.08, 1.05, zc+0.38, false, false));
}

// ---------- bookshelves ----------
const bookMats = [], bookCols = [];
const shelfMat = new THREE.MeshStandardMaterial({color:0xb8996f, roughness:0.75});
const bookPalette = [0x8c3b2e,0x2f4a5e,0x6d7a4a,0xc9b48a,0x3d3a36,0xa8673a,0xe8e1d3,0x5a4a6b,0x9e8d6c,0x34584f,0xb7472f,0xd9c7a0];
function bookshelf(zc){
  const W = 0.92, D = 0.36, HT = 2.15, T = 0.03, x = XW - D/2 - 0.01;
  const g = new THREE.Group(); g.position.set(x, 0, zc);
  for(const s of [-1,1]) g.add(mesh(new THREE.BoxGeometry(D, HT, T), shelfMat, 0, HT/2, s*(W/2 - T/2)));
  g.add(mesh(new THREE.BoxGeometry(0.02, HT, W), shelfMat, D/2-0.01, HT/2, 0));
  g.add(mesh(new THREE.BoxGeometry(D, 0.08, W), shelfMat, 0, 0.04, 0));
  const levels = [0.08, 0.5, 0.9, 1.3, 1.7, HT - T];
  for(const y of levels.slice(1)) g.add(mesh(new THREE.BoxGeometry(D, T, W - 2*T), shelfMat, 0, y + T/2 - (y===HT-T?0:0), 0));
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
  const books = new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({roughness:0.8}), bookMats.length);
  const c = new THREE.Color();
  bookMats.forEach((m,i)=>{ books.setMatrixAt(i, m); c.set(bookCols[i]).offsetHSL(0, rr(-0.05,0.05), rr(-0.06,0.06)); books.setColorAt(i, c); });
  books.castShadow = true; books.receiveShadow = true; books.frustumCulled = false; world.add(books);
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
  const c = document.createElement('canvas'); c.width = 256; c.height = 640; const g = c.getContext('2d');
  const cx = 128, cy = 150, rx = 100, ry = 122;
  // the balloon, lit from the top left
  const grd = g.createRadialGradient(cx - 36, cy - 48, 10, cx, cy, ry * 1.15);
  grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.16, col); grd.addColorStop(0.85, col); grd.addColorStop(1, dark);
  g.fillStyle = grd; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2); g.fill();
  g.fillStyle = dark; g.beginPath(); g.moveTo(cx - 14, cy + ry - 4); g.lineTo(cx + 14, cy + ry - 4); g.lineTo(cx, cy + ry + 18); g.closePath(); g.fill();
  // the string
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy + ry + 18);
  g.bezierCurveTo(cx + 40, cy + ry + 120, cx - 40, cy + ry + 240, cx + 10, 630); g.stroke();
  // the number and the label
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 150px "Bricolage Grotesque", ui-sans-serif, sans-serif';
  g.lineWidth = 12; g.strokeStyle = dark; g.strokeText(String(num), cx, cy - 10);
  g.fillStyle = '#ffffff'; g.fillText(String(num), cx, cy - 10);
  g.font = '700 24px "Bricolage Grotesque", ui-sans-serif, sans-serif';
  g.lineWidth = 6; g.strokeStyle = dark; g.strokeText(label, cx, cy + 78); g.fillStyle = '#ffffff'; g.fillText(label, cx, cy + 78);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = maxAniso;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true, depthWrite:false}));
  sp.scale.set(0.56, 1.4, 1); sp.center.set(0.5, 0.5);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(() => { /* redraw with the real font */
    g.clearRect(0,0,256,640);
    g.fillStyle = grd; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2); g.fill();
    g.fillStyle = dark; g.beginPath(); g.moveTo(cx - 14, cy + ry - 4); g.lineTo(cx + 14, cy + ry - 4); g.lineTo(cx, cy + ry + 18); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy + ry + 18); g.bezierCurveTo(cx + 40, cy + ry + 120, cx - 40, cy + ry + 240, cx + 10, 630); g.stroke();
    g.font = '700 150px "Bricolage Grotesque", ui-sans-serif, sans-serif'; g.lineWidth = 12; g.strokeStyle = dark; g.strokeText(String(num), cx, cy - 10); g.fillStyle = '#ffffff'; g.fillText(String(num), cx, cy - 10);
    g.font = '700 24px "Bricolage Grotesque", ui-sans-serif, sans-serif'; g.lineWidth = 6; g.strokeStyle = dark; g.strokeText(label, cx, cy + 78); g.fillStyle = '#ffffff'; g.fillText(label, cx, cy + 78);
    tex.needsUpdate = true;
  });
  return sp;
}
const guideBalloons = [];
{
  const specs = [
    [1, 'make a wish', '#e8485b', '#8d1f2e', [-0.95, 1.95, -2.7]],
    [2, 'sign the board', '#3f8ae6', '#1d4a8a', [1.05, 3.45, -11.95]],
    [3, 'the grill', '#f0962e', '#9a5210', [-4.6, 2.35, -6.7]],
  ];
  for(const [n, label, col, dark, pos] of specs){
    const sp = balloonSprite(n, label, col, dark); sp.position.set(pos[0], pos[1], pos[2]); world.add(sp);
    guideBalloons.push({ sp, base: pos.slice(), phase: n * 1.7 });
  }
  // the fourth balloon's route: in at the door, across the terrace, down the steps, over the meadow to the gate
  const route = [[-1.3, 2.2, 1.2], [-2.6, 2.2, -0.9], [-5.6, 2.2, -2.2], [-8.6, 2.1, -3.3], [-11.4, 1.0, -3.3], [-15.5, 0.75, -5.5], [-20.5, 0.7, -9.5], [-25.6, 0.75, -13.4]];
  const curve = new THREE.CatmullRomCurve3(route.map((r) => new THREE.Vector3(r[0], r[1], r[2])), false, 'centripetal', 0.5);
  const sp = balloonSprite(4, 'to the grassland', '#3bb273', '#1d6b43'); world.add(sp);
  guideBalloons.push({ sp, phase: 4.2, route: curve, t: 0, len: curve.getLength(), wait: 0, pos: new THREE.Vector3() });
}
function tickBalloons(dt, time){
  for(const b of guideBalloons){
    if(!b.route){
      b.sp.position.set(b.base[0] + Math.sin(time*0.7 + b.phase)*0.06, b.base[1] + Math.sin(time*1.3 + b.phase)*0.09, b.base[2] + Math.cos(time*0.9 + b.phase)*0.06);
      continue;
    }
    // drift along the route at walking pace, wait at the gate, fade, and start again at the door
    if(b.wait > 0){ b.wait -= dt; b.sp.material.opacity = Math.min(1, Math.max(0, b.wait < 1 ? b.wait : 1)); if(b.wait <= 0){ b.t = 0; } continue; }
    b.t += dt * 1.15 / b.len;
    if(b.t >= 1){ b.t = 1; b.wait = 4; }
    b.route.getPointAt(Math.min(1, Math.max(0, b.t)), b.pos);
    b.sp.material.opacity = Math.min(1, b.t * b.len / 2) * Math.min(1, (1 - b.t) * b.len / 1.5 + 0.35);
    b.sp.position.set(b.pos.x + Math.sin(time*0.8 + b.phase)*0.05, b.pos.y + Math.sin(time*1.4 + b.phase)*0.08, b.pos.z);
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
function banner(zc, span, yEnd, sag, scale){
  const g = new THREE.Group(); world.add(g);
  const pts = [];
  for(let i=0;i<=24;i++){ const t = i/24, u = 2*t-1; pts.push(new THREE.Vector3(XW-0.075, yEnd - sag*(1-u*u), zc + span/2 - t*span)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  g.add(mesh(new THREE.TubeGeometry(curve, 48, 0.004, 5, false), M.string, 0,0,0, false, false));
  for(let i=0;i<FLAGS;i++){
    const t = (i + 0.5)/FLAGS;
    const p = curve.getPointAt(t);
    const f = cutoutMesh(flagGeos[i], M.flag, true);
    f.position.copy(p); f.position.x -= 0.004;
    f.rotation.set(0, -Math.PI/2, 0);
    f.rotateX(rr(-0.08, 0.08)); f.rotateZ(rr(-0.03, 0.03));
    f.scale.setScalar(scale);
    g.add(f);
  }
  for(const s of [-1, 1]){
    const b = cutoutMesh(bowGeo, M.bow, false);
    b.position.set(XW-0.07, yEnd + 0.02, zc + s*span/2); b.rotation.set(0, -Math.PI/2, 0); b.scale.setScalar(scale*1.1);
    g.add(b);
  }
}
for(const z0 of [32, 12, -1.8, -24, -46]) banner(z0 - 1.1, 4.1, 2.52, 0.36, 1);
for(const z of [20, -16, -38, -60]) banner(z, 2.7, 2.5, 0.3, 0.78);

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

// ---------- the grill on the terrace ----------
const smoke = [];
let setGrill;
{
  const gg = new THREE.Group(); gg.position.set(-5.3, 0, -6.2); gg.rotation.y = 0.5; world.add(gg);
  const black = new THREE.MeshStandardMaterial({color:0x1d1c1b, roughness:0.45, metalness:0.35});
  const steel = new THREE.MeshStandardMaterial({color:0xaeb2b5, roughness:0.35, metalness:0.8});
  const R = 0.28, Y = 0.74;
  gg.add(mesh(new THREE.SphereGeometry(R, 28, 14, 0, Math.PI*2, Math.PI/2, Math.PI/2), black, 0, Y, 0));
  const rim = mesh(new THREE.TorusGeometry(R, 0.012, 8, 40), steel, 0, Y, 0); rim.rotation.x = Math.PI/2; gg.add(rim);
  // lid, hinged open at the back
  const hinge = new THREE.Group(); hinge.position.set(-R, Y, 0); hinge.rotation.z = 1.95; gg.add(hinge);
  const lid = mesh(new THREE.SphereGeometry(R, 28, 14, 0, Math.PI*2, 0, Math.PI/2), black, R, 0, 0); hinge.add(lid);
  const lidRim = mesh(new THREE.TorusGeometry(R, 0.012, 8, 40), steel, R, 0, 0); lidRim.rotation.x = Math.PI/2; hinge.add(lidRim);
  hinge.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), steel, R, R+0.03, 0));
  hinge.add(mesh(new THREE.TorusGeometry(0.02, 0.006, 6, 16), steel, R, R+0.11, 0));
  // grate and coals
  const coals = new THREE.Mesh(new THREE.CircleGeometry(R*0.8, 28), new THREE.MeshStandardMaterial({color:0x3a2a22, emissive:0xff5a1a, emissiveIntensity:0.9, roughness:1}));
  coals.rotation.x = -Math.PI/2; coals.position.y = Y - 0.12; gg.add(coals);
  for(let i=-5;i<=5;i++){ const w = Math.sqrt(Math.max(0.01, R*R - (i*0.045)*(i*0.045)))*2*0.9; const bar = mesh(new THREE.CylinderGeometry(0.004, 0.004, w, 6), steel, 0, Y+0.005, i*0.045); bar.rotation.z = Math.PI/2; gg.add(bar); }
  // what's cooking: little avatar sausages — the supervisor, in cartoon, wrapped round each one. Visitors add them
  // from the board beside the grill; up to 16 show on the grate (two layers), the board carries the full count.
  const SR = 0.033, SL = 0.10;
  const sausageSide = new THREE.MeshStandardMaterial({map:T.sausage, roughness:0.55});
  const sausageEnd = new THREE.MeshStandardMaterial({color:0x9c4a2a, roughness:0.55});
  const sideGeo = new THREE.CylinderGeometry(SR, SR, SL, 24, 1, true);
  const capGeo = new THREE.SphereGeometry(SR, 16, 10, 0, Math.PI*2, 0, Math.PI/2);
  const slots = [];
  for(let layer=0; layer<2; layer++) for(let row=0; row<2; row++) for(let i=0;i<4;i++){
    const a = (-0.115 + i*0.077) * (layer ? 1 : 1), b = (row ? 0.088 : -0.088);
    slots.push(layer ? {x:b, z:a, y:Y+SR+0.004+2*SR*0.82, yaw:Math.PI/2} : {x:a, z:b, y:Y+SR+0.004, yaw:0});
  }
  const sausages = [];
  for(const s of slots){
    const g = new THREE.Group(); g.position.set(s.x, s.y, s.z); g.rotation.set(0, s.yaw + rr(-0.12,0.12), 0);
    const body = new THREE.Group(); body.rotation.x = Math.PI/2; g.add(body);     // the axis along z, the wrap's middle facing up
    body.add(mesh(sideGeo, sausageSide, 0, 0, 0));
    const c1 = mesh(capGeo, sausageEnd, 0, SL/2, 0); body.add(c1);
    const c2 = mesh(capGeo, sausageEnd, 0, -SL/2, 0); c2.rotation.x = Math.PI; body.add(c2);
    g.visible = false; gg.add(g); sausages.push(g);
  }
  setGrill = function(n){
    for(let i=0;i<sausages.length;i++) sausages[i].visible = i < n;
    grillBoard.count = n; if(grillSign) grillSign.redraw();
  };
  const patty = new THREE.MeshStandardMaterial({color:0x6b3f28, roughness:0.7});
  for(const x of [-0.195, 0.195]) gg.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.025, 16), patty, x, Y+0.02, 0));
  // legs, wheels, ash pan
  for(const [ax, az, wheel] of [[-0.6, 0.8, true], [-0.6, -0.8, true], [1, 0, false]]){
    const leg = mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.56, 8), steel, ax*0.2, Y-R-0.1, az*0.2);
    leg.rotation.z = -ax*0.22; leg.rotation.x = az*0.22; gg.add(leg);
    if(wheel){ const wh = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 18), black, ax*0.3, 0.07, az*0.3); wh.rotation.x = Math.PI/2; gg.add(wh); }
  }
  gg.add(mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.04, 20), black, 0, Y-R-0.06, 0));
  // smoke
  const sc = document.createElement('canvas'); sc.width = sc.height = 64;
  const sg = sc.getContext('2d'); const grd = sg.createRadialGradient(32,32,2,32,32,30); grd.addColorStop(0,'rgba(235,232,228,0.9)'); grd.addColorStop(1,'rgba(235,232,228,0)');
  sg.fillStyle = grd; sg.fillRect(0,0,64,64);
  const st = new THREE.CanvasTexture(sc);
  for(let i=0;i<7;i++){
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:st, transparent:true, opacity:0.5, depthWrite:false}));
    sp.userData.t = i/7; gg.add(sp); smoke.push(sp);
  }
  addBox(-5.75, -4.85, -6.65, -5.75);
}

// sandwich boards: a canvas face on an A-frame; look at one and press E (or tap) to use it
const boardWood = new THREE.MeshStandardMaterial({color:0x5a4634, roughness:0.85});
function sandwichBoard(x, z, yaw, kind, paint){
  const bg = new THREE.Group(); bg.position.set(x, 0, z); bg.rotation.y = yaw; world.add(bg);
  const W = 0.64, Hh = 0.84, tilt = 0.17;
  const bc = document.createElement('canvas'); bc.width = 640; bc.height = 840; const bx = bc.getContext('2d');
  const bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace; bt.anisotropy = maxAniso;
  const redraw = () => {
    bx.fillStyle = '#f3ead8'; bx.fillRect(0,0,640,840);
    bx.strokeStyle = '#2b3a2a'; bx.lineWidth = 10; bx.strokeRect(5,5,630,830);
    bx.textAlign = 'center'; bx.textBaseline = 'middle';
    paint(bx); bt.needsUpdate = true;
  };
  redraw();
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);
  const faceMat = new THREE.MeshStandardMaterial({map:bt, roughness:0.9});
  const panelGeo = new THREE.PlaneGeometry(W, Hh), frameGeo = new THREE.BoxGeometry(W+0.06, Hh+0.06, 0.025);
  for(const s of [1, -1]){
    const pivot = new THREE.Group(); pivot.position.set(0, 0.95, 0); pivot.rotation.x = -s*tilt; bg.add(pivot);
    pivot.add(mesh(frameGeo, boardWood, 0, -Hh/2-0.04, s*0.013));
    const face = new THREE.Mesh(panelGeo, faceMat); face.position.set(0, -Hh/2-0.04, s*0.027);
    if(s < 0) face.rotation.y = Math.PI;
    face.castShadow = true; face.receiveShadow = true; pivot.add(face);
  }
  bg.add(mesh(new THREE.BoxGeometry(W+0.06, 0.045, 0.06), boardWood, 0, 0.96, 0));
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
  bx.fillText(n ? n + (n === 1 ? ' sausage' : ' sausages') + ' on the grill' : 'The grate is still empty', 320, 608);
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
  bx.fillStyle = '#5d554d'; bx.font = '500 26px "DM Mono", ui-monospace, monospace'; bx.fillText('BIRTHDAY WISHES', 320, 62);
  bx.fillStyle = '#2b3a2a'; bx.font = '700 60px "Bricolage Grotesque", ui-sans-serif, sans-serif';
  bx.fillText('Make a wish', 320, 134); bx.fillText('for the supervisor', 320, 198);
  drawAvatar(bx, 246, 290);
  bx.fillStyle = '#b5482f'; bx.font = '700 44px "Bricolage Grotesque", ui-sans-serif, sans-serif';
  bx.fillText(n ? n + (n === 1 ? ' wish' : ' wishes') + ' on the wall' : 'No wishes on the wall yet', 320, 598);
  bx.fillStyle = '#5d554d'; bx.font = '500 28px "DM Mono", ui-monospace, monospace';
  bx.fillText(isTouch ? 'tap here to write one' : 'E / click here to write one', 320, 666);
  bx.font = '500 23px "DM Mono", ui-monospace, monospace';
  bx.fillText('it gets pinned on one of the posters', 320, 726); bx.fillText('along the wall', 320, 760);
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
  addBox(-9.1, STAIR.top, STAIR.z0, Z0+5); addBox(-9.1, STAIR.top, Z1-5, STAIR.z1);
  addBox(STAIR.bottom, STAIR.top, STAIR.z0, STAIR.z0+0.15); addBox(STAIR.bottom, STAIR.top, STAIR.z1-0.15, STAIR.z1);
}
for(const t of TREES) addBox(t.x-0.32, t.x+0.32, t.z-0.32, t.z+0.32);   // the trunks

// the gate to the Ili grassland (a separate world: vibe-shepherding)
let gateHit;
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
  groundY, redrawPosters, updateBin, setGrill, setWishes, setSignatures, signLook, SIGN_FONTS, SIGN_COLORS, tickSmoke, tickBalloons, guideBalloons, M, T,
  interactables: posters.map(p => p.mesh).concat([binHit, gateHit, grillHit, wishHit, signHit]),
  XG, XW, Z0, Z1, H, L,
};
}
