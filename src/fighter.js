import { buildFighterModel } from './model.js';
import { KEYS, POSE, ANIM, applyPose, blankPose, over, seq, breathe, walkPose, dizzyPose, winPose } from './poses.js';

export const GRAV = -0.017;
const YAW = Math.PI / 2 - 0.38;

// Frame data at 60fps. box = [forward offset, bottom, width, height] relative to the fighter.
export const MOVES = {
  jab:        { s: 5,  a: 3,  r: 10, dmg: 6,  stun: 15, bstun: 9,  push: 0.1,  box: [0.3, 1.75, 0.8, 0.45], height: 'high' },
  uppercut:   { s: 8,  a: 4,  r: 24, dmg: 13, launch: [0.06, 0.34], box: [0.2, 1.1, 0.85, 1.4], height: 'mid', heavy: true, low: true },
  kick:       { s: 7,  a: 4,  r: 15, dmg: 10, stun: 18, bstun: 11, push: 0.16, box: [0.35, 0.85, 0.95, 0.55], height: 'mid' },
  roundhouse: { s: 11, a: 4,  r: 20, dmg: 14, launch: [0.13, 0.16], box: [0.35, 1.65, 1.0, 0.6], height: 'high', heavy: true },
  sweep:      { s: 8,  a: 5,  r: 22, dmg: 9,  launch: [0.03, 0.13], box: [0.35, 0, 1.05, 0.45], height: 'low', low: true },
  jpunch:     { s: 4,  a: 10, r: 4,  dmg: 8,  stun: 17, bstun: 10, push: 0.1,  box: [0.25, 0.8, 0.8, 0.7], height: 'overhead', air: true },
  jkick:      { s: 5,  a: 12, r: 4,  dmg: 11, stun: 19, bstun: 11, push: 0.14, box: [0.35, 0.3, 0.95, 0.65], height: 'overhead', air: true },
  special:    { s: 14, a: 0,  r: 22, spawn: 14 },
  dash:       { s: 10, a: 24, r: 18, dmg: 15, launch: [0.14, 0.2], box: [0.2, 0.6, 1.2, 1.5], height: 'mid', heavy: true, dash: true, dashV: 0.21 },
  // teleport follow-up and counter retaliation
  telestrike: { s: 3,  a: 5,  r: 16, dmg: 12, launch: [0.12, 0.24], box: [0.1, 0.9, 1.05, 1.3], height: 'mid', heavy: true },
  // counter stance: any melee hit during the active window is reversed
  counter:    { s: 3,  a: 34, r: 14, counter: true },
};

// Which move a special starts, by kind.
const SPECIAL_MOVE = { dash: 'dash', counter: 'counter' };

const ACTIONABLE = new Set(['idle', 'walkF', 'walkB', 'crouch']);

function angleDiff(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

export class Fighter {
  constructor(def, index, scene) {
    this.def = def; this.index = index; this.scene = scene;
    this.stats = { speed: 1, power: 1, health: 100, jump: 1, ...def.stats };
    this.model = buildFighterModel(def);
    scene.add(this.model.root);
    this.pose = { ...POSE.stance };
    this.attackId = 0;
    this.time = Math.random() * 10;
    this.buf = { punch: 0, kick: 0, special: 0 };
    this.reset(index === 0 ? -2.6 : 2.6);
    this.visYaw = this.facing * YAW;
  }

  reset(x) {
    this.x = x; this.y = 0; this.vx = 0; this.vy = 0; this.z = 0;
    this.facing = x < 0 ? 1 : -1;
    this.maxHp = this.stats.health; this.hp = this.maxHp;
    this.state = 'idle'; this.t = 0; this.move = null; this.moveName = ''; this.hitDone = false;
    this.stun = 0; this.juggle = 0; this.specialCD = 0; this.airAttack = false; this.walkPh = 0;
    this.dead = false; this.finishPending = false; this.blockCrouch = false; this.hitHeight = 'high';
    this.squash = false; this.yawOverride = null;
    this.shieldT = 0; this.buffT = 0; this.buffMul = 1; this.regen = 0; this.hidden = 0;
    this.buf.punch = this.buf.kick = this.buf.special = 0;
    this.model.root.scale.set(1, 1, 1);
  }

  dispose() { this.scene.remove(this.model.root); this.model.dispose(); }

  actionable() { return ACTIONABLE.has(this.state) && this.y <= 0; }

  setState(s) {
    if (s === 'idle' && this.finishPending) { s = 'dizzy'; this.finishPending = false; }
    this.state = s; this.t = 0;
  }
  go(s) { if (this.state !== s) this.setState(s); }

  startMove(name, game) {
    this.move = MOVES[name]; this.moveName = name;
    this.setState('attack');
    this.hitDone = false; this.attackId++;
    if (!this.move.air) this.vx = 0;
    game.sfx(this.move.heavy ? 'whoosh' : 'whoosh', this.move.heavy ? 1.3 : 0.8);
  }

  update(inp, opp, game) {
    this.t++;
    if (this.specialCD > 0) this.specialCD--;
    if (this.shieldT > 0) this.shieldT--;
    if (this.buffT > 0 && --this.buffT === 0) this.buffMul = 1;
    if (this.regen > 0 && !this.dead && this.hp > 0) { const r = Math.min(this.regen, 0.12); this.hp = Math.min(this.maxHp, this.hp + r); this.regen -= r; }
    if (this.hidden > 0) this.hidden--;
    const b = this.buf;
    b.punch = inp.punchP ? 7 : Math.max(0, b.punch - 1);
    b.kick = inp.kickP ? 7 : Math.max(0, b.kick - 1);
    b.special = inp.specialP ? 7 : Math.max(0, b.special - 1);
    const S = this.stats;
    const grounded = this.y <= 0 && this.vy <= 0;

    if (grounded && (this.actionable() || this.state === 'block' || this.state === 'crouchBlock')) {
      this.facing = Math.sign(opp.x - this.x) || this.facing;
      const fwd = (inp.right && this.facing > 0) || (inp.left && this.facing < 0);
      const back = (inp.left && this.facing > 0) || (inp.right && this.facing < 0);
      if (inp.block) { this.go(inp.down ? 'crouchBlock' : 'block'); this.vx = 0; }
      else if (b.punch) { b.punch = 0; this.startMove(inp.down ? 'uppercut' : 'jab', game); }
      else if (b.kick) { b.kick = 0; this.startMove(inp.down ? 'sweep' : fwd ? 'roundhouse' : 'kick', game); }
      else if (b.special && this.specialCD <= 0 && !game.hasProjectile(this)) {
        b.special = 0; this.specialCD = this.def.special.cd ?? 90;
        this.startMove(SPECIAL_MOVE[this.def.special.kind] ?? 'special', game);
      } else if (inp.up) {
        this.setState('jump'); this.vy = 0.3 * S.jump; this.y = 0.001; this.airAttack = false;
        this.vx = (fwd ? 0.08 : back ? -0.07 : 0) * this.facing * S.speed;
        game.sfx('jump');
      } else if (inp.down) { this.go('crouch'); this.vx = 0; }
      else if (fwd) { this.go('walkF'); this.vx = 0.068 * S.speed * this.facing; this.walkPh += 0.2; }
      else if (back) { this.go('walkB'); this.vx = -0.055 * S.speed * this.facing; this.walkPh -= 0.18; }
      else { this.go('idle'); this.vx = 0; }
    }

    switch (this.state) {
      case 'jump':
        if (!this.airAttack && (b.punch || b.kick) && this.t > 3) {
          const n = b.kick ? 'jkick' : 'jpunch';
          b.punch = b.kick = 0; this.airAttack = true;
          this.startMove(n, game);
        }
        break;
      case 'attack': this.updateMove(game); break;
      case 'hitstun': case 'blockstun': case 'stunned': if (--this.stun <= 0) this.setState('idle'); break;
      case 'down': if (!this.dead && this.t >= 40) this.setState('getup'); break;
      case 'getup': if (this.t >= 24) this.setState('idle'); break;
      case 'land': if (this.t >= 5) this.setState('idle'); break;
    }

    const airborne = this.y > 0 || this.vy > 0;
    this.x += this.vx;
    if (airborne) {
      this.vy += GRAV; this.y += this.vy;
      if (this.y <= 0) { this.y = 0; this.vy = 0; this.onLand(game); }
    } else if (this.state === 'attack') {
      if (!this.move?.dash) this.vx *= 0.75;
    } else if (!ACTIONABLE.has(this.state)) {
      this.vx *= 0.8;
    }
  }

  updateMove(game) {
    const m = this.move, f = this.t;
    if (m.spawn && f === m.spawn) { game.special(this); if (this.state !== 'attack' || this.move !== m) return; }
    if (m.dash) {
      if (this.hitDone && f < m.s + m.a) { this.t = m.s + m.a; this.vx *= 0.3; }
      else if (f >= m.s && f < m.s + m.a) {
        this.vx = m.dashV * this.facing * this.stats.speed;
        if ((f - m.s) % 7 === 0) game.sfx(this.def.special.sfx ?? 'tung');
      } else if (f >= m.s + m.a) this.vx *= 0.8;
    }
    if (this.t >= m.s + m.a + m.r) {
      this.move = null;
      if (this.y > 0) { this.state = 'jump'; this.t = 10; this.airAttack = true; }
      else this.setState('idle');
    }
  }

  onLand(game) {
    if (this.state === 'launched') {
      this.setState('down'); this.vx *= 0.4; this.juggle = 0;
      game.onBodyLand(this);
    } else if (this.state === 'jump' || (this.state === 'attack' && this.move?.air)) {
      this.move = null; this.setState('land'); game.sfx('land');
    }
  }

  activeBox() {
    if (this.state !== 'attack' || this.hitDone || !this.move.box) return null;
    const m = this.move, f = this.t;
    if (f < m.s || f >= m.s + m.a) return null;
    const [ox, oy, w, h] = m.box;
    const a = this.x + this.facing * ox, b = this.x + this.facing * (ox + w);
    return { x0: Math.min(a, b), x1: Math.max(a, b), y0: this.y + oy, y1: this.y + oy + h };
  }

  hurtBox() {
    const s = this.state;
    if (this.dead || s === 'down' || s === 'getup' || s === 'win') return null;
    if (s === 'launched') return { x0: this.x - 0.55, x1: this.x + 0.55, y0: this.y, y1: this.y + 1.4 };
    const low = s === 'crouch' || s === 'crouchBlock' || (s === 'blockstun' && this.blockCrouch) || (s === 'attack' && this.move?.low);
    return { x0: this.x - 0.42, x1: this.x + 0.42, y0: this.y, y1: this.y + (low ? 1.6 : 2.55) };
  }

  blocks(height) {
    const s = this.state;
    if (s === 'crouchBlock' || (s === 'blockstun' && this.blockCrouch)) return height !== 'overhead';
    if (s === 'block' || (s === 'blockstun' && !this.blockCrouch)) return height !== 'low';
    return false;
  }

  // true while a counter stance is live
  countering() {
    const m = this.move;
    return this.state === 'attack' && m?.counter && this.t >= m.s && this.t < m.s + m.a;
  }

  receive(h) {
    if (!h.proj && !h.grab && this.countering()) return 'counter';
    const m = this.move;
    if (this.state === 'attack' && m?.dash && this.def.special.armor && this.t < m.s + m.a) {
      this.hp -= h.dmg * 0.6; this.model.flash(0xffd040, 1.4);
      return 'armor';
    }
    if (!h.grab && this.blocks(h.height)) {
      this.blockCrouch = this.state === 'crouchBlock' || (this.state === 'blockstun' && this.blockCrouch);
      if (this.hp > 1) this.hp = Math.max(1, this.hp - h.dmg * 0.12);
      this.state = 'blockstun'; this.t = 0;
      this.stun = h.bstun ?? 10; this.vx = h.dir * (h.push ?? 0.12);
      return 'block';
    }
    const scale = Math.max(0.3, 1 - this.juggle * 0.25) * (this.shieldT > 0 ? 0.5 : 1);
    this.hp -= h.dmg * scale;
    this.move = null;
    this.model.flash(0xff5030, 1.2);
    const airborne = this.y > 0.05 || this.state === 'launched';
    if (h.launch || airborne) {
      this.juggle++;
      const L = h.launch || [0.06, 0.16];
      this.setState('launched');
      this.vx = h.dir * L[0]; this.vy = L[1]; this.y = Math.max(this.y, 0.01);
    } else if (h.freeze) {
      this.setState('stunned');
      this.stun = h.freeze; this.vx = h.dir * 0.04;
    } else {
      this.setState('hitstun');
      this.stun = h.stun ?? 14; this.vx = h.dir * (h.push ?? 0.12);
      this.hitHeight = h.height;
    }
    return 'hit';
  }

  knockOut(dir, vx = 0.09, vy = 0.2) {
    this.dead = true; this.finishPending = false; this.move = null;
    this.setState('launched');
    this.vx = dir * vx; this.vy = vy; this.y = Math.max(this.y, 0.01);
  }

  targetPose() {
    const s = this.state, t = this.t, tm = this.time;
    switch (s) {
      case 'idle': return breathe(tm);
      case 'walkF': case 'walkB': return walkPose(this.walkPh);
      case 'crouch': return POSE.crouch;
      case 'block': return POSE.block;
      case 'crouchBlock': return POSE.crouchBlock;
      case 'blockstun': return this.blockCrouch ? POSE.crouchBlock : over(POSE.block, { torsoX: 0.4 });
      case 'jump': return t < 3 ? POSE.crouchLite : this.vy > 0 ? POSE.jumpUp : POSE.jumpFall;
      case 'land': return POSE.crouchLite;
      case 'attack': return this.move ? ANIM[this.moveName](t, this.move) : POSE.stance;
      case 'hitstun': return this.hitHeight === 'high' ? POSE.hitHigh : POSE.hitMid;
      case 'launched': return POSE.launched;
      case 'down': return POSE.down;
      case 'getup': return seq([[0, POSE.down], [12, POSE.crouch], [24, POSE.stance]], t);
      case 'dizzy': case 'stunned': return dizzyPose(tm);
      case 'win': return winPose(tm);
      case 'intro': return POSE.taunt;
    }
    return POSE.stance;
  }

  expression() {
    const s = this.state;
    if (this.dead) return 'ko';
    if (s === 'attack') return 'angry';
    if (s === 'hitstun' || s === 'launched' || s === 'down' || s === 'getup') return 'hurt';
    if (s === 'dizzy' || s === 'stunned') return 'dizzy';
    if (s === 'win' || s === 'intro') return 'win';
    return 'normal';
  }

  animate(dt) {
    this.time += dt;
    const target = this.targetPose();
    const rate = this.state === 'attack' ? 38 : this.state === 'launched' || this.state === 'hitstun' ? 22 : 13;
    const k = 1 - Math.exp(-rate * dt);
    for (const key of KEYS) this.pose[key] += (target[key] - this.pose[key]) * k;
    applyPose(this.model.J, this.pose);
    const root = this.model.root;
    root.position.set(this.x, this.y, this.z);
    const yawT = this.yawOverride ?? this.facing * YAW;
    this.visYaw += angleDiff(yawT, this.visYaw) * (1 - Math.exp(-12 * dt));
    root.rotation.y = this.visYaw;
    root.visible = this.hidden <= 0;
    if (this.squash) {
      const a = Math.min(1, dt * 40);
      root.scale.x += (1.75 - root.scale.x) * a;
      root.scale.y += (0.07 - root.scale.y) * a;
      root.scale.z = root.scale.x;
    }
    this.model.setExpression(this.expression());
    this.model.update(dt);
  }
}

export { blankPose };
