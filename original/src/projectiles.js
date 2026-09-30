import * as THREE from 'three';
import { makeGavel } from './model.js';

const TEX = {};
function canvasTex(key, w, h, draw) {
  if (TEX[key]) return TEX[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (TEX[key] = t);
}

const ballotTex = () => canvasTex('ballot', 256, 320, (g, w, h) => {
  g.fillStyle = '#f8f5ea'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#1a3a8a'; g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h - 20);
  g.fillStyle = '#1a3a8a'; g.font = '900 34px Rubik, sans-serif'; g.textAlign = 'center';
  g.direction = 'rtl'; g.fillText('פתק הצבעה', w / 2, 62);
  g.strokeStyle = '#222'; g.lineWidth = 6; g.strokeRect(68, 96, 120, 120);
  g.strokeStyle = '#d01818'; g.lineWidth = 16; g.lineCap = 'round';
  g.beginPath(); g.moveTo(84, 112); g.lineTo(172, 200); g.moveTo(172, 112); g.lineTo(84, 200); g.stroke();
  g.fillStyle = '#d01818'; g.font = '900 64px Rubik, sans-serif'; g.fillText('נגד', w / 2, 290);
});

const newsTex = () => canvasTex('news', 320, 240, (g, w, h) => {
  g.fillStyle = '#efe8d6'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#111'; g.font = '900 40px Cinzel, serif'; g.textAlign = 'center';
  g.fillText('BREAKING', w / 2, 46);
  g.fillStyle = '#c01010'; g.fillRect(14, 58, w - 28, 34);
  g.fillStyle = '#fff'; g.font = '900 26px Rubik, sans-serif'; g.direction = 'rtl'; g.fillText('מבזק: אין תגובה', w / 2, 84);
  g.fillStyle = '#777';
  for (let y = 108; y < h - 12; y += 12) { g.fillRect(16, y, 136, 6); g.fillRect(168, y, 136, 6); }
});

const coinTex = () => canvasTex('coin', 128, 128, (g, w, h) => {
  const gr = g.createRadialGradient(50, 44, 4, 64, 64, 64);
  gr.addColorStop(0, '#fff4b0'); gr.addColorStop(0.6, '#e8b030'); gr.addColorStop(1, '#8a5a08');
  g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 64, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#7a4a06'; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#6a3a04'; g.font = '900 70px Rubik, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('₪', 64, 68);
});

function glow(color) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
}

export const PROJ = {
  gavel: {
    speed: 0.2, dmg: 9, y: 1.75, w: 0.35, h: 0.35, trail: [2.2, 1.4, 0.4], sfx: 'throw',
    make() { const g = new THREE.Group(); const gv = makeGavel(); gv.scale.setScalar(1.8); gv.position.y = -0.5; g.add(gv); return g; },
    spin(p) { p.mesh.rotation.z -= 0.35 * p.dir; },
  },
  coins: {
    speed: 0.24, dmg: 3.6, y: 1.75, w: 0.22, h: 0.22, trail: [2.4, 1.8, 0.4], sfx: 'coin', count: 3,
    make() {
      const g = new THREE.Group();
      const side = new THREE.MeshStandardMaterial({ color: 0xd9a843, metalness: 1, roughness: 0.25, emissive: 0x6a3a00 });
      const face = new THREE.MeshStandardMaterial({ map: coinTex(), metalness: 0.6, roughness: 0.3, emissive: 0x3a2000 });
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 28), [side, face, face]);
      c.rotation.x = Math.PI / 2; g.add(c); return g;
    },
    spin(p) { p.mesh.rotation.y += 0.3; },
  },
  ballot: {
    speed: 0.18, dmg: 10, y: 1.8, w: 0.3, h: 0.38, trail: [1.4, 1.6, 2.6], sfx: 'throw',
    make() {
      const g = new THREE.Group();
      const m = new THREE.MeshStandardMaterial({ map: ballotTex(), roughness: 0.8, side: THREE.DoubleSide, emissive: 0x303030 });
      g.add(new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.65), m)); return g;
    },
    spin(p) { p.mesh.rotation.y += 0.12; p.mesh.rotation.z = Math.sin(p.age * 0.2) * 0.3; },
  },
  wave: {
    speed: 0.12, dmg: 11, y: 1.6, w: 0.35, h: 0.8, trail: [0.6, 1.8, 3], sfx: 'wave',
    make() {
      const g = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const r = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 8, 32), glow(0x60d8ff));
        r.rotation.y = Math.PI / 2; g.add(r);
      }
      return g;
    },
    spin(p) {
      p.mesh.children.forEach((r, i) => {
        const k = ((p.age * 0.04 + i / 3) % 1);
        r.scale.setScalar(0.4 + k * 1.2); r.position.x = -p.dir * k * 0.5; r.material.opacity = 0.9 * (1 - k);
      });
    },
  },
  paper: {
    speed: 0.2, dmg: 9, y: 1.8, w: 0.32, h: 0.28, trail: [2.4, 2.2, 2], sfx: 'throw',
    make() {
      const g = new THREE.Group();
      const m = new THREE.MeshStandardMaterial({ map: newsTex(), roughness: 0.9, side: THREE.DoubleSide, emissive: 0x303030 });
      g.add(new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.46), m)); return g;
    },
    spin(p) { p.mesh.rotation.z += 0.28 * p.dir; },
  },
  plane: {
    speed: 0.27, dmg: 7, y: 1.95, w: 0.35, h: 0.2, trail: [2, 2, 2.2], sfx: 'throw',
    make() {
      const geo = new THREE.BufferGeometry();
      const v = [0.4, 0, 0, -0.3, 0.02, 0.24, -0.3, 0.02, 0, 0.4, 0, 0, -0.3, 0.02, 0, -0.3, 0.02, -0.24, 0.4, 0, 0, -0.3, -0.13, 0, -0.3, 0.02, 0];
      geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); geo.computeVertexNormals();
      const g = new THREE.Group();
      g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.8, emissive: 0x404040 })));
      g.scale.setScalar(1.4); return g;
    },
    spin(p) { p.mesh.rotation.x = Math.sin(p.age * 0.3) * 0.5; p.y += Math.sin(p.age * 0.15) * 0.012; },
  },
  cash: {
    speed: 0.16, dmg: 12, y: 1.45, w: 0.33, h: 0.26, trail: [0.3, 1.2, 0.35], trailNormal: true, sfx: 'throw',
    make() {
      const g = new THREE.Group();
      const lea = new THREE.MeshStandardMaterial({ color: 0x5a2a10, roughness: 0.45 });
      const gold = new THREE.MeshStandardMaterial({ color: 0xe0b050, metalness: 1, roughness: 0.25 });
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.44, 0.16), lea));
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 6, 16, Math.PI), lea); h.position.y = 0.22; g.add(h);
      for (const x of [-0.18, 0.18]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.02), gold); l.position.set(x, 0.14, 0.085); g.add(l); }
      return g;
    },
    spin(p) { p.mesh.rotation.z -= 0.2 * p.dir; },
  },
};

export class Projectile {
  constructor(owner, type, scene, yOff = 0, xOff = 0) {
    const d = this.d = PROJ[type];
    this.type = type; this.owner = owner; this.scene = scene;
    this.dir = owner.facing;
    this.x = owner.x + this.dir * (0.9 + xOff);
    this.y = owner.y + d.y + yOff;
    this.vx = d.speed * this.dir;
    this.dmg = d.dmg * 1.2 * owner.stats.power;
    this.age = 0; this.alive = true;
    this.mesh = d.make();
    if (type === 'plane') this.mesh.scale.x *= this.dir;
    this.mesh.position.set(this.x, this.y, 0);
    scene.add(this.mesh);
  }
  update(fx) {
    this.age++;
    this.x += this.vx;
    this.d.spin(this);
    this.mesh.position.set(this.x, this.y, 0);
    const t = this.d.trail;
    if (this.d.trailNormal) {
      if (this.age % 2 === 0) fx.debris.spawn(this.x, this.y, 0, -this.vx * 20 + (Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2, 0.9, 0.14, t[0], t[1], t[2], 1, -3, 1, 0.3);
    } else {
      fx.sparks.spawn(this.x, this.y + (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, -this.vx * 15, (Math.random() - 0.5), 0, 0.25, 0.22, t[0], t[1], t[2], 0.8, 0, 2, 1);
    }
    if (Math.abs(this.x) > 16 || this.age > 300) this.kill();
  }
  box() { const d = this.d; return { x0: this.x - d.w, x1: this.x + d.w, y0: this.y - d.h, y1: this.y + d.h }; }
  kill() {
    if (!this.alive) return;
    this.alive = false;
    this.scene.remove(this.mesh);
    this.mesh.traverse((o) => {
      if (!o.isMesh) return;
      o.geometry.dispose();
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
  }
}
