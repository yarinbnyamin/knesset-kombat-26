import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeGavel } from './model.js';

const TAU = Math.PI * 2;

// Floor plane is 40 x 24 world units centered at z = -2 (so it spans z -14..10).
function floorTextures() {
  const W = 2048, H = 1228, PX = W / 40;
  const cx = W / 2, cy = (14 / 24) * H;
  const base = document.createElement('canvas'); base.width = W; base.height = H;
  const emi = document.createElement('canvas'); emi.width = W; emi.height = H;
  const g = base.getContext('2d'), e = emi.getContext('2d');
  g.fillStyle = '#2b1712'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * W, y = Math.random() * H, r = 4 + Math.random() * 40;
    g.fillStyle = `rgba(${(60 + Math.random() * 50) | 0},${(25 + Math.random() * 25) | 0},${(18 + Math.random() * 15) | 0},${0.05 + Math.random() * 0.08})`;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3;
  for (let x = 0; x <= W; x += PX * 2) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = cy % (PX * 2); y <= H; y += PX * 2) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  e.fillStyle = '#000'; e.fillRect(0, 0, W, H);

  const both = (fn) => { fn(g, true); fn(e, false); };
  // central seal
  both((c, isBase) => {
    c.strokeStyle = isBase ? '#5a3a14' : '#ffb040';
    c.shadowColor = '#ffa030'; c.shadowBlur = isBase ? 0 : 14;
    for (const [r, w] of [[3.2, 6], [2.9, 3], [1.2, 3]]) { c.lineWidth = w; c.beginPath(); c.arc(cx, cy, r * PX, 0, TAU); c.stroke(); }
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      c.lineWidth = 3;
      c.beginPath(); c.moveTo(cx + Math.cos(a) * 2.9 * PX, cy + Math.sin(a) * 2.9 * PX); c.lineTo(cx + Math.cos(a) * 3.2 * PX, cy + Math.sin(a) * 3.2 * PX); c.stroke();
    }
    c.shadowBlur = 0;
  });
  // glowing cracks
  const cracks = [];
  const crack = (x, y, ang, len, w, depth) => {
    const pts = [[x, y]];
    for (let i = 0; i < len; i++) {
      ang += (Math.random() - 0.5) * 0.7;
      x += Math.cos(ang) * (10 + Math.random() * 16); y += Math.sin(ang) * (10 + Math.random() * 16);
      pts.push([x, y]);
      if (depth < 3 && Math.random() < 0.08) crack(x, y, ang + (Math.random() < 0.5 ? 0.8 : -0.8), len * 0.5 | 0, w * 0.6, depth + 1);
    }
    cracks.push({ pts, w });
  };
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU + Math.random() * 0.3;
    crack(cx + Math.cos(a) * 3.3 * PX, cy + Math.sin(a) * 3.3 * PX, a, 30 + Math.random() * 40, 5, 0);
  }
  for (let i = 0; i < 10; i++) crack(Math.random() * W, Math.random() * H, Math.random() * TAU, 20 + Math.random() * 20, 3.5, 1);
  for (const { pts, w } of cracks) {
    for (const [c, col, blur, mul] of [[g, '#120806', 0, 1.4], [e, '#ff9a2a', 16, 1], [e, '#fff0b0', 0, 0.35]]) {
      c.strokeStyle = col; c.lineWidth = w * mul; c.lineCap = 'round'; c.lineJoin = 'round';
      c.shadowColor = '#ff8a20'; c.shadowBlur = blur;
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts) c.lineTo(p[0], p[1]);
      c.stroke();
    }
  }
  g.shadowBlur = e.shadowBlur = 0;
  const mk = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  return { map: mk(base), emissiveMap: mk(emi) };
}

function panelTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#3a1c10'; g.fillRect(0, 0, 512, 256);
  for (let x = 0; x < 512; x += 32) {
    const grd = g.createLinearGradient(x, 0, x + 32, 0);
    grd.addColorStop(0, '#2a120a'); grd.addColorStop(0.5, '#4a2414'); grd.addColorStop(1, '#22100a');
    g.fillStyle = grd; g.fillRect(x, 0, 32, 256);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(10, 1);
  return t;
}

export function buildStage(scene, renderer) {
  scene.background = new THREE.Color(0x0a0302);
  scene.fog = new THREE.Fog(0x120404, 18, 48);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.3;

  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a843, metalness: 1, roughness: 0.28 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x1a1412, metalness: 0.7, roughness: 0.5 });
  const woodDark = new THREE.MeshStandardMaterial({ color: 0x2a140a, roughness: 0.6 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a2e16, roughness: 0.45 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x8a1016, roughness: 0.55 });
  const S = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

  // ---- floor ----
  const tex = floorTextures();
  const floorMat = new THREE.MeshStandardMaterial({ map: tex.map, emissiveMap: tex.emissiveMap, emissive: 0xffa040, emissiveIntensity: 1.2, roughness: 0.62, metalness: 0.15 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 24), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.z = -2; floor.receiveShadow = true;
  scene.add(floor);

  // ---- plenum seating: horseshoe tiers behind the fighters ----
  const CZ = -3, dummy = new THREE.Object3D();
  const seatSpots = [];
  for (let tier = 0; tier < 6; tier++) {
    const r = 7.2 + tier * 1.35, y = 0.35 + tier * 0.5;
    const a0 = Math.PI + 0.32, a1 = TAU - 0.32;
    const n = Math.floor(((a1 - a0) * r) / 1.05);
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      seatSpots.push({ x: Math.cos(a) * r, z: CZ + Math.sin(a) * r, y, face: Math.atan2(-Math.cos(a), -Math.sin(a)) });
    }
  }
  const inst = (geo, mat, fn) => {
    const im = new THREE.InstancedMesh(geo, mat, seatSpots.length);
    seatSpots.forEach((s, i) => { fn(s); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
    im.castShadow = false; im.receiveShadow = true; scene.add(im); return im;
  };
  const place = (s, fwd, up, rotX = 0) => {
    dummy.position.set(s.x + Math.sin(s.face) * fwd, s.y + up, s.z + Math.cos(s.face) * fwd);
    dummy.rotation.set(rotX, s.face, 0); dummy.scale.set(1, 1, 1);
  };
  inst(new THREE.BoxGeometry(1.08, 1, 1.35), woodDark, (s) => { place(s, 0, -s.y / 2); dummy.scale.set(1, s.y + 0.001, 1); dummy.position.y = s.y / 2; });
  inst(new THREE.BoxGeometry(0.72, 0.16, 0.62), leather, (s) => place(s, -0.1, 0.42));
  inst(new THREE.BoxGeometry(0.72, 0.8, 0.14), leather, (s) => place(s, -0.42, 0.85, -0.12));
  inst(new THREE.BoxGeometry(1.02, 0.07, 0.42), wood, (s) => place(s, 0.45, 0.82));
  inst(new THREE.BoxGeometry(1.02, 0.72, 0.05), wood, (s) => place(s, 0.64, 0.46));

  // ---- back wall ----
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(17, 17, 16, 64, 1, true, Math.PI / 2 + 0.25, Math.PI - 0.5),
    new THREE.MeshStandardMaterial({ map: panelTexture(), roughness: 0.7, side: THREE.BackSide }),
  );
  wall.position.set(0, 7.5, CZ); scene.add(wall);
  const trim = new THREE.Mesh(new THREE.CylinderGeometry(16.9, 16.9, 0.18, 64, 1, true, Math.PI / 2 + 0.25, Math.PI - 0.5),
    new THREE.MeshStandardMaterial({ color: 0xd9a843, metalness: 1, roughness: 0.3, emissive: 0x8a4a10, emissiveIntensity: 0.6, side: THREE.BackSide }));
  trim.position.set(0, 4.8, CZ); scene.add(trim);

  // hanging banners
  const bannerMat = new THREE.MeshStandardMaterial({ color: 0x8a0a12, roughness: 0.8, side: THREE.DoubleSide });
  for (const x of [-6.5, 6.5]) {
    const geo = new THREE.PlaneGeometry(2.2, 7, 12, 4);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 5) * 0.08);
    geo.computeVertexNormals();
    const b = new THREE.Mesh(geo, bannerMat);
    const a = Math.atan2(x, 16);
    b.position.set(x * 1.35, 9.2, CZ - 15.6 * Math.cos(a) + 0.2);
    b.rotation.y = -a;
    scene.add(b);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 8), gold);
    rod.rotation.z = Math.PI / 2; rod.position.set(b.position.x, 12.75, b.position.z); rod.rotation.y = -a; scene.add(rod);
    for (const dx of [-0.8, 0.8]) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 6.6), new THREE.MeshStandardMaterial({ color: 0xd9a843, metalness: 1, roughness: 0.35 }));
      stripe.position.set(dx, 0, 0.1); b.add(stripe);
    }
  }

  // ---- menorah ----
  const menorah = new THREE.Group();
  menorah.position.set(0, 0, -6.6);
  scene.add(menorah);
  const addM = (geo, m, p, r = [0, 0, 0]) => { const o = S(new THREE.Mesh(geo, m)); o.position.set(...p); o.rotation.set(...r); menorah.add(o); return o; };
  addM(new THREE.CylinderGeometry(1.5, 1.8, 0.35, 32), woodDark, [0, 0.17, 0]);
  addM(new THREE.CylinderGeometry(1.1, 1.3, 0.3, 32), woodDark, [0, 0.5, 0]);
  addM(new THREE.CylinderGeometry(0.35, 0.7, 0.45, 24), gold, [0, 0.87, 0]);
  addM(new THREE.CylinderGeometry(0.13, 0.16, 4.2, 16), gold, [0, 3.2, 0]);
  const armY = 5.0, armGap = 0.78;
  const candles = [];
  for (let k = 1; k <= 3; k++) {
    const r = k * armGap;
    const pts = [];
    for (let i = 0; i <= 24; i++) { const a = Math.PI + (i / 24) * Math.PI; pts.push(new THREE.Vector3(Math.cos(a) * r, armY + Math.sin(a) * r, 0)); }
    addM(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.1, 10), gold, [0, 0, 0]);
    for (let i = 3; i < 24; i += 4) {
      const a = Math.PI + (i / 24) * Math.PI;
      addM(new THREE.SphereGeometry(0.16, 12, 8), gold, [Math.cos(a) * r, armY + Math.sin(a) * r, 0]);
    }
  }
  for (let k = -3; k <= 3; k++) {
    const x = k * armGap;
    addM(new THREE.CylinderGeometry(0.22, 0.12, 0.3, 16), gold, [x, armY + 0.15, 0]);
    addM(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 8), new THREE.MeshStandardMaterial({ color: 0xfff0d0, emissive: 0xffc070, emissiveIntensity: 0.6 }), [x, armY + 0.38, 0]);
    candles.push(new THREE.Vector3(x, armY + 0.55, menorah.position.z));
  }
  const menorahLight = new THREE.PointLight(0xffb050, 18, 16, 2);
  menorahLight.position.set(0, armY + 0.8, menorah.position.z + 0.6);
  scene.add(menorahLight);

  // ---- braziers ----
  const braziers = [], brazierLights = [];
  for (const x of [-6.3, 6.3]) {
    const b = new THREE.Group(); b.position.set(x, 0, -2.4); scene.add(b);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU;
      const leg = S(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.7, 8), iron));
      leg.position.set(Math.cos(a) * 0.35, 0.8, Math.sin(a) * 0.35);
      leg.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
      b.add(leg);
    }
    const bowl = S(new THREE.Mesh(new THREE.SphereGeometry(0.65, 24, 12, 0, TAU, Math.PI / 2, Math.PI / 2), iron));
    bowl.position.y = 1.75; bowl.material.side = THREE.DoubleSide; b.add(bowl);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.05, 8, 32), gold);
    rim.rotation.x = Math.PI / 2; rim.position.y = 1.75; b.add(rim);
    const coals = new THREE.Mesh(new THREE.CircleGeometry(0.58, 24), new THREE.MeshStandardMaterial({ color: 0x331008, emissive: 0xff5a10, emissiveIntensity: 2.5 }));
    coals.rotation.x = -Math.PI / 2; coals.position.y = 1.68; b.add(coals);
    braziers.push(new THREE.Vector3(x, 1.75, -2.4));
    const L = new THREE.PointLight(0xff7a2a, 30, 14, 2); L.position.set(x, 2.6, -2.2); scene.add(L); brazierLights.push(L);
  }

  // ---- lights ----
  const hemi = new THREE.HemisphereLight(0xffe0c0, 0x2a0a08, 0.55); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff0dd, 2.4);
  key.position.set(-5, 11, 9); key.target.position.set(0, 1, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -11, right: 11, top: 9, bottom: -5, near: 1, far: 40 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0x6a78ff, 0.35); fill.position.set(8, 4, 6); scene.add(fill);
  const rimL = new THREE.SpotLight(0xff3020, 70, 32, 0.7, 0.5, 1.4);
  rimL.position.set(0, 8, -7); rimL.target.position.set(0, 1, 1); scene.add(rimL, rimL.target);
  const spots = [-3.4, 3.4].map((x) => {
    const s = new THREE.SpotLight(0xfff0d8, 0, 16, 0.42, 0.6, 1.5);
    s.position.set(x * 0.9, 7.5, 5); s.target.position.set(x, 0.8, 0); scene.add(s, s.target); return s;
  });
  const introSpot = new THREE.SpotLight(0xffe8c8, 0, 12, 0.5, 0.5, 1.5);
  introSpot.position.set(0.4, 5.5, 4.6); introSpot.target.position.set(0, 1.1, 3.2); scene.add(introSpot, introSpot.target);

  // ---- select podium rings ----
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x3a2008, emissive: 0xffb040, emissiveIntensity: 2.2, metalness: 1, roughness: 0.3 });
  const rings = [-3.4, 3.4].map((x) => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.035, 8, 48), ringMat);
    r.rotation.x = -Math.PI / 2; r.position.set(x, 0.03, 0); r.visible = false; scene.add(r); return r;
  });

  // ---- intro: gavel on a sound block ----
  const intro = new THREE.Group(); scene.add(intro);
  const table = S(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 1.0, 32), wood)); table.position.set(0, 0.5, 3.2); intro.add(table);
  const block = S(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.12, 32), wood)); block.position.set(0, 1.06, 3.2); intro.add(block);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.345, 0.345, 0.03, 32), gold); band.position.set(0, 1.06, 3.2); intro.add(band);
  const pivot = new THREE.Group(); pivot.position.set(0.66, 1.26, 3.2); intro.add(pivot);
  const gavel = makeGavel(); gavel.scale.setScalar(1.15); gavel.rotation.z = Math.PI / 2; pivot.add(gavel);
  intro.visible = false;

  // ---- moods ----
  const MOODS = {
    fight: { key: 2.0, hemi: 0.55, fill: 0.35, rim: 70, menorah: 18, braz: 30, spots: 0, intro: 0, floor: 1.2 },
    title: { key: 1.5, hemi: 0.4, fill: 0.25, rim: 90, menorah: 22, braz: 32, spots: 0, intro: 0, floor: 1.4 },
    select: { key: 0.8, hemi: 0.3, fill: 0.2, rim: 60, menorah: 12, braz: 20, spots: 45, intro: 0, floor: 0.9 },
    intro: { key: 0.15, hemi: 0.1, fill: 0.05, rim: 25, menorah: 6, braz: 8, spots: 0, intro: 160, floor: 0.35 },
    dark: { key: 0.25, hemi: 0.08, fill: 0.05, rim: 130, menorah: 4, braz: 10, spots: 0, intro: 0, floor: 2.4 },
  };
  const cur = { ...MOODS.intro };
  let mood = MOODS.intro, lightning = 0;

  const stage = {
    candles, braziers, intro, introPivot: pivot, rings,
    setMood(name) {
      mood = MOODS[name];
      rings.forEach((r) => (r.visible = name === 'select'));
      intro.visible = name === 'intro';
    },
    lightning(k = 1) { lightning = k; },
    update(dt, time, fx) {
      const a = 1 - Math.exp(-dt * 3);
      for (const k in cur) cur[k] += (mood[k] - cur[k]) * a;
      const flick = (s) => 0.82 + 0.18 * Math.sin(time * 13 + s) * Math.sin(time * 7.3 + s * 2);
      lightning = Math.max(0, lightning - dt * 3);
      key.intensity = cur.key + lightning * 6;
      key.color.setRGB(1, 0.94 + lightning * 0.06, 0.87 + lightning * 0.13);
      hemi.intensity = cur.hemi + lightning; fill.intensity = cur.fill;
      rimL.intensity = cur.rim;
      menorahLight.intensity = cur.menorah * flick(1);
      brazierLights.forEach((L, i) => (L.intensity = cur.braz * flick(i * 3 + 2)));
      spots.forEach((s) => (s.intensity = cur.spots));
      introSpot.intensity = cur.intro;
      floorMat.emissiveIntensity = cur.floor * (0.85 + 0.15 * Math.sin(time * 1.7));
      ringMat.emissiveIntensity = 1.6 + Math.sin(time * 3) * 0.6;

      // fire
      const n = (rate) => Math.floor(rate * dt + Math.random());
      for (const p of braziers) {
        for (let i = n(120); i > 0; i--) {
          const r = Math.random() * 0.42, an = Math.random() * TAU;
          fx.fire.spawn(p.x + Math.cos(an) * r, p.y, p.z + Math.sin(an) * r, (Math.random() - 0.5) * 0.3, 1.0 + Math.random() * 1.4, (Math.random() - 0.5) * 0.3,
            0.35 + Math.random() * 0.4, 0.2 + Math.random() * 0.25, 1.7, 0.55 + Math.random() * 0.35, 0.1, 0.75, 0.8, 1.2, 1);
        }
        if (Math.random() < dt * 6) fx.fire.spawn(p.x, p.y + 0.4, p.z, (Math.random() - 0.5) * 1.2, 2 + Math.random() * 2, (Math.random() - 0.5) * 1.2, 1.5, 0.05, 3, 1.5, 0.3, 1, -0.5, 0.3, 0.6);
      }
      for (const c of candles) {
        for (let i = n(26); i > 0; i--) fx.fire.spawn(c.x + (Math.random() - 0.5) * 0.04, c.y, c.z, 0, 0.5 + Math.random() * 0.4, 0, 0.25 + Math.random() * 0.15, 0.2, 2.4, 1.1, 0.3, 0.9, 0, 1, 1);
      }
      for (let i = n(10); i > 0; i--) fx.fire.spawn((Math.random() - 0.5) * 22, 0.1, -4 + Math.random() * 7, (Math.random() - 0.5) * 0.3, 0.4 + Math.random() * 0.5, 0, 4 + Math.random() * 3, 0.05, 2.5, 0.9, 0.2, 0.9, 0, 0.1, 0.5);
    },
  };
  return stage;
}
