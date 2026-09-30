import * as THREE from 'three';
import { applyPose, POSE } from './poses.js';
import { knitKippahTexture, velvetTexture } from './textures.js';

const TAU = Math.PI * 2;
const FRONT = Math.PI / 2; // SphereGeometry phi that faces +z
let WOOD = null;

function woodTextures() {
  if (WOOD) return WOOD;
  const side = document.createElement('canvas');
  side.width = 256; side.height = 512;
  let g = side.getContext('2d');
  g.fillStyle = '#b07840'; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 256;
    g.strokeStyle = `rgba(${(60 + Math.random() * 40) | 0},${(30 + Math.random() * 20) | 0},10,${0.18 + Math.random() * 0.3})`;
    g.lineWidth = 1 + Math.random() * 3;
    g.beginPath(); g.moveTo(x, 0);
    for (let y = 0; y <= 512; y += 16) g.lineTo(x + Math.sin(y * 0.03 + i) * 4, y);
    g.stroke();
  }
  for (let i = 0; i < 4; i++) {
    const x = 20 + Math.random() * 216, y = 40 + Math.random() * 432;
    g.fillStyle = 'rgba(58,26,8,.85)';
    g.beginPath(); g.ellipse(x, y, 7, 14, 0, 0, TAU); g.fill();
  }
  const end = document.createElement('canvas');
  end.width = end.height = 256;
  g = end.getContext('2d');
  g.fillStyle = '#e0b276'; g.fillRect(0, 0, 256, 256);
  for (let r = 118; r > 3; r -= 6 + Math.random() * 6) {
    g.strokeStyle = `rgba(120,70,30,${0.3 + Math.random() * 0.35})`;
    g.lineWidth = 1.5 + Math.random() * 2;
    g.beginPath(); g.arc(128, 128, r, 0, TAU); g.stroke();
  }
  g.strokeStyle = '#6a3a16'; g.lineWidth = 14;
  g.beginPath(); g.arc(128, 128, 122, 0, TAU); g.stroke();
  const mk = (c) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };
  WOOD = { side: mk(side), end: mk(end) };
  return WOOD;
}

// Handle runs along +y from the origin, head sits across the top along x.
export function makeGavel() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a3515, roughness: 0.35, metalness: 0.05 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xe0b050, roughness: 0.25, metalness: 1 });
  const add = (geo, m, p, r = [0, 0, 0]) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(...p); o.rotation.set(...r); o.castShadow = true; g.add(o); return o;
  };
  add(new THREE.CylinderGeometry(0.026, 0.034, 0.56, 14), wood, [0, 0.28, 0]);
  add(new THREE.SphereGeometry(0.042, 14, 10), gold, [0, 0, 0]);
  add(new THREE.CylinderGeometry(0.078, 0.078, 0.27, 24), wood, [0, 0.58, 0], [0, 0, Math.PI / 2]);
  for (const x of [-0.085, 0.085]) add(new THREE.CylinderGeometry(0.082, 0.082, 0.025, 24), gold, [x, 0.58, 0], [0, 0, Math.PI / 2]);
  for (const x of [-0.137, 0.137]) add(new THREE.CylinderGeometry(0.07, 0.078, 0.012, 24), gold, [x, 0.58, 0], [0, 0, Math.PI / 2]);
  add(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 16), gold, [0, 0.54, 0]);
  return g;
}

const EXPR = {
  normal: { eye: 1, brow: 0.22, browY: 0, mx: 1, my: 1 },
  angry: { eye: 0.85, brow: 0.42, browY: -0.012, mx: 1.15, my: 2.6 },
  hurt: { eye: 0.35, brow: -0.35, browY: 0.02, mx: 0.8, my: 3.2 },
  ko: { eye: 0.08, brow: -0.2, browY: 0, mx: 0.9, my: 2.4 },
  win: { eye: 1.05, brow: -0.1, browY: 0.02, mx: 1.4, my: 2.0 },
  dizzy: { eye: 0.5, brow: -0.3, browY: 0.02, mx: 0.7, my: 1.6 },
};

export function buildFighterModel(def) {
  const mats = [], geos = [];
  const M = (color, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...o });
    mats.push(m); return m;
  };
  const add = (geo, mat, parent, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) => {
    const m = new THREE.Mesh(geo, mat); geos.push(geo);
    if (p.isVector3) m.position.copy(p); else m.position.set(p[0], p[1], p[2]);
    m.rotation.set(r[0], r[1], r[2]); m.scale.set(s[0], s[1], s[2]);
    m.castShadow = true; parent.add(m); return m;
  };
  const grp = (parent, x = 0, y = 0, z = 0) => {
    const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g;
  };

  const isLog = def.type === 'log';
  const bw = def.build?.width ?? 1;
  const belly = def.build?.belly ?? 0;
  const W = isLog ? woodTextures() : null;
  const skin = isLog ? M(0xffffff, { map: W.side, roughness: 0.85 }) : M(def.skin, { roughness: 0.55 });
  const suit = isLog ? skin : M(def.suit, { roughness: 0.72 });
  const pants = isLog ? skin : M(def.pants ?? def.suit, { roughness: 0.72 });
  const shirtM = isLog ? skin : M(def.shirt ?? 0xffffff, { roughness: 0.5, side: THREE.DoubleSide });
  const shoes = isLog ? skin : M(def.shoes ?? 0x111111, { roughness: 0.25, metalness: 0.1 });
  const white = M(0xffffff, { roughness: 0.3 });
  const dark = M(0x111111, { roughness: 0.2 });

  const root = new THREE.Group();
  const J = {};
  J.hips = grp(root, 0, 0.95, 0);
  J.torso = grp(J.hips, 0, 0.04, 0);
  J.neck = grp(J.torso, 0, 0.72, 0);
  J.head = grp(J.neck, 0, 0.08, 0);

  // ---- torso ----
  if (isLog) {
    const endM = M(0xffffff, { map: W.end, roughness: 0.8 });
    add(new THREE.CylinderGeometry(0.36, 0.39, 1.05, 24), [skin, endM, endM], J.torso, [0, 0.42, 0]);
  } else {
    add(new THREE.SphereGeometry(0.27, 18, 12), pants, J.hips, [0, 0, 0], [0, 0, 0], [bw * 1.05, 0.62, 0.78]);
    add(new THREE.CapsuleGeometry(0.28, 0.34, 6, 18), suit, J.torso, [0, 0.38, 0], [0, 0, 0], [bw, 1, 0.74]);
    if (belly) add(new THREE.SphereGeometry(0.26, 18, 12), suit, J.torso, [0, 0.24, 0.07], [0, 0, 0], [bw * (1 + belly * 0.3), 0.9, 0.7 + belly]);
    const fz = 0.28 * 0.74 + 0.004;
    // shirt V
    const v = new THREE.Shape();
    v.moveTo(-0.1, 0.13); v.lineTo(0.1, 0.13); v.lineTo(0, -0.14); v.closePath();
    add(new THREE.ShapeGeometry(v), shirtM, J.torso, [0, 0.55, fz], [-0.18, 0, 0]);
    if (def.tie) {
      const tieM = M(def.tie, { roughness: 0.4, side: THREE.DoubleSide });
      const t = new THREE.Shape();
      t.moveTo(-0.025, 0.1); t.lineTo(0.025, 0.1); t.lineTo(0.045, -0.12); t.lineTo(0, -0.17); t.lineTo(-0.045, -0.12); t.closePath();
      add(new THREE.ShapeGeometry(t), tieM, J.torso, [0, 0.54, fz + 0.012], [-0.18, 0, 0]);
      add(new THREE.SphereGeometry(0.032, 10, 8), tieM, J.torso, [0, 0.66, fz - 0.005], [0, 0, 0], [1.2, 0.9, 0.7]);
    }
    for (const y of [0.33, 0.2]) add(new THREE.SphereGeometry(0.018, 8, 6), dark, J.torso, [0, y, fz + belly * 0.16 + 0.005]);
    add(new THREE.CylinderGeometry(0.1, 0.11, 0.16, 14), skin, J.neck, [0, 0.02, 0]);
    add(new THREE.TorusGeometry(0.105, 0.03, 8, 20), shirtM, J.neck, [0, -0.04, 0], [Math.PI / 2, 0, 0]);
    if (def.necklace) {
      const pearl = M(0xfff8ee, { roughness: 0.15, metalness: 0.2 });
      for (let i = 0; i < 13; i++) {
        const a = FRONT - 1.3 + (i / 12) * 2.6;
        add(new THREE.SphereGeometry(0.022, 8, 6), pearl, J.torso, [Math.cos(a) * 0.15, 0.66 - Math.sin(a) * 0.05 + 0.02, Math.sin(a) * 0.15 + 0.03]);
      }
    }
  }

  // ---- head ----
  const F = { eyes: [], brows: [], mouth: null, mouthBase: [1, 1, 1], features: [] };
  let onHead;
  let Sx = 1, Sy = 1, Sz = 1;
  let headC;
  if (isLog) {
    const endM = M(0xffffff, { map: W.end, roughness: 0.8 });
    headC = new THREE.Vector3(0, 0.3, 0);
    add(new THREE.CylinderGeometry(0.37, 0.37, 0.72, 24), [skin, endM, endM], J.head, headC);
    onHead = (yaw, pitch, off = 0) => new THREE.Vector3(Math.sin(yaw) * 0.37 * (1 + off), headC.y + pitch * 0.6, Math.cos(yaw) * 0.37 * (1 + off));
  } else {
    const R = 0.42;
    Sx = 1; Sy = 1.05; Sz = 0.95;
    headC = new THREE.Vector3(0, 0.36, 0.02);
    add(new THREE.SphereGeometry(R, 32, 24), skin, J.head, headC, [0, 0, 0], [Sx, Sy, Sz]);
    onHead = (yaw, pitch, off = 0) => new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch) * R * Sx * (1 + off),
      Math.sin(pitch) * R * Sy * (1 + off),
      Math.cos(yaw) * Math.cos(pitch) * R * Sz * (1 + off),
    ).add(headC);
    const shell = (mat, r, phiS, phiL, thS, thL) => add(new THREE.SphereGeometry(R * r, 32, 16, phiS, phiL, thS, thL), mat, J.head, headC, [0, 0, 0], [Sx, Sy, Sz]);

    // ears (pushed out past the hair so they always show)
    const earM = M(def.skin, { roughness: 0.6 });
    const earIn = M(new THREE.Color(def.skin).multiplyScalar(0.72), { roughness: 0.7 });
    for (const s of [1, -1]) {
      const ep = onHead(s * 1.5, 0.0, -0.02);
      const ear = add(new THREE.SphereGeometry(0.1, 16, 12), earM, J.head, ep, [0, 0, 0], [0.5, 1.15, 0.8]);
      add(new THREE.SphereGeometry(0.06, 12, 10), earIn, ear, [s * 0.05, -0.005, 0.02], [0, 0, 0], [0.6, 0.8, 0.7]);
      if (def.earrings) add(new THREE.SphereGeometry(0.03, 10, 8), M(0xf2c14e, { metalness: 1, roughness: 0.25 }), J.head, onHead(s * 1.5, -0.3, 0.06));
    }
    const texM = (color, kind, o = {}) => M(color, { roughness: 0.85, side: THREE.DoubleSide, ...o });
    if (def.beard) shell(texM(def.beard, 'beard', { roughness: 0.95 }), 1.005, FRONT - 1.45, 2.9, Math.PI * 0.62, Math.PI * 0.32);
    if (def.stubble) shell(M(def.stubble, { roughness: 0.9 }), 1.012, FRONT - 1.25, 2.5, Math.PI * 0.56, Math.PI * 0.36);

    // hair, sitting on top of the head
    const h = def.hair;
    if (h) {
      const kind = h.style === 'curly' ? 'curly' : h.style === 'bald' ? 'stubble' : 'strands';
      const hairM = texM(h.color, kind, { roughness: h.style === 'slick' ? 0.35 : 0.72 });
      const line = Math.PI * 0.27; // hairline, above the brows
      const sides = (r, t1) => shell(hairM, r, FRONT + 1.3, TAU - 2.6, line - 0.05, t1 - line + 0.05);
      switch (h.style) {
        case 'bald': {
          // shaved: a faint stubble shadow around the sides and back
          const st = texM(h.color, 'stubble', { transparent: true, opacity: 0.55, depthWrite: false });
          shell(st, 1.01, FRONT + 1.15, TAU - 2.3, Math.PI * 0.3, Math.PI * 0.26);
          break;
        }
        case 'short':
          shell(hairM, 1.06, 0, TAU, 0, line); sides(1.05, Math.PI * 0.5);
          break;
        case 'slick':
          shell(hairM, 1.05, 0, TAU, 0, line); sides(1.04, Math.PI * 0.5);
          add(new THREE.SphereGeometry(0.16, 16, 10), hairM, J.head, onHead(0.25, 0.75, -0.02), [0, 0, 0.3], [1.3, 0.55, 1]);
          break;
        case 'swept':
          // full, combed back, with a quiff at the front
          shell(hairM, 1.1, 0, TAU, 0, line); sides(1.07, Math.PI * 0.5);
          break;
        case 'receding':
          // high forehead: thin on top, fuller around the sides and back
          shell(hairM, 1.04, 0, TAU, 0, Math.PI * 0.18);
          sides(1.045, Math.PI * 0.5);
          break;
        case 'curly': {
          shell(hairM, 1.05, 0, TAU, 0, line); sides(1.04, Math.PI * 0.5);
          const curl = new THREE.SphereGeometry(1, 7, 5);
          for (let i = 0; i < 150; i++) {
            const phi = Math.random() * TAU;
            const th = Math.random() * (Math.sin(phi) > 0.4 ? line : Math.PI * 0.56);
            const d = new THREE.Vector3(-Math.cos(phi) * Math.sin(th) * Sx, Math.cos(th) * Sy, Math.sin(phi) * Math.sin(th) * Sz).multiplyScalar(R * 1.06).add(headC);
            const r = 0.04 + Math.random() * 0.03;
            add(curl, hairM, J.head, d, [0, 0, 0], [r, r, r]);
          }
          break;
        }
        case 'long':
          // parted on top, falling past the ears to the shoulders
          shell(hairM, 1.08, 0, TAU, 0, line);
          shell(hairM, 1.1, FRONT + 0.92, TAU - 1.84, line - 0.05, Math.PI * 0.62);
          add(new THREE.CapsuleGeometry(0.3, 0.42, 6, 16), hairM, J.head, [0, -0.08, -0.2], [0, 0, 0], [1.32, 1, 0.6]);
          for (const s of [1, -1]) add(new THREE.CapsuleGeometry(0.1, 0.42, 6, 12), hairM, J.head, onHead(s * 1.05, -0.45, 0.02), [0.15, 0, s * 0.08], [1, 1, 0.8]);
          break;
        default:
          shell(hairM, 1.05, 0, TAU, 0, line); sides(1.04, Math.PI * 0.5);
      }
    }

    // kippah: knitted (kippah sruga) or black velvet
    const kp = def.kippah;
    if (kp) {
      const km = kp.type === 'velvet'
        ? new THREE.MeshPhysicalMaterial({ map: velvetTexture(kp.color).map, color: 0xffffff, roughness: 0.8, sheen: 1, sheenColor: 0x444444, sheenRoughness: 0.4, side: THREE.DoubleSide })
        : M(0xffffff, { map: knitKippahTexture(kp.base, kp.pattern, kp.edge).map, bumpMap: knitKippahTexture(kp.base, kp.pattern, kp.edge).map, bumpScale: 2, roughness: 0.9, side: THREE.DoubleSide });
      if (kp.type === 'velvet') mats.push(km);
      const k = add(new THREE.SphereGeometry(R * 1.1, 32, 10, 0, TAU, 0, Math.PI * (kp.size ?? 0.22)), km, J.head, headC, [-(kp.tilt ?? 0.22), 0, 0], [Sx, Sy, Sz]);
      k.renderOrder = 1;
    }
  }

  // face features
  {
    const eyeR = isLog ? 0.11 : 0.095;
    const yawE = isLog ? 0.4 : 0.36;
    for (const s of [1, -1]) {
      const p = onHead(s * yawE, isLog ? 0.15 : 0.1, isLog ? 0 : -0.03);
      const eg = grp(J.head, p.x, p.y, p.z);
      eg.rotation.order = 'YXZ'; eg.rotation.y = s * yawE; eg.rotation.x = -0.1;
      add(new THREE.SphereGeometry(eyeR, 16, 12), white, eg, [0, 0, 0], [0, 0, 0], [1, 1, 0.6]);
      add(new THREE.SphereGeometry(eyeR * 0.52, 12, 10), def.eyeColor ? M(def.eyeColor, { roughness: 0.2 }) : dark, eg, [0, 0, eyeR * 0.42], [0, 0, 0], [1, 1, 0.6]);
      F.eyes.push(eg);
      const browM = M(isLog ? 0x3a1c08 : (def.brows ?? 0x222222), { roughness: 0.9 });
      const bp = onHead(s * (yawE - 0.02), isLog ? 0.42 : 0.34, 0.02);
      const b = add(new THREE.BoxGeometry(isLog ? 0.22 : 0.19, isLog ? 0.07 : 0.05, 0.05), browM, J.head, bp);
      b.rotation.order = 'YXZ'; b.rotation.y = s * yawE; b.rotation.x = -0.3;
      F.brows.push({ mesh: b, s, y0: bp.y });
    }
    const nose = def.nose ?? 1;
    if (isLog) add(new THREE.CylinderGeometry(0.035, 0.05, 0.14, 10), skin, J.head, onHead(0, -0.02, 0.15), [Math.PI / 2, 0, 0]);
    else add(new THREE.SphereGeometry(0.07 * nose, 16, 12), skin, J.head, onHead(0, -0.06, 0), [0, 0, 0], [1, 1.15, 1.3]);
    const mp = onHead(0, isLog ? -0.28 : -0.33, -0.03);
    const mg = grp(J.head, mp.x, mp.y, mp.z);
    mg.rotation.x = isLog ? 0 : 0.33;
    const mouthM = M(def.lips ?? 0x3a0808, { roughness: 0.5 });
    F.mouthBase = isLog ? [1.8, 0.35, 0.4] : [1.35, 0.3, 0.45];
    F.mouth = add(new THREE.SphereGeometry(0.1, 16, 10), mouthM, mg, [0, 0, 0], [0, 0, 0], F.mouthBase);
    if (def.mustache) add(new THREE.CapsuleGeometry(0.035, 0.18, 4, 8), M(def.mustache, { roughness: 0.9 }), J.head, onHead(0, -0.2, 0.02), [0, 0, Math.PI / 2], [1, 1, 0.7]);
    if (def.glasses) {
      const shades = def.glasses === 'shades', square = def.glasses === 'square';
      const gm = M(shades ? 0x0a0a0a : 0x2a2a2a, { metalness: 0.6, roughness: 0.3 });
      for (const s of [1, -1]) {
        const p = onHead(s * 0.36, 0.1, 0.07);
        const ring = add(new THREE.TorusGeometry(0.11, 0.016, 8, square ? 4 : 24), gm, J.head, p);
        ring.rotation.order = 'YXZ'; ring.rotation.set(-0.1, s * 0.36, square ? Math.PI / 4 : 0);
        if (square) ring.scale.set(1.1, 0.85, 1);
        if (shades) {
          const lens = add(new THREE.CircleGeometry(0.105, 20), M(0x050505, { roughness: 0.05, metalness: 0.8 }), J.head, p);
          lens.rotation.order = 'YXZ'; lens.rotation.set(-0.1, s * 0.36, 0);
        }
        const armP = onHead(s * 0.95, 0.1, 0.03);
        add(new THREE.BoxGeometry(0.018, 0.018, 0.34), gm, J.head, armP, [0, -s * 0.3, 0]);
      }
      add(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 6), gm, J.head, onHead(0, 0.13, 0.09), [0, 0, Math.PI / 2]);
    }
  }

  // ---- arms ----
  const armR = isLog ? 0.06 : 0.085;
  for (const [s, k] of [[1, 'l'], [-1, 'r']]) {
    const sh = J[k + 's'] = grp(J.torso, s * (isLog ? 0.4 : 0.33 * bw), isLog ? 0.62 : 0.6, 0);
    if (!isLog) add(new THREE.SphereGeometry(0.13, 14, 10), suit, sh, [0, -0.01, 0]);
    add(new THREE.CapsuleGeometry(armR, 0.22, 4, 10), suit, sh, [0, -0.17, 0]);
    const el = J[k + 'e'] = grp(sh, 0, -0.36, 0);
    add(new THREE.CapsuleGeometry(armR * 0.92, 0.2, 4, 10), suit, el, [0, -0.16, 0]);
    if (!isLog) add(new THREE.CylinderGeometry(0.082, 0.082, 0.05, 12), shirtM, el, [0, -0.29, 0]);
    add(new THREE.SphereGeometry(0.1, 14, 10), skin, el, [0, -0.38, 0]);
    J[k + 'w'] = grp(el, 0, -0.38, 0);
  }

  // ---- legs ----
  const legR = isLog ? 0.07 : 0.11;
  for (const [s, k] of [[1, 'l'], [-1, 'r']]) {
    const hip = J[k + 'h'] = grp(J.hips, s * (isLog ? 0.17 : 0.14 * bw), -0.02, 0);
    add(new THREE.CapsuleGeometry(legR, 0.26, 4, 10), pants, hip, [0, -0.22, 0]);
    const kn = J[k + 'k'] = grp(hip, 0, -0.44, 0);
    add(new THREE.CapsuleGeometry(legR * 0.92, 0.26, 4, 10), pants, kn, [0, -0.21, 0]);
    add(new THREE.SphereGeometry(0.12, 14, 10), shoes, kn, [0, -0.44, 0.06], [0, 0, 0], [1, 0.65, 1.7]);
  }

  // ---- props ----
  if (def.prop === 'gavel') {
    const gv = makeGavel();
    gv.traverse((o) => { if (o.isMesh) { mats.push(o.material); geos.push(o.geometry); } });
    gv.scale.setScalar(1.3);
    gv.rotation.x = Math.PI / 2; gv.position.z = -0.08;
    J.rw.add(gv);
  } else if (def.prop === 'bat') {
    const batM = M(0xd9b27a, { roughness: 0.5 });
    const bat = add(new THREE.CylinderGeometry(0.075, 0.03, 1.05, 14), batM, J.rw, [0, 0, 0.45], [Math.PI / 2, 0, 0]);
    add(new THREE.SphereGeometry(0.075, 12, 8), batM, bat, [0, 0.52, 0]);
  }

  applyPose(J, POSE.stance);

  // ---- expressions / flash ----
  let expr = 'normal', blinkT = 1 + Math.random() * 3, blink = 0, flashT = 0;
  const flashColor = new THREE.Color();
  function setExpression(e) { if (EXPR[e]) expr = e; }
  function flash(color = 0xffffff, k = 1) { flashColor.set(color).multiplyScalar(k); flashT = 1; }
  function update(dt) {
    blinkT -= dt;
    if (blinkT < 0) { blink = 0.12; blinkT = 2 + Math.random() * 4; }
    if (blink > 0) blink -= dt;
    const E = EXPR[expr];
    const a = Math.min(1, dt * 22);
    const eyeY = blink > 0 && expr !== 'ko' ? 0.1 : E.eye;
    for (const e of F.eyes) e.scale.y += (eyeY - e.scale.y) * a;
    for (const b of F.brows) {
      b.mesh.rotation.z += (b.s * E.brow - b.mesh.rotation.z) * a;
      b.mesh.position.y += (b.y0 + E.browY - b.mesh.position.y) * a;
    }
    if (F.mouth) {
      const [bx, by, bz] = F.mouthBase;
      F.mouth.scale.x += (bx * E.mx - F.mouth.scale.x) * a;
      F.mouth.scale.y += (by * E.my - F.mouth.scale.y) * a;
      F.mouth.scale.z = bz;
    }
    if (flashT > 0) {
      flashT = Math.max(0, flashT - dt * 7);
      for (const m of mats) if (m.emissive) m.emissive.copy(flashColor).multiplyScalar(flashT);
    }
  }
  function dispose() {
    for (const g of geos) g.dispose();
    for (const m of mats) m.dispose();
  }
  return { root, J, mats, update, setExpression, flash, dispose };
}

// Renders a head-and-shoulders portrait of each fighter to a data URL.
export function renderPortraits(defs, size = 256) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(size, size * 4 / 3, false);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffe8d0, 0x401010, 1.4));
  const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(-2, 3, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff4020, 3.5); rim.position.set(3, 2, -3); scene.add(rim);
  const cam = new THREE.PerspectiveCamera(30, 3 / 4, 0.1, 50);
  cam.position.set(0.55, 2.1, 3.4); cam.lookAt(0, 1.95, 0);
  const out = {};
  for (const d of defs) {
    const m = buildFighterModel(d);
    applyPose(m.J, POSE.portrait);
    m.root.rotation.y = 0.3;
    scene.add(m.root);
    r.render(scene, cam);
    out[d.id] = r.domElement.toDataURL('image/png');
    scene.remove(m.root);
    m.dispose();
  }
  r.dispose();
  r.forceContextLoss();
  return out;
}
