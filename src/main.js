import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ROSTER, LOCKED_SLOTS } from './roster.js';
import { renderPortraits, makeGavel } from './model.js';
import { buildStage } from './stage.js';
import { Particles, Decals } from './particles.js';
import { Fighter } from './fighter.js';
import { Projectile, makeTrap } from './projectiles.js';
import { Input, NONE } from './input.js';
import { AI } from './ai.js';
import { sound } from './audio.js';
import * as UI from './ui.js';

const STEP = 1 / 60, WALL = 9.5, MAX_SEP = 10.5, COLS = 6, N = ROSTER.length;
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const rand = (a, b) => a + Math.random() * (b - a);
const rint = (n) => Math.floor(Math.random() * n);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 120);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.5, 0.82));
composer.addPass(new OutputPass());

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight, false);
  composer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

// ---------------------------------------------------------------- world
const fx = {
  sparks: new Particles(1600, true),
  fire: new Particles(2400, true),
  blood: new Particles(1000, false),
  debris: new Particles(700, false),
};
for (const p of Object.values(fx)) scene.add(p.points);
const decals = new Decals(scene);
fx.blood.floorHit = (x, z) => { if (Math.random() < 0.3) decals.add(x, z, rand(0.08, 0.22)); };
const stage = buildStage(scene, renderer);
const portraits = renderPortraits(ROSTER);

const input = new Input();
addEventListener('keydown', () => sound.init());
addEventListener('pointerdown', () => sound.init());
input.onKey = (code) => {
  if (code === 'KeyM') document.getElementById('mute').textContent = sound.toggleMute() ? 'MUTED (M)' : '';
};

const G = {
  state: 'boot', t: 0, mode: '1p', sel: [0, 1], locked: [false, false], showP2: false,
  fighters: [], ais: [null, null], previews: [null, null], attract: [], projectiles: [], traps: [],
  round: 1, wins: [0, 0], timer: 99, timerAcc: 0, sub: '', subT: 0,
  hitstop: 0, timeScale: 1, shake: 0, paused: false, menuIdx: 0,
  winner: null, loser: null, fatal: null, flawless: false, lightT: 4, cpuSpin: 0, selDone: 0,
};
window.__G = G;

const game = {
  get sub() { return G.sub; },
  get projectiles() { return G.projectiles; },
  sfx: (n, v) => sound.play(n, v),
  hasProjectile: (f) => G.projectiles.some((p) => p.owner === f && p.alive),
  special(f) { doSpecial(f); },
  onBodyLand(f) {
    sound.play('body'); G.shake = Math.max(G.shake, 0.18);
    for (let i = 0; i < 16; i++) fx.debris.spawn(f.x + rand(-0.8, 0.8), 0.08, rand(-0.4, 0.4), rand(-2, 2), rand(0.3, 1.2), rand(-0.6, 0.6), rand(0.5, 0.9), rand(0.2, 0.35), 0.3, 0.22, 0.18, 0.45, 0, 2, -1.2);
  },
};

// ---------------------------------------------------------------- specials
function puff(x, y, n = 40, col = [0.55, 0.55, 0.6]) {
  for (let i = 0; i < n; i++) fx.debris.spawn(x + rand(-0.5, 0.5), y + rand(0, 2.2), rand(-0.4, 0.4), rand(-2, 2), rand(-0.5, 1.5), rand(-1, 1), rand(0.4, 0.8), rand(0.3, 0.6), col[0], col[1], col[2], 0.7, 0, 3, -1.5);
}

function doSpecial(f) {
  const sp = f.def.special, opp = G.fighters.find((o) => o !== f);
  if (!opp) return;
  switch (sp.kind) {
    case 'proj': {
      const p = new Projectile(f, sp, scene);
      if (sp.grav) {
        // lob: pick the speed that lands the bomb on the opponent
        const floor = 0.35, T = (sp.vy + Math.sqrt(sp.vy * sp.vy + 2 * -sp.grav * (p.y - floor))) / -sp.grav;
        p.vx = f.facing * clamp(Math.abs(opp.x - p.x) / T, 0.05, 0.2);
      }
      G.projectiles.push(p);
      sound.play(sp.sfx ?? 'throw');
      break;
    }
    case 'drop':
      G.projectiles.push(new Projectile(f, { ...sp, drop: true }, scene, { x: opp.x }));
      sound.play('whoosh', 1.3);
      break;
    case 'teleport': {
      puff(f.x, 0, 50); sound.play('poof');
      const side = Math.sign(opp.x - f.x) || 1;
      let nx = opp.x + side * 1.0;
      if (Math.abs(nx) > WALL) nx = opp.x - side * 1.0;
      f.x = nx; f.y = 0; f.hidden = 8;
      f.facing = Math.sign(opp.x - f.x) || -side;
      puff(f.x, 0, 50);
      f.startMove('telestrike', game);
      break;
    }
    case 'grab': {
      const inReach = Math.abs(opp.x - f.x) <= sp.reach && opp.y < 0.6 && opp.hurtBox() && opp.state !== 'launched';
      if (!inReach) { sound.play('whoosh'); break; }
      const pt = v3((f.x + opp.x) / 2, 1.5, 0.3);
      const res = applyHit(f, opp, { dmg: sp.dmg * f.stats.power * f.buffMul, launch: sp.launch, height: 'grab', heavy: true, dir: f.facing, grab: true }, pt);
      if (res !== 'hit') break;
      if (sp.drain) {
        f.hp = Math.min(f.maxHp, f.hp + sp.dmg * sp.drain);
        sound.play('cash');
        for (let i = 0; i < 30; i++) fx.sparks.spawn(opp.x, 1.6, 0.2, rand(-3, 3), rand(1, 5), rand(-1, 1), 0.9, 0.12, 2.4, 1.8, 0.3, 1, -10, 0.5, 0.3);
        for (let i = 0; i < 18; i++) fx.debris.spawn(opp.x, 1.8, 0.2, rand(-2.5, 2.5), rand(1, 4), rand(-1, 1), 1.2, 0.16, 0.25, 0.65, 0.3, 1, -5, 1, 0.2);
      }
      if (sp.throw) { G.shake = Math.max(G.shake, 0.35); opp.vy += 0.05; }
      break;
    }
    case 'buff':
      f.buffMul = sp.mul; f.buffT = sp.dur; f.regen += sp.heal;
      sound.play('powerup'); UI.flash(0.25, 300, '#ffd76a');
      for (let i = 0; i < 60; i++) fx.sparks.spawn(f.x + rand(-0.6, 0.6), rand(0, 2.6), rand(-0.4, 0.4), 0, rand(1, 3), 0, rand(0.5, 1), 0.12, 2.6, 2, 0.6, 1, 0, 0.5, 1);
      break;
  }
}

// A projectile that hit (or a bomb that landed) applies its effects.
function projectileHit(p, t) {
  const c = p.cfg, pt = v3(p.x, p.y, 0.3);
  if (c.explode) return explode(p);
  const res = applyHit(p.owner, t, { dmg: p.dmg, stun: 18, bstun: 12, push: 0.16, height: 'mid', heavy: true, dir: p.dir, proj: true, freeze: c.freeze, launch: c.launch }, pt);
  if (res === 'hit' && c.meter) { t.specialCD = Math.max(t.specialCD, c.meter); sound.play('snip'); }
  if (res === 'hit' && c.drop && c.freeze && t.state === 'stunned') {
    G.traps.push({ mesh: makeTrap(scene, t.x), target: t });
    sound.play('clang');
  }
}

function explode(p) {
  const c = p.cfg, t = G.fighters.find((o) => o !== p.owner);
  p.kill();
  const at = v3(p.x, Math.max(0.4, p.y), 0.2);
  sound.play('explode'); G.shake = Math.max(G.shake, 0.45); UI.flash(0.35, 250, '#ffb060');
  sparks(at, 0, 70, [3, 1.6, 0.4], 7);
  for (let i = 0; i < 50; i++) fx.fire.spawn(at.x + rand(-0.6, 0.6), at.y + rand(0, 0.5), rand(-0.5, 0.5), rand(-2, 2), rand(1, 4), rand(-1, 1), rand(0.4, 0.8), rand(0.4, 0.8), 2.6, 1, 0.2, 1, 1, 1.5, 1);
  puff(at.x, 0, 30, [0.2, 0.18, 0.16]);
  if (t && Math.abs(t.x - at.x) < c.explode && t.y < 2.4) {
    applyHit(p.owner, t, { dmg: p.dmg, height: 'mid', heavy: true, dir: Math.sign(t.x - at.x) || p.dir, proj: true, launch: c.launch, bstun: 14, push: 0.2 }, v3(t.x, 1.2, 0.3));
  }
}

function updateTraps() {
  G.traps = G.traps.filter((tr) => {
    const alive = tr.target.state === 'stunned' && !tr.target.dead;
    if (!alive) { scene.remove(tr.mesh); tr.mesh.traverse((m) => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } }); return false; }
    tr.mesh.position.x = tr.target.x;
    return true;
  });
}

function specialAuras() {
  for (const f of G.fighters) {
    if (f.buffT > 0 && Math.random() < 0.6) fx.sparks.spawn(f.x + rand(-0.5, 0.5), rand(0.2, 2.4), rand(-0.3, 0.3), 0, rand(0.8, 2), 0, 0.6, 0.1, 2.6, 2, 0.5, 1, 0, 0.5, 1);
    if (f.countering() && Math.random() < 0.8) fx.sparks.spawn(f.x + f.facing * 0.5 + rand(-0.3, 0.3), rand(1, 2.4), 0.3, 0, rand(0.2, 0.8), 0, 0.3, 0.14, 0.6, 1.8, 3, 1, 0, 1, 1);
    if (f.state === 'attack' && f.move?.dash && f.def.special.armor && Math.random() < 0.8) fx.sparks.spawn(f.x - f.facing * 0.4, rand(0.3, 2.2), 0.2, -f.facing * 3, 0, 0, 0.3, 0.16, 2.6, 2, 0.8, 1, 0, 2, 1);
  }
}

// ---------------------------------------------------------------- fx helpers
function sparks(p, dir, n, col = [3, 2.2, 0.8], speed = 6) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, e = rand(-1, 1), c = Math.sqrt(1 - e * e), s = rand(0.3, 1) * speed;
    fx.sparks.spawn(p.x, p.y, p.z, Math.cos(a) * s * c + dir * speed * 0.4, e * s + 1.5, Math.sin(a) * s * c,
      rand(0.12, 0.35), rand(0.05, 0.13), col[0], col[1], col[2], 1, -6, 3, 1);
  }
  fx.sparks.spawn(p.x, p.y, p.z, 0, 0, 0, 0.12, 1.1, col[0] * 0.6, col[1] * 0.6, col[2] * 0.6, 1, 0, 0, -0.5);
}
function blood(p, dir, n, power = 1) {
  for (let i = 0; i < n; i++) {
    fx.blood.spawn(p.x, p.y, p.z + rand(-0.15, 0.15), dir * rand(1, 4.5) * power + rand(-0.8, 0.8), rand(0.5, 4) * power, rand(-1.2, 1.2),
      rand(0.6, 1.3), rand(0.05, 0.12), 0.32, 0.01, 0.02, 1, -14, 0.4, 0.2);
  }
}

// ---------------------------------------------------------------- lifecycle helpers
function setState(s) { G.state = s; G.t = 0; }
function disposeAll(list) { for (const f of list) f?.dispose(); }
function clearProjectiles() { for (const p of G.projectiles) p.kill(); G.projectiles = []; }
function clearTraps() { for (const t of G.traps) scene.remove(t.mesh); G.traps = []; }
function clearFighters() {
  disposeAll(G.fighters); G.fighters = []; clearProjectiles(); clearTraps(); decals.clear();
  if (G.fatal) { scene.remove(G.fatal.pivot); G.fatal = null; }
}
function clearPreviews() { disposeAll(G.previews); G.previews = [null, null]; }
function clearAttract() { disposeAll(G.attract); G.attract = []; }
function allFighters() { return [...G.attract, ...G.previews.filter(Boolean), ...G.fighters]; }

// ---------------------------------------------------------------- intro
function startIntro() {
  input.takeAny();
  setState('intro'); UI.show(null);
  stage.setMood('intro');
  cam.pos.set(2.4, 2.0, 6.6); cam.look.set(0.05, 1.15, 3.2);
}
function introStep() {
  const t = G.t, P = stage.introPivot;
  if (t < 50) P.rotation.z = -0.95 * easeOut(t / 50);
  else if (t < 58) { const k = (t - 50) / 8; P.rotation.z = -0.95 * (1 - k * k); }
  else if (t < 74) P.rotation.z = -0.12 * Math.sin(((t - 58) / 16) * Math.PI);
  else P.rotation.z = 0;
  if (t === 58) {
    sound.play('gavel'); sound.play('boom', 0.6);
    G.shake = 0.35; UI.flash(0.75, 450);
    sparks(v3(0, 1.13, 3.2), 0, 70, [3, 2, 0.7], 5);
  }
  if (t === 74) UI.show('introLogo');
  if (t === 84) sound.say('Knesset Kombat!');
  if (t > 240 || (t > 12 && input.takeAny())) enterTitle();
}

// ---------------------------------------------------------------- title
function enterTitle() {
  setState('title'); UI.show('title'); UI.hud(false); UI.banner(''); UI.hint('');
  stage.setMood('title'); sound.startMusic('title');
  G.paused = false; G.timeScale = 1;
  G.menuIdx = 0; UI.setMenu('#titleMenu', 0);
  clearFighters(); clearPreviews();
  if (!G.attract.length) {
    const a = rint(N); let b = rint(N); if (b === a) b = (a + 1) % N;
    G.attract = [new Fighter(ROSTER[a], 0, scene), new Fighter(ROSTER[b], 1, scene)];
    G.attract[0].reset(-2.3); G.attract[1].reset(2.3);
  }
}
function titleStep() {
  const m = input.menu;
  if (m.upP || m.downP) { G.menuIdx = (G.menuIdx + (m.downP ? 1 : 3)) % 4; UI.setMenu('#titleMenu', G.menuIdx); sound.play('blip'); }
  if (m.confirmP) return titleChoose(G.menuIdx);
  const ph = G.t % 240;
  if (ph === 120) G.attract[rint(2)].setState('intro');
  if (ph === 200) G.attract.forEach((f) => f.setState('idle'));
  G.lightT -= STEP;
  if (G.lightT <= 0) {
    G.lightT = rand(6, 11);
    stage.lightning(1); UI.flash(0.3, 700, '#cfe0ff');
    setTimeout(() => sound.play('thunder'), 160);
  }
}
function titleChoose(i) {
  sound.play('confirm');
  if (i === 3) { setState('controls'); UI.show('controls'); input.takeAny(); return; }
  G.mode = ['1p', '2p', 'cpu'][i];
  input.solo = G.mode !== '2p';
  enterSelect();
}
function backToTitle() { setState('title'); UI.show('title'); UI.setMenu('#titleMenu', G.menuIdx); }

// ---------------------------------------------------------------- select
const selLabel = (p) => (p === 0 ? (G.mode === 'cpu' ? 'CPU 1' : 'PLAYER 1') : G.mode === '2p' ? 'PLAYER 2' : G.mode === 'cpu' ? 'CPU 2' : 'CPU');

function enterSelect() {
  setState('select'); UI.show('select'); UI.hud(false); UI.banner(''); UI.hint('');
  stage.setMood('select'); sound.startMusic('title');
  clearFighters(); clearAttract(); clearPreviews();
  G.locked = [false, false]; G.selDone = 0; G.cpuSpin = 0;
  G.sel = G.mode === 'cpu' ? [rint(N), rint(N)] : [0, 1];
  G.showP2 = G.mode !== '1p';
  document.getElementById('selHelp').innerHTML = G.mode === '2p'
    ? 'P1: <b>WASD</b> + <b>J</b> to pick · P2: <b>ARROWS</b> + <b>,</b> to pick · back: <b>K</b> / <b>.</b>'
    : G.mode === '1p' ? '<b>ARROWS / WASD</b> move · <b>ENTER / J</b> pick · <b>ESC</b> back' : 'The CPUs are choosing…';
  refreshSelect();
}

function refreshSelect() {
  UI.updateGrid(G.sel, G.locked, G.showP2, G.mode === '2p' ? 'P2' : 'CPU');
  for (let p = 0; p < 2; p++) {
    const want = p === 0 || G.showP2 ? ROSTER[G.sel[p]] : null;
    UI.selName(p, want, G.locked[p], selLabel(p));
    const cur = G.previews[p];
    if (cur && cur.def !== want) { cur.dispose(); G.previews[p] = null; }
    if (want && !G.previews[p]) {
      const f = new Fighter(want, p, scene);
      f.reset(p ? 3.4 : -3.4);
      f.yawOverride = p ? -0.55 : 0.55; f.visYaw = f.yawOverride;
      if (G.locked[p]) f.setState('intro');
      G.previews[p] = f;
    }
  }
}

function moveCursor(i, dx, dy) {
  const rows = Math.ceil((N + LOCKED_SLOTS) / COLS);
  let r = Math.floor(i / COLS), c = i % COLS;
  if (dx) for (let k = 0; k < COLS; k++) { c = (c + dx + COLS) % COLS; if (r * COLS + c < N) break; }
  if (dy) r = (r + dy + rows) % rows;
  return Math.min(N - 1, r * COLS + c);
}

function lockIn(p) {
  G.locked[p] = true;
  sound.play('confirm'); sound.say(ROSTER[G.sel[p]].say);
  refreshSelect();
  G.previews[p]?.setState('intro');
}

function cpuSpin(p) {
  G.cpuSpin++;
  if (G.cpuSpin % 5 === 0) { G.sel[p] = rint(N); sound.play('blip'); refreshSelect(); }
  if (G.cpuSpin > 50) { G.cpuSpin = 0; lockIn(p); }
}

function selectStep() {
  const humans = G.mode === '2p' ? [0, 1] : G.mode === '1p' ? [0] : [];
  for (const p of humans) {
    const m = G.mode === '2p' ? input.players[p].menu : input.menu;
    if (G.locked[p]) {
      if (m.backP && !(G.mode === '1p' && G.locked[1])) {
        G.locked[p] = false; sound.play('blip');
        if (G.mode === '1p') { G.showP2 = false; G.cpuSpin = 0; }
        refreshSelect();
      }
      continue;
    }
    let n = G.sel[p];
    if (m.leftP) n = moveCursor(n, -1, 0);
    if (m.rightP) n = moveCursor(n, 1, 0);
    if (m.upP) n = moveCursor(n, 0, -1);
    if (m.downP) n = moveCursor(n, 0, 1);
    if (n !== G.sel[p]) { G.sel[p] = n; sound.play('blip'); refreshSelect(); }
    if (m.confirmP) lockIn(p);
    else if (m.backP && !G.locked[0] && !G.locked[1]) { enterTitle(); return; }
  }
  if (G.mode === '1p' && G.locked[0] && !G.locked[1]) {
    if (!G.showP2) { G.showP2 = true; G.sel[1] = rint(N); refreshSelect(); }
    cpuSpin(1);
  }
  if (G.mode === 'cpu') { if (!G.locked[0]) cpuSpin(0); else if (!G.locked[1]) cpuSpin(1); }
  if (G.locked[0] && G.locked[1] && ++G.selDone === 75) enterVersus();
}

function activeSelector() {
  if (G.mode === 'cpu') return -1;
  if (!G.locked[0]) return 0;
  if (G.mode === '2p' && !G.locked[1]) return 1;
  return -1;
}
function hoverCard(i) {
  const p = activeSelector();
  if (G.state !== 'select' || p < 0 || G.sel[p] === i) return;
  G.sel[p] = i; sound.play('blip'); refreshSelect();
}
function pickCard(i) {
  const p = activeSelector();
  if (G.state !== 'select' || p < 0) return;
  G.sel[p] = i; lockIn(p);
}
UI.buildGrid(ROSTER, LOCKED_SLOTS, portraits, pickCard, hoverCard);

// ---------------------------------------------------------------- versus
function enterVersus() {
  setState('versus');
  UI.versus(ROSTER[G.sel[0]], ROSTER[G.sel[1]], portraits);
  UI.show('versus');
  sound.play('boom', 0.8);
}
function versusStep() {
  if (G.t === 24) sound.say(`${ROSTER[G.sel[0]].say} versus ${ROSTER[G.sel[1]].say}`);
  if (G.t > 190 || (G.t > 40 && input.menu.confirmP)) startMatch();
}

// ---------------------------------------------------------------- fight
function startMatch() {
  clearPreviews(); clearAttract(); clearFighters();
  G.fighters = [0, 1].map((i) => new Fighter(ROSTER[G.sel[i]], i, scene));
  G.ais = [G.mode === 'cpu' ? new AI(0.6) : null, G.mode === '2p' ? null : new AI(G.mode === 'cpu' ? 0.6 : 0.4)];
  G.wins = [0, 0]; G.round = 1; G.paused = false;
  setState('fight'); UI.show(null); UI.hud(true); UI.setupHud(G.fighters);
  stage.setMood('fight'); sound.startMusic('fight');
  startRound();
}

function startRound() {
  const [a, b] = G.fighters;
  a.reset(-2.6); b.reset(2.6);
  a.setState('intro'); b.setState('intro');
  G.ais.forEach((ai) => ai?.reset());
  clearProjectiles(); clearTraps(); decals.clear(); fx.blood.clear();
  if (G.fatal) { scene.remove(G.fatal.pivot); G.fatal = null; }
  G.timer = 99; G.timerAcc = 0; G.sub = 'roundIntro'; G.subT = 0;
  G.timeScale = 1; G.hitstop = 0; G.winner = G.loser = null;
  cam.pos.set(a.x + 7, 3.8, 7.5);
  if (G.round === 1) {
    UI.hint(G.mode === '1p'
      ? '<b>WASD</b> move · <b>J</b> punch · <b>K</b> kick · <b>L</b> block · <b>I</b> special · <b>S+J</b> uppercut · <b>S+K</b> sweep · <b>Esc</b> pause'
      : G.mode === '2p' ? 'P1 <b>WASD</b> + <b>J K L I</b> · P2 <b>ARROWS</b> + <b>, . / ;</b> · <b>Esc</b> pause' : '');
  }
}

function overlap(p, q) { return p.x0 < q.x1 && p.x1 > q.x0 && p.y0 < q.y1 && p.y1 > q.y0; }

function separate(a, b) {
  const solid = (f) => f.state !== 'down' && !(f.dead && f.y <= 0);
  if (a.y < 1.2 && b.y < 1.2 && solid(a) && solid(b)) {
    const d = b.x - a.x, min = 0.85;
    if (Math.abs(d) < min) {
      const s = Math.sign(d) || a.facing, o = (min - Math.abs(d)) / 2;
      a.x -= s * o; b.x += s * o;
    }
  }
  const mid = (a.x + b.x) / 2;
  for (const f of [a, b]) f.x = clamp(clamp(f.x, mid - MAX_SEP / 2, mid + MAX_SEP / 2), -WALL, WALL);
}

function resolveHits() {
  const [a, b] = G.fighters, ev = [];
  for (const [att, def] of [[a, b], [b, a]]) {
    const box = att.activeBox(); if (!box) continue;
    const hb = def.hurtBox(); if (!hb || !overlap(box, hb)) continue;
    att.hitDone = true;
    ev.push([att, def, box, hb, att.move]);
  }
  for (const [att, def, box, hb, m] of ev) {
    const pt = v3((Math.max(box.x0, hb.x0) + Math.min(box.x1, hb.x1)) / 2, (Math.max(box.y0, hb.y0) + Math.min(box.y1, hb.y1)) / 2, 0.3);
    applyHit(att, def, { dmg: m.dmg * att.stats.power * att.buffMul, stun: m.stun, bstun: m.bstun, push: m.push, launch: m.launch, height: m.height, heavy: m.heavy, dir: att.facing }, pt);
  }
}

function resolveProjectiles() {
  const ps = G.projectiles;
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const p = ps[i], q = ps[j];
      const pb = p.box(), qb = q.box();
      if (p.alive && q.alive && p.owner !== q.owner && pb && qb && overlap(pb, qb)) {
        p.kill(); q.kill();
        sparks(v3((p.x + q.x) / 2, p.y, 0.2), 0, 40, [2.5, 2.2, 1.5]); sound.play('block');
      }
    }
  }
  for (const p of ps) {
    if (!p.alive) continue;
    const t = p.owner === G.fighters[0] ? G.fighters[1] : G.fighters[0];
    const hb = t.hurtBox(), pb = p.box();
    if (hb && pb && overlap(pb, hb)) {
      if (!p.cfg.explode) p.kill();
      projectileHit(p, t);
    } else if (p.expired) explode(p);
    else if (p.landed && !p.clanged) { p.clanged = true; sound.play('clang'); G.shake = Math.max(G.shake, 0.2); }
  }
}

function applyHit(att, def, h, pt) {
  if (G.sub === 'finish' && def === G.loser) return finishHit(att, def, h, pt);
  if (G.sub === 'victory' || G.sub === 'fatality' || def.dead) return 'none';
  const res = def.receive(h);
  if (res === 'counter') {
    sparks(pt, -h.dir, 40, [0.8, 2, 3.2], 6); sound.play('counter'); G.hitstop = 10; UI.flash(0.3, 250, '#9ad8ff');
    def.facing = Math.sign(att.x - def.x) || def.facing;
    def.startMove('telestrike', game);
    return res;
  }
  if (res === 'armor') {
    sparks(pt, h.dir, 24, [3, 2.4, 0.8], 5); sound.play('block'); G.hitstop = 3;
    if (def.hp <= 0) onKO(att, def);
    return res;
  }
  if (res === 'block') {
    sparks(pt, -h.dir, 18, [1.4, 2, 3], 5); sound.play('block'); G.hitstop = 4;
  } else {
    const heavy = h.heavy || h.dmg >= 10;
    sparks(pt, h.dir, heavy ? 40 : 22); blood(pt, h.dir, heavy ? 34 : 14);
    sound.play(heavy ? 'heavy' : 'hit');
    G.hitstop = heavy ? 9 : 6; G.shake = Math.max(G.shake, heavy ? 0.28 : 0.14);
    if (def.hp <= 0) onKO(att, def);
  }
  if (!h.proj && Math.abs(def.x) > WALL - 0.4) att.vx = -att.facing * 0.12;
  return res;
}

function onKO(W, L) {
  if (G.sub !== 'fighting') return;
  L.hp = 0; W.hp = Math.max(1, W.hp);
  G.winner = W; G.loser = L;
  G.wins[W.index]++;
  UI.hint('');
  if (G.wins[W.index] >= 2) {
    L.finishPending = true;
    G.sub = 'finishWait'; G.subT = 0; G.timeScale = 0.4;
  } else {
    L.knockOut(W.facing);
    G.sub = 'ko'; G.subT = 0; G.timeScale = 0.3;
    UI.banner('K.O.', { cls: 'red', dur: 1800 }); sound.play('boom'); UI.flash(0.5, 300);
  }
}

function finishHit(W, L, h, pt) {
  L.knockOut(h.dir, 0.16, 0.3);
  sparks(pt, h.dir, 60); blood(pt, h.dir, 60, 1.3);
  sound.play('heavy'); sound.play('boom', 0.7);
  G.hitstop = 12; G.shake = 0.4; G.timeScale = 0.35;
  G.sub = 'finished'; G.subT = 0; UI.hint('');
  return 'hit';
}

function startFatality() {
  const W = G.winner, L = G.loser;
  G.sub = 'fatality'; G.subT = 0; UI.hint(''); UI.banner('');
  W.move = null; W.y = 0; W.vy = 0; W.vx = 0; W.setState('win');
  L.vx = 0;
  stage.setMood('dark'); stage.lightning(0.7); sound.play('thunder');
  const dirAway = Math.sign(L.x - W.x) || 1;
  const pivot = new THREE.Group();
  const gv = makeGavel();
  gv.scale.setScalar(6); gv.rotation.z = dirAway > 0 ? Math.PI / 2 : -Math.PI / 2;
  pivot.add(gv);
  pivot.position.set(L.x + dirAway * 3.48, 10, 0);
  scene.add(pivot);
  G.fatal = { pivot, dirAway };
}

function fatalityStep() {
  const F = G.fatal, t = G.subT, sgn = -F.dirAway, L = G.loser;
  if (t <= 45) { const k = t / 45; F.pivot.rotation.z = sgn * (1.5 - 0.2 * k); F.pivot.position.y = 1.06 + (1 - easeOut(k)) * 9; }
  else if (t <= 55) { const k = (t - 45) / 10; F.pivot.rotation.z = sgn * 1.3 * (1 - k * k); F.pivot.position.y = 1.06; }
  else if (t <= 72) F.pivot.rotation.z = sgn * 0.12 * Math.sin(((t - 55) / 17) * Math.PI);
  else F.pivot.rotation.z = 0;
  if (t === 55) {
    L.squash = true; L.dead = true;
    const p = v3(L.x, 0.4, 0.2);
    blood(p, 1, 80, 1.4); blood(p, -1, 80, 1.4);
    for (let i = 0; i < 16; i++) decals.add(L.x + rand(-1.5, 1.5), rand(-0.9, 0.9), rand(0.12, 0.42));
    sparks(p, 0, 90, [3, 2, 0.7], 8);
    sound.play('gavel'); sound.play('splat'); sound.play('boom');
    G.shake = 0.9; UI.flash(0.9, 500);
  }
  if (t === 85) {
    UI.banner('FATALITY', { cls: 'red', sub: 'PARLIAMENTARY FATALITY · <span dir="rtl">חוק ההסדרים</span>', dur: 2800 });
    sound.say('Fatality');
  }
  if (t === 260) {
    stage.setMood('fight');
    startVictory();
  }
}

function startVictory() {
  const W = G.winner, L = G.loser;
  if (G.fatal) { scene.remove(G.fatal.pivot); G.fatal = null; }
  G.sub = 'victory'; G.subT = 0; G.timeScale = 1;
  W.move = null; W.setState('win');
  W.yawOverride = W.x < L.x ? 0.35 : -0.35;
  G.flawless = W.hp >= W.maxHp - 0.01;
  UI.banner(`${W.def.name} WINS`, { sub: `<span dir="rtl">${W.def.he}</span>`, cls: 'small', dur: 2600 });
  sound.say(`${W.def.say} wins`);
}

function nextRoundOrEnd() {
  if (G.winner && G.wins[G.winner.index] >= 2) startVictory();
  else { G.round++; startRound(); }
}

function timeUp() {
  const [a, b] = G.fighters;
  const ra = a.hp / a.maxHp, rb = b.hp / b.maxHp;
  G.sub = 'timeup'; G.subT = 0; UI.hint('');
  sound.say('Time');
  if (Math.abs(ra - rb) < 0.001) { G.winner = null; UI.banner('TIME', { sub: 'DRAW · <span dir="rtl">תיקו</span>', dur: 2000 }); return; }
  const W = ra > rb ? a : b, L = W === a ? b : a;
  G.winner = W; G.loser = L; G.wins[W.index]++;
  L.move = null; L.setState('dizzy');
  UI.banner('TIME', { sub: `${W.def.name} TAKES THE ROUND`, dur: 2000 });
}

function showResults() {
  setState('results');
  const W = G.winner;
  UI.banner('');
  UI.results(`${W.def.name} WINS`, `<span dir="rtl">${W.def.he}</span>${G.flawless ? ' · FLAWLESS' : ''}`);
  UI.show('results');
  G.menuIdx = 0; UI.setMenu('#resMenu', 0);
}

function fightStep() {
  if (G.paused) return pauseStep();
  if (input.menu.pauseP && G.sub !== 'fatality') {
    G.paused = true; G.menuIdx = 0; UI.setMenu('#pauseMenu', 0); UI.show('pause'); sound.play('blip');
    return;
  }
  G.subT++;
  const [a, b] = G.fighters;
  const src = (i, me, opp) => (G.ais[i] ? G.ais[i].think(me, opp, game) : input.players[G.mode === '2p' ? i : 0]);
  let inA = NONE, inB = NONE;
  if (G.sub === 'fighting' || G.sub === 'finish') { inA = src(0, a, b); inB = src(1, b, a); }
  if (G.sub === 'finish') {
    if (G.loser === a) inA = NONE; else inB = NONE;
    if ((G.winner === a ? inA : inB).specialP) { startFatality(); return; }
  }

  if (G.sub === 'fatality') fatalityStep();
  else if (G.hitstop > 0) G.hitstop--;
  else {
    a.update(inA, b, game); b.update(inB, a, game);
    separate(a, b);
    for (const p of G.projectiles) p.update(fx);
    resolveProjectiles();
    resolveHits();
    updateTraps(); specialAuras();
    G.projectiles = G.projectiles.filter((p) => p.alive);
  }

  switch (G.sub) {
    case 'roundIntro':
      if (G.subT === 1) { UI.banner(`ROUND ${G.round}`, { sub: `<span dir="rtl">סיבוב ${G.round}</span>` }); sound.say(`Round ${WORDS[G.round] ?? G.round}`); }
      if (G.subT === 85) {
        UI.banner('FIGHT!', { cls: 'red', dur: 800 }); sound.say('Fight!'); sound.play('boom', 0.5);
        a.setState('idle'); b.setState('idle');
      }
      if (G.subT === 100) G.sub = 'fighting';
      break;
    case 'fighting':
      if (++G.timerAcc >= 60) { G.timerAcc = 0; if (--G.timer <= 0) timeUp(); }
      if (G.round === 1 && G.subT === 700) UI.hint('');
      break;
    case 'ko':
      if (G.subT === 45) G.timeScale = 1;
      if (G.subT > 180) nextRoundOrEnd();
      break;
    case 'finishWait':
      if (G.subT === 30) G.timeScale = 1;
      if (G.loser.state === 'dizzy') {
        G.sub = 'finish'; G.subT = 0; G.timeScale = 1;
        const pr = G.loser.def.pronoun || 'HIM';
        UI.banner(`FINISH ${pr}!`, { cls: 'red', dur: 2200 });
        sound.say(`Finish ${pr.toLowerCase()}!`);
        if (!G.ais[G.winner.index]) UI.hint('Press <b>SPECIAL</b> for a Parliamentary Fatality — or just hit them');
      }
      break;
    case 'finish':
      if (G.subT > 420) { G.loser.knockOut(-G.loser.facing, 0.03, 0.1); G.sub = 'finished'; G.subT = 0; UI.hint(''); }
      break;
    case 'finished':
      if (G.subT === 40) G.timeScale = 1;
      if (G.subT > 110) startVictory();
      break;
    case 'victory':
      if (G.subT === 160 && G.flawless) { UI.banner('FLAWLESS VICTORY', { cls: 'small', dur: 2000 }); sound.say('Flawless victory'); }
      if (G.subT > 330) showResults();
      break;
    case 'timeup':
      if (G.subT > 160) nextRoundOrEnd();
      break;
  }
}

function menuNav(sel, count, choose) {
  const m = input.menu;
  if (m.upP || m.downP) { G.menuIdx = (G.menuIdx + (m.downP ? 1 : count - 1)) % count; UI.setMenu(sel, G.menuIdx); sound.play('blip'); }
  if (m.confirmP) choose(G.menuIdx);
}
function pauseChoose(i) {
  sound.play('confirm');
  G.paused = false; UI.show(null);
  if (i === 1) startMatch();
  else if (i === 2) enterTitle();
}
function pauseStep() {
  if (input.menu.pauseP || input.menu.backP) { G.paused = false; UI.show(null); return; }
  menuNav('#pauseMenu', 3, pauseChoose);
}
function resultsChoose(i) {
  sound.play('confirm');
  if (i === 0) startMatch();
  else if (i === 1) enterSelect();
  else enterTitle();
}
function resultsStep() {
  const [a, b] = G.fighters;
  a.update(NONE, b, game); b.update(NONE, a, game);
  if (G.t > 20) menuNav('#resMenu', 3, resultsChoose);
}

function wireMenu(sel, state, choose) {
  document.querySelectorAll(`${sel} button`).forEach((btn, i) => {
    btn.addEventListener('mouseenter', () => { if (state()) { G.menuIdx = i; UI.setMenu(sel, i); } });
    btn.addEventListener('click', () => { if (state()) choose(i); });
  });
}
wireMenu('#titleMenu', () => G.state === 'title', titleChoose);
wireMenu('#pauseMenu', () => G.paused, pauseChoose);
wireMenu('#resMenu', () => G.state === 'results', resultsChoose);
document.getElementById('controls').addEventListener('click', () => { if (G.state === 'controls') backToTitle(); });

// ---------------------------------------------------------------- camera
const cam = { pos: v3(0, 2.6, 13), look: v3(0, 2.4, -4), tp: v3(0, 0, 0), tl: v3(0, 0, 0) };
function updateCamera(dt, time) {
  const { tp, tl } = cam;
  const aspectK = Math.max(1, 1.5 / camera.aspect);
  let rate = 3;
  switch (G.state) {
    case 'boot': tp.set(0, 2.6, 13); tl.set(0, 2.4, -4); break;
    case 'intro': tp.set(1.6 - G.t * 0.002, 1.62, 5.7 - G.t * 0.004); tl.set(0.05, 1.15, 3.2); rate = 2.5; break;
    case 'title': case 'controls': {
      const a = time * 0.12;
      tp.set(Math.sin(a) * 4, 2.3 + Math.sin(time * 0.2) * 0.3, (9.5 + Math.cos(a) * 1.5) * aspectK); tl.set(0, 2.3, -3); rate = 1.5; break;
    }
    case 'select': case 'versus': tp.set(0, 1.9, 10.5 * aspectK); tl.set(0, 1.55, 0); break;
    default: {
      const [a, b] = G.fighters;
      if (G.sub === 'victory' || G.state === 'results') {
        const W = G.winner;
        tp.set(W.x, 2.0, 6.4 * aspectK); tl.set(W.x, 1.7, 0); rate = 1.8;
      } else if (G.sub === 'fatality') {
        const L = G.loser;
        tp.set(L.x - G.fatal.dirAway * 1.2, 2.8, 12.5 * aspectK); tl.set(L.x + G.fatal.dirAway * 1.2, 2.0, 0); rate = 2;
      } else {
        const mid = clamp((a.x + b.x) / 2, -6, 6), sep = Math.abs(a.x - b.x);
        const dist = clamp(7.4 + sep * 0.55, 8.2, 13.5) * aspectK, hy = Math.max(a.y, b.y) * 0.35;
        tp.set(mid, 2.1 + hy, dist); tl.set(mid, 1.45 + hy, 0);
        rate = G.sub === 'roundIntro' ? 2.2 : 5;
      }
    }
  }
  const k = 1 - Math.exp(-rate * dt);
  cam.pos.lerp(tp, k); cam.look.lerp(tl, k);
  camera.position.copy(cam.pos);
  if (G.shake > 0.002) {
    camera.position.x += (Math.random() - 0.5) * G.shake;
    camera.position.y += (Math.random() - 0.5) * G.shake;
    G.shake *= Math.exp(-dt * 7);
  }
  camera.lookAt(cam.look);
}

// ---------------------------------------------------------------- loop
function step() {
  G.t++;
  switch (G.state) {
    case 'boot': if (input.takeAny()) startIntro(); break;
    case 'intro': introStep(); break;
    case 'title': titleStep(); break;
    case 'controls': if (G.t > 5 && input.takeAny()) backToTitle(); break;
    case 'select': selectStep(); break;
    case 'versus': versusStep(); break;
    case 'fight': fightStep(); break;
    case 'results': resultsStep(); break;
  }
}

stage.setMood('title');
let last = performance.now(), acc = 0, time = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  time += dt;
  acc += dt * G.timeScale;
  let steps = 0;
  while (acc >= STEP && steps < 5) { input.poll(); step(); acc -= STEP; steps++; }
  if (steps === 5) acc = 0;
  const fdt = dt * (G.paused ? 0 : G.timeScale);
  for (const f of allFighters()) f.animate(fdt);
  stage.update(dt, time, fx);
  for (const p of Object.values(fx)) p.update(fdt);
  updateCamera(dt, time);
  const s = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  for (const p of Object.values(fx)) p.mat.uniforms.uScale.value = s;
  if (G.state === 'fight' || G.state === 'results') UI.updateHud(G.fighters, G.timer, G.wins);
  composer.render();
}
requestAnimationFrame(frame);

// console helpers: __dbg.fight(0, 7, 'cpu')
window.__dbg = {
  game, ROSTER,
  tick(n = 1) { for (let i = 0; i < n; i++) { input.poll(); step(); } },
  special(i) { const f = G.fighters[i]; f.specialCD = 0; f.buf.special = 7; },
  fight(a = 0, b = 1, mode = '1p') { G.mode = mode; input.solo = mode !== '2p'; G.sel = [a, b]; sound.init(); startMatch(); },
};
