import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { SITE, toLocal, toWorld } from './siteConst.js';

// The headset version of the gallery (served at /VR/): the same world through WebXR, from the headset's own browser.
//
// Two things differ from the flat page. The picture is drawn straight to the headset's framebuffer (the flat page
// draws into an HDR buffer and tone-maps it in a pass of its own, which stereo rendering can't use), so the renderer
// does the tone mapping and every custom shader is patched to finish the way the built-in materials do. And you are
// moved about not by moving the camera — the headset owns the camera — but by moving the XR reference space
// underneath you: each frame the "rig" (where your feet are and which way the room faces) is written into an offset
// reference space, so the camera's position and orientation come out in world coordinates like on the flat page,
// and all the code that follows the camera (the sky, the lake, the sounds, the butterflies) carries on unchanged.
//
// Walking: left stick walks the way you are looking, grip walks faster, right stick snap-turns 30°; the room's walls,
// doors and steps hold exactly as on the flat page, because it is the same player and the same collisions.
// A/X changes the time of day (midnight for the fireworks), B/Y turns the sound off and on. Pointing the right
// controller at a poster, a board, a screen or the locked door shows what it is; the trigger opens the locked door
// (there is no keyboard in a headset, so no password there). Writing, grilling and signing stay on the flat page.

export const VR_PAGE = !!window.GRILL_VR;

// Custom shaders write linear HDR colour, trusting the flat page's post pass to tone-map it. Drawing straight to the
// screen they must do it themselves, the way MeshStandardMaterial does: a tone-mapping step and the colour-space
// conversion after every write to gl_FragColor. (Both are no-ops when drawing into a linear render target.)
export function patchShadersForDirectOutput() {
  const orig = THREE.ShaderMaterial.prototype.onBeforeCompile;
  THREE.ShaderMaterial.prototype.onBeforeCompile = function (shader, renderer) {
    orig.call(this, shader, renderer);
    if (this.userData.noDirectOutput) return;
    shader.fragmentShader = shader.fragmentShader.replace(/gl_FragColor\s*=\s*([^;]+);/g, 'gl_FragColor = $1;\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n');
  };
}

const dead = (v) => (Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82);

export class VRRig {
  // hooks: { onSessionStart(), onSessionEnd(), collide(), groundLocal(lx, lz), interactables(), setHover(obj), promptFor(obj), onTrigger(obj), cycleClock(), toggleSound() }
  constructor(renderer, scene, camera, hooks) {
    this.renderer = renderer; this.scene = scene; this.camera = camera; this.hooks = hooks;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor');
    if (renderer.xr.setFoveation) renderer.xr.setFoveation(1);
    this.button = VRButton.createButton(renderer);
    this.base = null; this.turned = false; this.pressed = {}; this.hover = null; this.vx = 0; this.vz = 0;
    this.rigM = new THREE.Matrix4(); this.rigPos = new THREE.Vector3(); this.rigQ = new THREE.Quaternion(); this.rigS = new THREE.Vector3();
    this.ray = new THREE.Raycaster(); this.ray.far = 9;
    this.tmpV = new THREE.Vector3(); this.tmpD = new THREE.Vector3(); this.tmpQ = new THREE.Quaternion();
    renderer.xr.addEventListener('sessionstart', () => { this.base = renderer.xr.getReferenceSpace(); this.vx = this.vz = 0; hooks.onSessionStart && hooks.onSessionStart(); });
    renderer.xr.addEventListener('sessionend', () => { this.base = null; hooks.setHover(null); this.label.visible = false; hooks.onSessionEnd && hooks.onSessionEnd(); });
    // the controllers: a small dark grip each, a ray and a floating label from the right one
    const gripGeo = new THREE.CapsuleGeometry(0.018, 0.08, 4, 10), gripMat = new THREE.MeshStandardMaterial({ color: 0x24262b, roughness: 0.5, metalness: 0.3 });
    this.controllers = [0, 1].map((i) => {
      const c = renderer.xr.getController(i); scene.add(c);
      const g = renderer.xr.getControllerGrip(i); const m = new THREE.Mesh(gripGeo, gripMat); m.rotation.x = Math.PI / 2; m.position.z = 0.02; g.add(m); scene.add(g);
      c.userData.hand = null;
      c.addEventListener('connected', (e) => { c.userData.hand = e.data.handedness; });
      c.addEventListener('disconnected', () => { c.userData.hand = null; });
      c.addEventListener('selectstart', () => { if (c.userData.hand !== 'left' && this.hover) hooks.onTrigger(this.hover); });
      return c;
    });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
    this.line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.55 }));
    this.line.scale.z = 6; this.line.visible = false; scene.add(this.line);
    // the label: a little card of text that floats a hand's length past the controller
    this.labelCanvas = document.createElement('canvas'); this.labelCanvas.width = 768; this.labelCanvas.height = 128;
    this.labelTex = new THREE.CanvasTexture(this.labelCanvas); this.labelTex.colorSpace = THREE.SRGBColorSpace;
    this.label = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.labelTex, transparent: true, depthTest: false }));
    this.label.scale.set(0.6, 0.1, 1); this.label.renderOrder = 10; this.label.visible = false; scene.add(this.label);
    this.labelText = '';
  }

  get presenting() { return this.renderer.xr.isPresenting; }

  setLabel(text) {
    if (text === this.labelText) return;
    this.labelText = text;
    const c = this.labelCanvas, g = c.getContext('2d'), w = c.width, h = c.height;
    g.clearRect(0, 0, w, h);
    if (!text) { this.labelTex.needsUpdate = true; return; }
    g.font = '500 44px "Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif';
    const tw = Math.min(w - 40, g.measureText(text).width + 56);
    g.fillStyle = 'rgba(14,16,22,0.78)'; g.beginPath(); g.roundRect((w - tw) / 2, 14, tw, h - 28, 26); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#f6f1e6'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2, w - 96);
    this.labelTex.needsUpdate = true;
  }

  edge(key, down, fn) { const was = !!this.pressed[key]; this.pressed[key] = !!down; if (down && !was) fn(); }

  // one step of the headset frame: inputs → the player's feet → the reference space under the viewer
  update(dt, player) {
    const r = this.renderer, session = r.xr.getSession(), frame = r.xr.getFrame();
    if (!session || !frame || !this.base) return;
    const pose = frame.getViewerPose(this.base);
    let hx = 0, hz = 0, headYaw = 0;
    if (pose) {
      const p = pose.transform.position, o = pose.transform.orientation;
      hx = p.x; hz = p.z;
      this.tmpQ.set(o.x, o.y, o.z, o.w);
      const f = this.tmpD.set(0, 0, -1).applyQuaternion(this.tmpQ); f.y = 0;
      if (f.lengthSq() > 1e-4) headYaw = Math.atan2(-f.x, -f.z);
    }
    // the sticks and buttons
    let mf = 0, ms = 0, run = false;
    for (const src of session.inputSources) {
      const gp = src.gamepad; if (!gp) continue;
      const ax = gp.axes, bt = gp.buttons;
      const sx = ax.length >= 4 ? ax[2] : (ax[0] || 0), sy = ax.length >= 4 ? ax[3] : (ax[1] || 0);
      if (src.handedness === 'left') { ms += dead(sx); mf -= dead(sy); }
      else {
        if (Math.abs(sx) > 0.7 && !this.turned) { player.yaw -= Math.sign(sx) * Math.PI / 6; this.turned = true; }
        else if (Math.abs(sx) < 0.3) this.turned = false;
        if (src.handedness !== 'right' && ax.length < 4) { ms += dead(sx); mf -= dead(sy); }   // a single, unhanded controller walks
      }
      if (bt[1] && bt[1].pressed) run = true;
      this.edge(src.handedness + ':4', bt[4] && bt[4].pressed, () => this.hooks.cycleClock());
      this.edge(src.handedness + ':5', bt[5] && bt[5].pressed, () => this.hooks.toggleSound());
    }
    const mag = Math.hypot(mf, ms); if (mag > 1) { mf /= mag; ms /= mag; }
    // walking goes the way the head is looking (the head's yaw on top of the rig's)
    const yaw = player.yaw + headYaw, speed = run ? 4.4 : 2.1;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const tx = (fx * mf + rx * ms) * speed, tz = (fz * mf + rz * ms) * speed;
    const k = 1 - Math.exp(-10 * dt);
    this.vx += (tx - this.vx) * k; this.vz += (tz - this.vz) * k;
    player.vx = this.vx; player.vz = this.vz;
    // the feet: where the head is, projected on the floor — so walking about the room physically moves you too
    const c = Math.cos(player.yaw), s = Math.sin(player.yaw);
    const ox = hx * c + hz * s, oz = -hx * s + hz * c;   // the head's offset from the rig, in the gallery's frame
    player.x += this.vx * dt; player.z += this.vz * dt;
    this.hooks.collide();
    player.y += (this.hooks.groundLocal(player.x, player.z) - player.y) * Math.min(1, dt * 14);
    // the rig: the feet less the head's offset, so the head lands on the feet; then the reference space under it
    const [wx, wz] = toWorld(player.x - ox, player.z - oz);
    this.rigPos.set(wx, SITE.H0 + player.y, wz);
    this.rigQ.setFromAxisAngle(this.tmpV.set(0, 1, 0), player.yaw + SITE.theta);
    this.rigM.compose(this.rigPos, this.rigQ, this.rigS.set(1, 1, 1)).invert();
    this.rigM.decompose(this.rigPos, this.rigQ, this.rigS);
    r.xr.setReferenceSpace(this.base.getOffsetReferenceSpace(new XRRigidTransform({ x: this.rigPos.x, y: this.rigPos.y, z: this.rigPos.z, w: 1 }, { x: this.rigQ.x, y: this.rigQ.y, z: this.rigQ.z, w: this.rigQ.w })));
    // pointing: the right controller's ray against the things you can look at
    const right = this.controllers.find((cc) => cc.userData.hand === 'right') || this.controllers.find((cc) => cc.userData.hand && cc.userData.hand !== 'left');
    let hit = null;
    if (right) {
      this.tmpV.setFromMatrixPosition(right.matrixWorld);
      this.tmpD.set(0, 0, -1).transformDirection(right.matrixWorld);
      this.ray.set(this.tmpV, this.tmpD);
      const hits = this.ray.intersectObjects(this.hooks.interactables(), false);
      hit = hits.length ? hits[0].object : null;
      this.line.position.copy(this.tmpV); right.getWorldQuaternion(this.line.quaternion);
      this.line.scale.z = hits.length ? hits[0].distance : 6; this.line.visible = true;
      this.label.position.copy(this.tmpV).addScaledVector(this.tmpD, 0.45); this.label.position.y += 0.06;
    } else this.line.visible = false;
    if (hit !== this.hover) { this.hover = hit; this.hooks.setHover(hit); }
    const text = hit ? this.hooks.promptFor(hit) : '';
    this.setLabel(text); this.label.visible = !!text && !!right;
  }
}
