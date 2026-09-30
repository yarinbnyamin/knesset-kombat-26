import * as THREE from 'three';

// Meshes for special moves. Each maker returns a Group centered on its origin.
const TEX = {};
function canvasTex(key, w, h, draw) {
  if (TEX[key]) return TEX[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (TEX[key] = t);
}
const glow = (color, opacity = 0.9) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...o });

export const MESH = {
  // Netanyahu: the UN-speech cartoon bomb, with its red line
  bomb() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 18), std(0x151515, { roughness: 0.35, metalness: 0.3 })));
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.12, 14), std(0x222222));
    neck.position.y = 0.36; g.add(neck);
    const fuse = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 6, 12, Math.PI), std(0xc8a060));
    fuse.position.set(0.1, 0.44, 0); g.add(fuse);
    const line = new THREE.Mesh(new THREE.TorusGeometry(0.345, 0.03, 6, 32), std(0xe01010, { emissive: 0xa00000 }));
    line.rotation.x = Math.PI / 2; line.position.y = 0.12; g.add(line);
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), glow(0xffcc40, 1));
    spark.position.set(0.22, 0.46, 0); spark.name = 'spark'; g.add(spark);
    return g;
  },
  // Ben-Gvir: jail cage that drops from the rafters
  cage() {
    const g = new THREE.Group();
    const bar = std(0x3a3a40, { metalness: 0.9, roughness: 0.35 });
    const H = 2.9, R = 0.72;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, H, 6), bar);
      b.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); g.add(b);
    }
    for (const y of [-H / 2, 0, H / 2]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.045, 6, 28), bar);
      ring.rotation.x = Math.PI / 2; ring.position.y = y; g.add(ring);
    }
    const top = new THREE.Mesh(new THREE.ConeGeometry(R * 1.05, 0.4, 28), bar);
    top.position.y = H / 2 + 0.2; g.add(top);
    return g;
  },
  // Smotrich: budget-cut scissors
  scissors() {
    const g = new THREE.Group();
    const steel = std(0xd8dde4, { metalness: 1, roughness: 0.2 });
    const handle = std(0xd4a017, { roughness: 0.4 });
    for (const s of [1, -1]) {
      const half = new THREE.Group();
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.02), steel);
      blade.position.x = 0.3; half.add(blade);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 18), handle);
      ring.position.x = -0.12; half.add(ring);
      half.rotation.z = s * 0.25; half.name = s > 0 ? 'a' : 'b';
      g.add(half);
    }
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 10), handle);
    pin.rotation.x = Math.PI / 2; g.add(pin);
    g.scale.setScalar(1.3);
    return g;
  },
  // Gotliv: sonic "objection" rings
  scream() {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.055, 8, 36), glow(0xff5a8a));
      r.rotation.y = Math.PI / 2; g.add(r);
    }
    return g;
  },
};

// Per-kind animation of a projectile mesh.
const SPIN = {
  bomb(p) { p.mesh.rotation.z -= 0.12 * p.dir; const s = p.mesh.getObjectByName('spark'); if (s) s.scale.setScalar(0.7 + Math.random() * 0.8); },
  cage() {},
  scissors(p) { p.mesh.rotation.z -= 0.45 * p.dir; const k = Math.sin(p.age * 0.6) * 0.3; p.mesh.getObjectByName('a').rotation.z = 0.1 + k; p.mesh.getObjectByName('b').rotation.z = -0.1 - k; },
  scream(p) {
    p.mesh.children.forEach((r, i) => {
      const k = (p.age * 0.05 + i / 4) % 1;
      r.scale.setScalar(0.35 + k * 1.3); r.position.x = -p.dir * k * 0.7; r.material.opacity = 0.95 * (1 - k);
    });
  },
};

// cfg: { mesh, speed, dmg, y, w, h, vy, grav, drop, delay, freeze, launch, meter, explode, trail, life }
export class Projectile {
  constructor(owner, cfg, scene, opts = {}) {
    this.cfg = cfg; this.owner = owner; this.scene = scene; this.type = cfg.mesh;
    this.dir = owner.facing;
    this.age = 0; this.alive = true;
    this.dmg = cfg.dmg * owner.stats.power;
    this.w = cfg.w ?? 0.3; this.h = cfg.h ?? 0.3;
    if (cfg.drop) {
      this.x = opts.x; this.y = 11; this.vx = 0; this.vy = 0; this.wait = cfg.delay ?? 30;
      this.marker = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.8, 32), glow(0xff3020, 0.8));
      this.marker.rotation.x = -Math.PI / 2; this.marker.position.set(this.x, 0.03, 0);
      scene.add(this.marker);
    } else {
      this.x = owner.x + this.dir * 0.9; this.y = owner.y + (cfg.y ?? 1.7);
      this.vx = (cfg.speed ?? 0.2) * this.dir; this.vy = cfg.vy ?? 0;
    }
    this.mesh = MESH[cfg.mesh]();
    this.mesh.position.set(this.x, this.y, 0);
    scene.add(this.mesh);
  }

  update(fx) {
    this.age++;
    const c = this.cfg;
    if (c.drop) {
      if (this.wait > 0) { this.wait--; this.marker.material.opacity = 0.4 + 0.5 * Math.abs(Math.sin(this.age * 0.4)); }
      else { this.vy -= 0.035; this.y = Math.max(1.45, this.y + this.vy); }
      if (this.y <= 1.45 && !this.landed) { this.landed = true; this.landT = this.age; }
      if (this.landed && this.age - this.landT > 20) this.kill();
    } else {
      this.x += this.vx;
      if (c.grav) { this.vy += c.grav; this.y += this.vy; }
      if (c.grav && this.y <= 0.35) { this.y = 0.35; this.expired = true; }
      const t = c.trail ?? [2, 1.6, 0.6];
      fx.sparks.spawn(this.x, this.y + (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, -this.vx * 15, Math.random() - 0.5, 0, 0.25, 0.2, t[0], t[1], t[2], 0.8, 0, 2, 1);
    }
    SPIN[c.mesh](this);
    this.mesh.position.set(this.x, this.y, 0);
    if (Math.abs(this.x) > 16 || this.age > (c.life ?? 300)) this.kill();
  }

  // drops only hurt while falling onto the floor zone
  box() {
    if (this.cfg.drop && (this.wait > 0 || this.y > 3.2 || this.landed && this.age - this.landT > 2)) return null;
    return { x0: this.x - this.w, x1: this.x + this.w, y0: this.y - this.h, y1: this.y + this.h };
  }

  kill() {
    if (!this.alive) return;
    this.alive = false;
    for (const o of [this.mesh, this.marker]) {
      if (!o) continue;
      this.scene.remove(o);
      o.traverse((m) => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } });
    }
  }
}

// A cage left standing around a trapped fighter.
export function makeTrap(scene, x) {
  const m = MESH.cage(); m.position.set(x, 1.45, 0); scene.add(m);
  return m;
}
