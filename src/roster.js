// The roster: satirical caricatures of Israeli politicians ahead of the 2026 election.
// Specials are built on each person's public persona, slogans and famous moments.
//
// Looks are procedural cartoon caricatures: skin, brows, nose, hair style,
// beard / mustache, glasses ('round' | 'square' | 'shades'), eyeColor.
// kippah: { type: 'knit' | 'velvet', base, pattern, edge | color, size } (see src/textures.js)
//
// special.kind:
//   proj     thrown object (optionally lobbed with grav, exploding, freezing, meter-draining)
//   drop     object falls from above onto the opponent's position
//   dash     charging attack (armor: can't be interrupted)
//   teleport vanish, reappear behind the opponent and strike
//   grab     close-range unblockable grab (throw / drain)
//   buff     power boost + regeneration
//   counter  stance that reverses any melee hit
// special.range tells the CPU where to use it: far | mid | close | any
export const ROSTER = [
  {
    id: 'netanyahu', skin: 0xefc3a4, brows: 0xcfcfcf, nose: 1.2, name: 'NETANYAHU', he: 'בנימין נתניהו', say: 'Netanyahu', pronoun: 'HIM', tag: 'THE MAGICIAN',
    suit: 0x1a2440, shirt: 0xf4f4f4, tie: 0x6aa8e0, pants: 0x151b30, shoes: 0x0e0e0e,
    hair: { style: 'swept', color: 0xcfcfcf }, build: { width: 1.12, belly: 0.22 },
    special: { kind: 'proj', name: 'RED LINE', desc: 'Lobs the UN-speech cartoon bomb. It explodes where it lands.',
      mesh: 'bomb', speed: 0.13, vy: 0.2, grav: -0.011, y: 2.0, dmg: 13, explode: 1.5, launch: [0.1, 0.26], w: 0.34, h: 0.34, trail: [2.5, 1.2, 0.3], range: 'far', cd: 110 },
    stats: { speed: 0.95, power: 1.0, health: 110, jump: 0.95 },
  },
  {
    id: 'eisenkot', skin: 0xd9a07c, brows: 0x6a6a6a, nose: 1.15, name: 'EISENKOT', he: 'גדי איזנקוט', say: 'Eisenkot', pronoun: 'HIM', tag: 'STRAIGHT AHEAD',
    suit: 0x2a2e36, shirt: 0xe8ecf2, tie: null, pants: 0x22262e, shoes: 0x151515,
    hair: { style: 'receding', color: 0xb5b5b5 }, build: { width: 1.06, belly: 0.1 },
    special: { kind: 'dash', name: 'YASHAR! CHARGE', desc: 'A dead-straight charge that nothing can interrupt.', armor: true, sfx: 'march', range: 'mid', cd: 100 },
    stats: { speed: 0.92, power: 1.1, health: 106, jump: 0.9 },
  },
  {
    id: 'bennett', skin: 0xeab99a, brows: 0x4a3a2c, nose: 1.0, name: 'BENNETT', he: 'נפתלי בנט', say: 'Bennett', pronoun: 'HIM', tag: 'SOMETHING NEW IS BEGINNING',
    suit: 0x243048, shirt: 0xf2f4f8, tie: 0x2d5fb0, pants: 0x1e2638, shoes: 0x2a1a10,
    hair: { style: 'bald', color: 0x4a3a2c }, kippah: { type: 'knit', base: 0x1c2a4a, pattern: 0x8aa0c8, edge: 0x101828, size: 0.16 }, build: { width: 1.0 },
    special: { kind: 'teleport', name: 'UNDERCOVER HIPSTER', desc: 'Vanishes in disguise and pops up behind you, like the 2015 ad.', dmg: 12, range: 'any', cd: 110 },
    stats: { speed: 1.12, power: 0.98, health: 96, jump: 1.12 },
  },
  {
    id: 'lapid', skin: 0xe2ae8c, brows: 0x5a5a5a, nose: 1.1, name: 'LAPID', he: 'יאיר לפיד', say: 'Lapid', pronoun: 'HIM', tag: 'THE ANCHOR',
    suit: 0x0e0e10, shirt: 0x151515, tie: null, pants: 0x0c0c0e, shoes: 0x0a0a0a,
    hair: { style: 'swept', color: 0xd9d9d9 }, build: { width: 1.28, arms: 1.4, chest: 0.3 },
    special: { kind: 'grab', name: "WHERE'S THE MONEY?", desc: 'Grabs and shakes the money out of you, healing himself.', reach: 1.75, dmg: 13, drain: 0.8, launch: [0.08, 0.2], range: 'close', cd: 100 },
    stats: { speed: 1.08, power: 1.05, health: 98, jump: 1.0 },
  },
  {
    id: 'bengvir', skin: 0xd9a07e, brows: 0x2a2420, nose: 1.1, mustache: 0x3a3430, name: 'BEN-GVIR', he: 'איתמר בן גביר', say: 'Ben Gvir', pronoun: 'HIM', tag: "WHO'S THE BOSS HERE",
    suit: 0x1c1c22, shirt: 0xf6f6f6, tie: null, pants: 0x18181e, shoes: 0x111111,
    hair: { style: 'short', color: 0x3a332c }, beard: 0x4a423a, glasses: 'square', kippah: { type: 'knit', base: 0xf2efe6, pattern: 0x2a4a8a, edge: 0x2a4a8a, size: 0.27 }, build: { width: 1.1, belly: 0.14 },
    special: { kind: 'drop', name: 'LOCKDOWN', desc: 'A jail cage drops on the opponent and traps them.', mesh: 'cage', delay: 32, dmg: 7, freeze: 95, w: 0.75, h: 1.4, range: 'any', cd: 150 },
    stats: { speed: 1.0, power: 1.04, health: 100, jump: 1.0 },
  },
  {
    id: 'smotrich', skin: 0xeab99a, brows: 0x2a1c12, nose: 1.05, mustache: 0x3a2a1c, name: 'SMOTRICH', he: "בצלאל סמוטריץ'", say: 'Smotrich', pronoun: 'HIM', tag: 'THE TREASURY',
    suit: 0x1e2230, shirt: 0xf4f4f4, tie: null, pants: 0x1a1e2a, shoes: 0x111111,
    hair: { style: 'short', color: 0x2e2016 }, beard: 0x4a3626, kippah: { type: 'knit', base: 0xe8e0cc, pattern: 0x3a3a3a, edge: 0x1a1a1a, size: 0.26 }, build: { width: 0.96 },
    special: { kind: 'proj', name: 'BUDGET CUT', desc: 'Spinning budget scissors. On hit they cut the opponent’s special meter to zero.',
      mesh: 'scissors', speed: 0.22, y: 1.7, dmg: 8, meter: 240, w: 0.4, h: 0.25, trail: [2.2, 2.2, 2.4], range: 'far', cd: 90 },
    stats: { speed: 1.02, power: 1.0, health: 100, jump: 1.02 },
  },
  {
    id: 'lieberman', skin: 0xe6b08e, brows: 0x6a6a6a, nose: 1.15, mustache: 0xa8a8a8, name: 'LIEBERMAN', he: 'אביגדור ליברמן', say: 'Lieberman', pronoun: 'HIM', tag: 'THE BOUNCER',
    suit: 0x22262e, shirt: 0xeceff4, tie: 0x5a1a2a, pants: 0x1c2028, shoes: 0x111111,
    hair: { style: 'receding', color: 0x9e9e9e }, beard: 0xc2c2c2, build: { width: 1.18, belly: 0.28 },
    special: { kind: 'grab', name: 'NOT ON THE LIST', desc: 'The ex-nightclub bouncer picks you up and throws you across the room.', reach: 1.7, dmg: 16, launch: [0.24, 0.3], throw: true, range: 'close', cd: 110 },
    stats: { speed: 0.88, power: 1.16, health: 112, jump: 0.85 },
  },
  {
    id: 'gotliv', skin: 0xefc0a0, brows: 0x2c1c14, nose: 0.85, lips: 0xc0304a, name: 'GOTLIV', he: 'טלי גוטליב', say: 'Gotliv', pronoun: 'HER', tag: 'ORDER IN THE COMMITTEE',
    suit: 0x1e6fd0, shirt: 0xffffff, tie: null, pants: 0x1a1a1a, shoes: 0x1a1a1a,
    hair: { style: 'long', color: 0x2c1c14 }, earrings: true, build: { width: 0.9 },
    special: { kind: 'proj', name: 'OBJECTION!', desc: 'A committee-room scream: a slow sonic wave that stuns.',
      mesh: 'scream', speed: 0.13, y: 1.75, dmg: 7, freeze: 55, w: 0.4, h: 0.9, trail: [2.4, 0.6, 1.2], sfx: 'scream', range: 'far', cd: 110 },
    stats: { speed: 1.1, power: 0.95, health: 95, jump: 1.08 },
  },
  {
    id: 'deri', skin: 0xd8a07c, brows: 0x5a5a5a, nose: 1.1, mustache: 0xaaaaaa, name: 'DERI', he: 'אריה דרעי', say: 'Deri', pronoun: 'HIM', tag: 'THE DEALMAKER',
    suit: 0x15151a, shirt: 0xf4f4f4, tie: null, pants: 0x121216, shoes: 0x0a0a0a,
    hair: { style: 'short', color: 0x6a6a6a }, beard: 0xbcbcbc, kippah: { type: 'velvet', color: 0x0a0a0c, size: 0.26 }, build: { width: 1.02, belly: 0.12 },
    special: { kind: 'buff', name: 'RESTORE PAST GLORY', desc: 'The comeback: regains health and hits harder for five seconds.', mul: 1.4, dur: 300, heal: 14, range: 'any', cd: 420 },
    stats: { speed: 0.96, power: 1.0, health: 102, jump: 0.95 },
  },
  {
    id: 'gantz', skin: 0xf0c4a4, brows: 0x9a9a9a, nose: 1.0, eyeColor: 0x3a78c8, name: 'GANTZ', he: 'בני גנץ', say: 'Gantz', pronoun: 'HIM', tag: 'BENNY-CHUTA',
    suit: 0x1a2a4a, shirt: 0xf4f6fa, tie: 0x7ab8e8, pants: 0x162440, shoes: 0x111111,
    hair: { style: 'short', color: 0xc2c2c2 }, build: { width: 1.04 },
    special: { kind: 'counter', name: 'WAIT YOUR TURN', desc: 'A calm stance. Hit him during it and he takes his turn, with interest.', range: 'close', cd: 80 },
    stats: { speed: 1.0, power: 1.02, health: 104, jump: 1.08 },
  },
  {
    id: 'sahur', name: 'TUNG TUNG SAHUR', he: 'טונג טונג סהור', say: 'Tung Tung Tung Sahur', pronoun: 'IT', tag: 'TUNG TUNG TUNG',
    type: 'log', prop: 'bat',
    special: { kind: 'dash', name: 'TUNG TUNG DASH', desc: 'Charges in swinging the bat.', sfx: 'tung', range: 'mid', cd: 90 },
    stats: { speed: 1.1, power: 1.2, health: 92, jump: 1.1 },
  },
];

export const LOCKED_SLOTS = 1;
