// Procedural animation: every pose is a flat bag of joint angles that gets
// blended toward per frame. Attack animations are keyframed on game frames.

export const KEYS = [
  'hipsY', 'hipsX', 'hipsZ', 'hipsYaw',
  'torsoX', 'torsoY', 'torsoZ',
  'headX', 'headY', 'headZ',
  'lsX', 'lsY', 'lsZ', 'leX',
  'rsX', 'rsY', 'rsZ', 'reX',
  'lhX', 'lhZ', 'lkX',
  'rhX', 'rhZ', 'rkX',
];

export function blankPose() {
  const p = {};
  for (const k of KEYS) p[k] = 0;
  return p;
}

const P = (o) => Object.assign(blankPose(), o);
export const over = (base, o) => Object.assign({ ...base }, o);

export function mix(a, b, t) {
  const o = {};
  for (const k of KEYS) o[k] = a[k] + (b[k] - a[k]) * t;
  return o;
}

const ease = (t) => t * t * (3 - 2 * t);

// keys: [[frame, pose], ...] in ascending frame order
export function seq(keys, f) {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (f <= keys[i][0]) {
      const [f0, p0] = keys[i - 1], [f1, p1] = keys[i];
      return mix(p0, p1, ease((f - f0) / Math.max(1, f1 - f0)));
    }
  }
  return keys[keys.length - 1][1];
}

export function applyPose(J, p) {
  J.hips.position.y = 0.95 + p.hipsY;
  J.hips.rotation.set(p.hipsX, p.hipsYaw, p.hipsZ);
  J.torso.rotation.set(p.torsoX, p.torsoY, p.torsoZ);
  J.head.rotation.set(p.headX, p.headY, p.headZ);
  J.ls.rotation.set(p.lsX, p.lsY, p.lsZ); J.le.rotation.x = p.leX;
  J.rs.rotation.set(p.rsX, p.rsY, p.rsZ); J.re.rotation.x = p.reX;
  J.lh.rotation.set(p.lhX, 0, p.lhZ); J.lk.rotation.x = p.lkX;
  J.rh.rotation.set(p.rhX, 0, p.rhZ); J.rk.rotation.x = p.rkX;
}

// L = the arm/leg on the model's +x side. Negative shoulder/hip X swings forward.
export const POSE = {};
POSE.stance = P({
  hipsY: -0.08, torsoX: 0.1, torsoY: -0.25, headY: 0.2, headX: -0.05,
  lsX: -1.2, lsZ: 0.1, leX: -1.75, rsX: -0.85, rsZ: -0.25, reX: -2.05,
  lhX: -0.45, lhZ: 0.06, lkX: 0.9, rhX: 0.25, rhZ: -0.06, rkX: 0.35,
});
const S = POSE.stance;
POSE.crouch = over(S, { hipsY: -0.55, torsoX: 0.45, headX: -0.35, lhX: -1.45, lkX: 2.35, rhX: -0.9, rkX: 2.34, lsX: -1.3, leX: -1.8 });
POSE.crouchLite = over(S, { hipsY: -0.25, lhX: -0.9, lkX: 1.5, rhX: -0.3, rkX: 1.0, torsoX: 0.25 });
POSE.block = over(S, { torsoX: 0.25, headX: 0.3, lsX: -1.55, lsZ: -0.5, leX: -2.0, rsX: -1.45, rsZ: 0.5, reX: -2.1, torsoY: -0.05, headY: 0.05 });
POSE.crouchBlock = over(POSE.crouch, { lsX: -1.55, lsZ: -0.5, leX: -2.0, rsX: -1.45, rsZ: 0.5, reX: -2.1, headX: 0.1 });
POSE.jumpUp = over(S, { lhX: -1.3, lkX: 1.8, rhX: -0.6, rkX: 1.6, lsX: -2.2, leX: -1.0, rsX: -1.6, reX: -1.2, torsoX: 0.1 });
POSE.jumpFall = over(S, { lhX: -0.8, lkX: 1.1, rhX: -0.2, rkX: 0.8, lsX: -1.6, rsX: -1.2 });
POSE.hitHigh = over(S, { torsoX: -0.35, headX: -0.55, headZ: 0.2, lsX: -0.5, lsZ: 0.6, leX: -0.6, rsX: -0.2, rsZ: -0.7, reX: -0.5, hipsY: -0.12 });
POSE.hitMid = over(S, { torsoX: 0.6, headX: 0.35, lsX: -0.9, lsZ: -0.2, leX: -1.2, rsX: -0.9, rsZ: 0.2, reX: -1.2, hipsY: -0.18, lkX: 1.1, rkX: 0.6 });
POSE.launched = P({ hipsY: -0.05, hipsX: -0.9, torsoX: -0.3, headX: -0.4, lsX: -2.4, lsZ: 0.9, leX: -0.4, rsX: -2.2, rsZ: -0.9, reX: -0.5, lhX: -0.9, lkX: 0.9, rhX: -0.5, rkX: 1.2 });
POSE.down = P({ hipsY: -0.73, hipsX: -1.57, torsoX: 0.05, headX: 0.15, headY: 0.4, lsX: -0.3, lsZ: 1.3, leX: -0.4, rsX: -0.6, rsZ: -1.1, reX: -0.8, lhX: -0.15, lhZ: 0.15, lkX: 0.35, rhX: 0.1, rhZ: -0.1, rkX: 0.1 });
POSE.dizzy = over(S, { lsX: -0.2, lsZ: 0.25, leX: -0.4, rsX: -0.1, rsZ: -0.25, reX: -0.3, torsoX: 0.2, torsoY: 0, headY: 0, hipsY: -0.12, lkX: 1.0, rkX: 0.5 });
POSE.win = P({ lsX: -2.9, lsZ: 0.45, leX: -0.25, rsX: -2.9, rsZ: -0.45, reX: -0.25, headX: -0.25, lhX: -0.1, lhZ: 0.1, lkX: 0.15, rhX: 0.05, rhZ: -0.1, rkX: 0.1 });
POSE.taunt = over(S, { rsX: -1.55, rsZ: -0.05, reX: -0.05, torsoY: 0.3, headY: -0.25 });
POSE.portrait = P({ torsoX: 0.02, lsX: -0.15, lsZ: 0.12, leX: -0.3, rsX: -0.15, rsZ: -0.12, reX: -0.3, lhZ: 0.05, rhZ: -0.05, headX: 0.05 });

export function breathe(t) {
  const b = Math.sin(t * 2.4);
  return over(S, { hipsY: -0.08 + b * 0.025, lsX: -1.2 + b * 0.05, rsX: -0.85 - b * 0.05, torsoX: 0.1 + b * 0.02 });
}

export function walkPose(ph) {
  const s = Math.sin(ph), c = Math.cos(ph);
  return over(S, {
    hipsY: -0.1 + Math.abs(c) * 0.04,
    lhX: -0.45 + s * 0.4, lkX: 0.9 + Math.max(0, -s) * 0.5,
    rhX: 0.25 - s * 0.4, rkX: 0.35 + Math.max(0, s) * 0.5,
    torsoY: -0.25 + s * 0.06,
  });
}

export function dizzyPose(t) {
  return over(POSE.dizzy, {
    torsoZ: Math.sin(t * 2) * 0.18, hipsZ: Math.sin(t * 2) * 0.06,
    headZ: Math.sin(t * 2.6) * 0.3, headX: 0.2 + Math.sin(t * 1.7) * 0.1,
  });
}

export function winPose(t) {
  return over(POSE.win, {
    hipsY: Math.abs(Math.sin(t * 5)) * 0.12,
    lsZ: 0.45 + Math.sin(t * 10) * 0.1, rsZ: -0.45 - Math.sin(t * 10) * 0.1,
  });
}

// Attack animations: (frame, move) -> pose
const jabHit = over(S, { lsX: -2.0, lsZ: -0.15, leX: -0.05, torsoY: -0.55, headY: 0.45, torsoX: 0.15 });
const upWind = over(POSE.crouch, { rsX: -0.4, reX: -1.6, torsoY: 0.3 });
const upHit = over(S, { hipsY: 0.02, torsoX: -0.25, torsoY: 0.55, headY: -0.4, headX: -0.2, rsX: -2.95, rsZ: 0.1, reX: -0.25, lhX: -0.2, lkX: 0.3, rhX: 0.1, rkX: 0.2 });
const kickCh = over(S, { rhX: -1.7, rkX: 1.9, torsoX: -0.1, lkX: 0.4, lhX: -0.2 });
const kickHit = over(S, { rhX: -1.8, rkX: 0.05, torsoX: -0.35, lkX: 0.3, lhX: -0.15, torsoY: 0.1 });
const rhCh = over(S, { rhX: -1.4, rhZ: -0.6, rkX: 2.0, torsoZ: 0.3, torsoX: -0.2, hipsYaw: 0.4 });
const rhHit = over(S, { hipsY: 0.05, rhX: -2.5, rhZ: -0.2, rkX: 0.05, torsoX: -0.55, torsoZ: 0.25, hipsYaw: 0.5, lhX: 0, lkX: 0.2, lsZ: 0.6, rsZ: -0.6 });
const swLow = over(POSE.crouch, { hipsY: -0.6, torsoX: 0.5, hipsYaw: -0.6, rhX: -1.2, rhZ: -0.3, rkX: 0.05, lhX: -1.5, lkX: 2.4, lsX: -0.5, lsZ: 0.4, leX: -0.6 });
const jp = over(POSE.jumpFall, { lsX: -1.0, leX: -0.1, lsZ: -0.1, torsoY: -0.4, torsoX: 0.25, rsX: -2.4, reX: -0.6 });
const jk = over(POSE.jumpFall, { rhX: -1.35, rkX: 0.05, lhX: -0.4, lkX: 1.9, torsoX: -0.3, lsX: -2.0, lsZ: 0.6, rsX: -1.8, rsZ: -0.6 });
const spWind = over(S, { rsX: 0.9, rsZ: -0.3, reX: -1.3, torsoY: 0.55, headY: -0.4, torsoX: -0.1 });
const spRel = over(S, { rsX: -1.75, rsZ: 0, reX: -0.1, torsoY: -0.55, headY: 0.45, torsoX: 0.25, lhX: -0.6, lkX: 1.0 });

export const ANIM = {
  jab: (f, m) => seq([[0, S], [m.s, jabHit], [m.s + m.a, jabHit], [m.s + m.a + m.r, S]], f),
  uppercut: (f, m) => seq([[0, POSE.crouch], [m.s - 2, upWind], [m.s + 1, upHit], [m.s + m.a + 4, upHit], [m.s + m.a + m.r, S]], f),
  kick: (f, m) => seq([[0, S], [m.s - 3, kickCh], [m.s, kickHit], [m.s + m.a, kickHit], [m.s + m.a + 5, kickCh], [m.s + m.a + m.r, S]], f),
  roundhouse: (f, m) => seq([[0, S], [m.s - 3, rhCh], [m.s, rhHit], [m.s + m.a + 2, rhHit], [m.s + m.a + 8, rhCh], [m.s + m.a + m.r, S]], f),
  sweep: (f, m) => seq([[0, POSE.crouch], [m.s - 2, over(POSE.crouch, { hipsYaw: 0.4 })], [m.s, swLow], [m.s + m.a, over(swLow, { hipsYaw: -1.2 })], [m.s + m.a + m.r, POSE.crouch]], f),
  jpunch: (f, m) => seq([[0, POSE.jumpUp], [m.s, jp], [m.s + m.a + m.r, jp]], f),
  jkick: (f, m) => seq([[0, POSE.jumpUp], [m.s, jk], [m.s + m.a + m.r, jk]], f),
  special: (f, m) => seq([[0, S], [m.s - 5, spWind], [m.s, spRel], [m.s + 10, spRel], [m.s + m.a + m.r, S]], f),
  dash: (f, m) => {
    const run = Math.sin(f * 0.6);
    const swing = f < m.s ? 0 : Math.abs(Math.sin((f - m.s) * 0.32));
    const p = over(S, {
      torsoX: 0.35, lhX: -0.45 + run * 0.8, rhX: 0.25 - run * 0.8,
      lkX: 0.9 + Math.max(0, run) * 0.8, rkX: 0.35 + Math.max(0, -run) * 0.8,
      lsX: -1.0 - run * 0.6, rsX: -3.0 + swing * 2.4, reX: -0.2, torsoY: 0.2,
    });
    const end = m.s + m.a;
    return f > end ? mix(p, S, Math.min(1, (f - end) / m.r)) : p;
  },
};
