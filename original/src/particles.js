import * as THREE from 'three';

const VS = /* glsl */`
  attribute float size;
  attribute vec4 pcolor;
  uniform float uScale;
  varying vec4 vC;
  void main() {
    vC = pcolor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * uScale / max(0.1, -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;
const FS = /* glsl */`
  varying vec4 vC;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.05, r);
    gl_FragColor = vec4(vC.rgb, vC.a * a);
  }`;

// A ring-buffer point sprite system with per-particle color, size and alpha.
export class Particles {
  constructor(max, additive) {
    this.max = max; this.i = 0;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.size = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.rgb = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.s0 = new Float32Array(max);
    this.a0 = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.shrink = new Float32Array(max);
    const g = this.geo = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('pcolor', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 600 } },
      vertexShader: VS, fragmentShader: FS,
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 3 : 2;
    this.floorHit = null;
  }

  spawn(x, y, z, vx, vy, vz, life, size, r, g, b, a = 1, grav = 0, drag = 0, shrink = 1) {
    const i = this.i; this.i = (i + 1) % this.max;
    const i3 = i * 3;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    this.rgb[i3] = r; this.rgb[i3 + 1] = g; this.rgb[i3 + 2] = b;
    this.life[i] = this.maxLife[i] = life;
    this.s0[i] = size; this.a0[i] = a; this.grav[i] = grav; this.drag[i] = drag; this.shrink[i] = shrink;
  }

  update(dt) {
    const { pos, vel, col, size, life } = this;
    for (let i = 0; i < this.max; i++) {
      if (life[i] <= 0) {
        if (size[i] !== 0) { size[i] = 0; col[i * 4 + 3] = 0; }
        continue;
      }
      life[i] -= dt;
      const i3 = i * 3, i4 = i * 4;
      vel[i3 + 1] += this.grav[i] * dt;
      const d = Math.max(0, 1 - this.drag[i] * dt);
      vel[i3] *= d; vel[i3 + 1] *= d; vel[i3 + 2] *= d;
      pos[i3] += vel[i3] * dt; pos[i3 + 1] += vel[i3 + 1] * dt; pos[i3 + 2] += vel[i3 + 2] * dt;
      if (pos[i3 + 1] < 0.02 && vel[i3 + 1] < 0 && this.floorHit) {
        this.floorHit(pos[i3], pos[i3 + 2]);
        life[i] = 0;
      }
      const k = Math.max(0, life[i] / this.maxLife[i]);
      size[i] = this.s0[i] * (1 - this.shrink[i] * (1 - k));
      col[i4] = this.rgb[i3]; col[i4 + 1] = this.rgb[i3 + 1]; col[i4 + 2] = this.rgb[i3 + 2];
      col[i4 + 3] = this.a0[i] * Math.min(1, k * 2.5);
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.pcolor.needsUpdate = true;
    this.geo.attributes.size.needsUpdate = true;
  }

  clear() { this.life.fill(0); }
}

export class Decals {
  constructor(scene, n = 80) {
    this.list = []; this.i = 0;
    const geo = new THREE.CircleGeometry(1, 18);
    for (let k = 0; k < n; k++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x5a0508, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0,
        depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
      });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2; m.visible = false; m.receiveShadow = true;
      scene.add(m); this.list.push(m);
    }
  }
  add(x, z, r) {
    const m = this.list[this.i]; this.i = (this.i + 1) % this.list.length;
    m.position.set(x, 0.012 + Math.random() * 0.003, z);
    m.scale.set(r, r * (0.6 + Math.random() * 0.8), 1);
    m.rotation.z = Math.random() * Math.PI * 2;
    m.material.opacity = 0.85; m.visible = true;
  }
  clear() { for (const m of this.list) m.visible = false; }
}
