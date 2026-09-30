const ACTIONS = ['left', 'right', 'up', 'down', 'punch', 'kick', 'block', 'special'];
const KEYS = [
  { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'], punch: ['KeyJ'], kick: ['KeyK'], block: ['KeyL'], special: ['KeyI', 'KeyU'],
    confirm: ['KeyJ', 'Space', 'Enter'], back: ['KeyK', 'Escape', 'Backspace'] },
  { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'], punch: ['Numpad1', 'Comma'], kick: ['Numpad2', 'Period'], block: ['Numpad3', 'Slash'], special: ['Numpad5', 'Numpad4', 'Semicolon', 'Quote'],
    confirm: ['Numpad1', 'Comma', 'NumpadEnter'], back: ['Numpad2', 'Period'] },
];
const MENU_KEYS = {
  up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
  confirm: ['Enter', 'Space', 'KeyJ', 'NumpadEnter'], back: ['Escape', 'Backspace'], pause: ['Escape', 'KeyP'],
};
const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Slash', 'Quote']);

export const NONE = Object.freeze(Object.fromEntries([...ACTIONS, ...ACTIONS.map((a) => a + 'P')].map((k) => [k, false])));

function padState(p) {
  if (!p) return null;
  const b = (i) => !!p.buttons[i]?.pressed;
  const ax = p.axes[0] ?? 0, ay = p.axes[1] ?? 0;
  return {
    left: ax < -0.5 || b(14), right: ax > 0.5 || b(15), up: ay < -0.6 || b(12), down: ay > 0.6 || b(13),
    punch: b(2), kick: b(0), block: b(1) || b(4) || b(5) || b(6) || b(7), special: b(3),
    confirm: b(0) || b(9), back: b(1), pause: b(9),
  };
}

export class Input {
  constructor() {
    this.down = new Set(); this.pressed = new Set();
    this.solo = true;
    this.prevPad = [{}, {}];
    this.players = [{ ...NONE, menu: {} }, { ...NONE, menu: {} }];
    this.menu = {};
    this.any = false;
    this.onKey = null;
    addEventListener('keydown', (e) => {
      if (PREVENT.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.down.add(e.code); this.pressed.add(e.code); this.any = true;
      this.onKey?.(e.code);
    });
    addEventListener('keyup', (e) => this.down.delete(e.code));
    addEventListener('blur', () => this.down.clear());
    addEventListener('pointerdown', () => { this.any = true; });
  }

  poll() {
    const pads = [...(navigator.getGamepads?.() ?? [])].filter(Boolean);
    const has = (codes, set) => codes.some((c) => set.has(c));
    const padNow = [padState(pads[0]), padState(pads[1])];
    if (this.solo && pads.length > 1) {
      // In single-player any pad drives P1.
      for (const k in padNow[1]) padNow[0][k] = padNow[0][k] || padNow[1][k];
      padNow[1] = null;
    }
    const menu = { upP: false, downP: false, leftP: false, rightP: false, confirmP: false, backP: false, pauseP: false };
    for (const a of ['up', 'down', 'left', 'right', 'confirm', 'back', 'pause']) menu[a + 'P'] = has(MENU_KEYS[a], this.pressed);

    for (let i = 0; i < 2; i++) {
      const maps = this.solo && i === 0 ? KEYS : [KEYS[i]];
      const pad = padNow[i], prev = this.prevPad[i];
      const st = { menu: {} };
      for (const a of ACTIONS) {
        const kHeld = maps.some((m) => has(m[a], this.down));
        const kPress = maps.some((m) => has(m[a], this.pressed));
        st[a] = kHeld || !!pad?.[a];
        st[a + 'P'] = kPress || (!!pad?.[a] && !prev[a]);
      }
      for (const a of ['up', 'down', 'left', 'right', 'confirm', 'back']) {
        const km = a in KEYS[i] ? maps.some((m) => has(m[a], this.pressed)) : false;
        st.menu[a + 'P'] = km || (!!pad?.[a] && !prev[a]);
      }
      if (pad) {
        for (const a of ['up', 'down', 'left', 'right', 'confirm', 'back', 'pause']) if (pad[a] && !prev[a]) menu[a + 'P'] = true;
        if (Object.entries(pad).some(([k, v]) => v && !prev[k])) this.any = true;
      }
      this.prevPad[i] = pad || {};
      this.players[i] = st;
    }
    this.menu = menu;
    this.pressed.clear();
  }

  takeAny() { const a = this.any; this.any = false; return a; }
}
