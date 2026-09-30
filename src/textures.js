import * as THREE from 'three';

// Procedural kippah textures. SphereGeometry UVs run u around the head and v
// from the crown down, so horizontal bands read as the rings of a kippah.

const cache = new Map();
const hex = (c) => '#' + new THREE.Color(c).getHexString();
const shade = (c, k) => { const col = new THREE.Color(c); col.multiplyScalar(k); return hex(col); };
const rand = (a, b) => a + Math.random() * (b - a);

function tex(key, w, h, draw, repeat = [1, 1]) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  const bump = new THREE.CanvasTexture(c);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping; bump.repeat.copy(t.repeat);
  const out = { map: t, bump };
  cache.set(key, out);
  return out;
}

// A crocheted knitted kippah ("kippah sruga"): rings of stitches with a pattern band.
export function knitKippahTexture(base, pattern, edge) {
  return tex(`kippah:${base}:${pattern}:${edge}`, 512, 256, (g, w, h) => {
    g.fillStyle = hex(base); g.fillRect(0, 0, w, h);
    const rows = 16, rh = h / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * rh;
      // stitch texture: little slanted loops
      for (let x = 0; x < w; x += 8) {
        g.strokeStyle = shade(base, rand(0.75, 0.95)); g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(x, y + rh * 0.2); g.lineTo(x + 5, y + rh * 0.8); g.stroke();
      }
      // pattern band: zig-zag diamonds on rows 9-12, solid ring near the edge
      if (r >= 9 && r <= 11) {
        g.fillStyle = hex(pattern);
        for (let x = 0; x < w; x += 32) {
          g.beginPath(); g.moveTo(x, y + rh); g.lineTo(x + 16, y); g.lineTo(x + 32, y + rh); g.closePath(); g.fill();
        }
      }
      if (r >= 14) { g.fillStyle = hex(edge); g.fillRect(0, y, w, rh); }
    }
  });
}

// A black velvet kippah: soft, with a faint pile texture.
export function velvetTexture(color) {
  return tex(`velvet:${color}`, 256, 256, (g, w, h) => {
    g.fillStyle = hex(color); g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6000; i++) {
      g.fillStyle = shade(color, rand(0.6, 2.2)); g.globalAlpha = rand(0.05, 0.25);
      g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }
    g.globalAlpha = 1;
  });
}
