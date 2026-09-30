import { NONE } from './input.js';

export class AI {
  constructor(level = 0.6) {
    this.level = level;
    this.hold = null; this.holdT = 0;
    this.blockFor = -1; this.willBlock = false;
    this.projFor = null; this.projReact = 0;
    this.finT = 0; this.finChoice = null;
  }

  reset() { this.hold = null; this.holdT = 0; this.finT = 0; this.finChoice = null; }

  plan(keys, frames) { this.hold = keys; this.holdT = frames | 0; }

  think(me, opp, game) {
    const o = { ...NONE };
    const dx = opp.x - me.x, dist = Math.abs(dx);
    const fwd = dx > 0 ? 'right' : 'left', back = dx > 0 ? 'left' : 'right';
    const L = this.level, r = Math.random();
    const press = (k, extra = {}) => { o[k + 'P'] = true; o[k] = true; Object.assign(o, extra); };

    // Finish him!
    if (game.sub === 'finish' && opp.state === 'dizzy') {
      this.finT++;
      if (this.finChoice === null) this.finChoice = Math.random() < 0.7;
      if (this.finT > 45) {
        if (this.finChoice) press('special');
        else if (dist > 1.2) o[fwd] = true;
        else if (me.actionable()) press('punch', { down: true });
      }
      return o;
    }

    if (me.state === 'jump') {
      o[fwd] = me.vx * dx > 0;
      if (!me.airAttack && dist < 2.1 && me.vy < 0.12) press(Math.random() < 0.6 ? 'kick' : 'punch');
      return o;
    }

    // react to an incoming attack
    if (opp.state === 'attack' && opp.move?.box && dist < 2.8 && opp.t <= opp.move.s + opp.move.a) {
      if (this.blockFor !== opp.attackId) { this.blockFor = opp.attackId; this.willBlock = Math.random() < 0.3 + L * 0.45; }
      if (this.willBlock) { o.block = true; o.down = opp.move.height === 'low'; return o; }
    }
    if (me.state === 'blockstun') { o.block = true; o.down = me.blockCrouch; return o; }

    // projectiles
    for (const p of game.projectiles) {
      if (p.owner === me || !p.alive) continue;
      const toward = Math.sign(p.vx) === Math.sign(me.x - p.x);
      if (!toward || Math.abs(p.x - me.x) > 4.2) continue;
      if (this.projFor !== p) { this.projFor = p; this.projReact = Math.random(); }
      if (this.projReact < 0.25 + L * 0.4) { o.block = true; return o; }
      if (this.projReact < 0.35 + L * 0.5 && me.actionable() && Math.abs(p.x - me.x) < 3) { o.up = true; o[fwd] = true; return o; }
    }

    if (this.holdT > 0) { this.holdT--; Object.assign(o, this.hold); return o; }
    if (!me.actionable()) return o;

    const canSpecial = me.specialCD <= 0 && !game.projectiles.some((p) => p.owner === me);
    const dash = me.def.special.type === 'dash';

    if (opp.state === 'down' || opp.state === 'getup') {
      if (dist < 2.5 && r < 0.5) this.plan({ [back]: true }, 10);
    } else if (opp.y > 0.5 && dist < 2.4 && opp.vy < 0.1 && r < 0.12 + L * 0.2) {
      press('punch', { down: true }); // anti-air uppercut
    } else if (dist > 5) {
      if (canSpecial && !dash && r < 0.03 + L * 0.03) press('special');
      else this.plan({ [fwd]: true }, 10 + Math.random() * 15);
    } else if (dist > 2.1) {
      if (canSpecial && r < (dash ? 0.02 : 0.018)) press('special');
      else if (r < 0.04) { o.up = true; o[fwd] = true; }
      else if (r < 0.055) this.plan({ [back]: true }, 12);
      else this.plan({ [fwd]: true }, 6 + Math.random() * 8);
    } else if (dist > 1.25) {
      const p = 0.03 + L * 0.06;
      if (r < p) {
        const c = Math.random();
        if (c < 0.35) press('kick');
        else if (c < 0.55) press('kick', { [fwd]: true });
        else if (c < 0.8) press('kick', { down: true });
        else press('punch');
      } else if (r < p + 0.02) this.plan({ [back]: true }, 10);
      else if (r < p + 0.12) this.plan({ [fwd]: true }, 4);
    } else {
      const p = 0.05 + L * 0.09;
      if (r < p) {
        const c = Math.random();
        if (c < 0.45) press('punch');
        else if (c < 0.75) press('punch', { down: true });
        else if (c < 0.9) press('kick', { down: true });
        else press('kick');
      } else if (r < p + 0.04) this.plan({ [back]: true }, 10);
      else if (r < p + 0.06) this.plan({ block: true }, 14);
    }
    return o;
  }
}
