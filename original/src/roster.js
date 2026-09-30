// The roster. Every fighter is a fictional parliamentary archetype.
//
// Want a real caricature? Add `face: 'faces/<file>.png'` to an entry: a square,
// front-facing image (transparent background works best). It is wrapped onto the
// front of the head and the procedural eyes/nose/mouth are hidden.
export const ROSTER = [
  {
    id: 'speaker', name: 'THE SPEAKER', he: 'יו״ר הכנסת', say: 'The Speaker', pronoun: 'HIM',
    skin: 0xefc39c, suit: 0x1c2440, shirt: 0xf4f4f4, tie: 0x8c1422, pants: 0x161b30, shoes: 0x0e0e0e,
    hair: { style: 'bald', color: 0xdedede }, brows: 0xcfcfcf, glasses: 'round', nose: 1.25,
    build: { width: 1.12, belly: 0.25 }, prop: 'gavel',
    special: { type: 'gavel', name: 'GAVEL TOSS' },
    stats: { speed: 0.95, power: 1.05, health: 105, jump: 0.95 },
  },
  {
    id: 'treasurer', name: 'THE TREASURER', he: 'שר האוצר', say: 'The Treasurer', pronoun: 'HIM',
    skin: 0xe7b58f, suit: 0x3b3f47, shirt: 0xeaf0ff, tie: 0xd4a017, pants: 0x2d3037, shoes: 0x1a0f08,
    hair: { style: 'slick', color: 0x1b1410 }, brows: 0x1b1410, nose: 1.0,
    build: { width: 1.0, belly: 0.1 },
    special: { type: 'coins', name: 'SHEKEL STORM' },
    stats: { speed: 1.05, power: 0.95, health: 100, jump: 1.05 },
  },
  {
    id: 'opposition', name: 'THE OPPOSITION', he: 'ראש האופוזיציה', say: 'The Opposition', pronoun: 'HIM',
    skin: 0xf1c7a3, suit: 0x12305a, shirt: 0xffffff, tie: 0x2a6ad8, pants: 0x0f2446, shoes: 0x111111,
    hair: { style: 'short', color: 0x5a3a22 }, brows: 0x4a2e1a, stubble: 0x9a7058, nose: 1.0,
    build: { width: 1.02 },
    special: { type: 'ballot', name: 'NO-CONFIDENCE VOTE' },
    stats: { speed: 1.0, power: 1.0, health: 100, jump: 1.0 },
  },
  {
    id: 'whip', name: 'THE WHIP', he: 'יו״ר הקואליציה', say: 'The Whip', pronoun: 'HIM',
    skin: 0xd9a47c, suit: 0x111111, shirt: 0xffffff, tie: 0xc01818, pants: 0x0c0c0c, shoes: 0x050505,
    hair: { style: 'curly', color: 0x151010 }, brows: 0x151010, mustache: 0x151010, nose: 1.35,
    build: { width: 1.08, belly: 0.18 },
    special: { type: 'wave', name: 'FILIBUSTER' },
    stats: { speed: 0.9, power: 1.12, health: 108, jump: 0.9 },
  },
  {
    id: 'spokes', name: 'THE SPOKESWOMAN', he: 'הדוברת', say: 'The Spokeswoman', pronoun: 'HER',
    skin: 0xf3cfb0, suit: 0xb3122a, shirt: 0x151515, tie: null, pants: 0x1a1a1a, shoes: 0x7a0a14,
    hair: { style: 'bob', color: 0xe8c36a }, brows: 0x9a7a3a, lips: 0xc0304a, earrings: true, necklace: true, nose: 0.8,
    build: { width: 0.9 },
    special: { type: 'paper', name: 'PRESS RELEASE' },
    stats: { speed: 1.12, power: 0.92, health: 95, jump: 1.1 },
  },
  {
    id: 'backbencher', name: 'THE BACKBENCHER', he: 'ח״כ מהספסל האחורי', say: 'The Backbencher', pronoun: 'HIM',
    skin: 0xf5d2b5, suit: 0x4b5a2a, shirt: 0xf0f0e0, tie: 0x2a8a4a, pants: 0x3a4520, shoes: 0x3a2410,
    hair: { style: 'messy', color: 0xc0561c }, brows: 0xa04a18, glasses: 'square', nose: 0.9,
    build: { width: 0.92 },
    special: { type: 'plane', name: 'PAPER JET' },
    stats: { speed: 1.15, power: 0.88, health: 95, jump: 1.15 },
  },
  {
    id: 'lobbyist', name: 'THE LOBBYIST', he: 'הלוביסט', say: 'The Lobbyist', pronoun: 'HIM',
    skin: 0xe0a987, suit: 0xb89a6a, shirt: 0x1a2a4a, tie: 0xf0f0f0, pants: 0xa88a5a, shoes: 0x5a2a10,
    hair: { style: 'slick', color: 0x9a9a9a }, brows: 0x777777, glasses: 'shades', nose: 1.1,
    build: { width: 1.05, belly: 0.12 },
    special: { type: 'cash', name: 'BRIEFCASE BRIBE' },
    stats: { speed: 1.0, power: 1.05, health: 100, jump: 1.0 },
  },
  {
    id: 'sahur', name: 'TUNG TUNG SAHUR', he: 'טונג טונג סהור', say: 'Tung Tung Tung Sahur', pronoun: 'IT',
    type: 'log', prop: 'bat',
    special: { type: 'dash', name: 'TUNG TUNG DASH' },
    stats: { speed: 1.1, power: 1.2, health: 92, jump: 1.1 },
  },
];

export const LOCKED_SLOTS = 2;
