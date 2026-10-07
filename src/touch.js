// On-screen controls for phones and tablets: a floating joystick on the left,
// four action buttons on the right, and pause / fullscreen at the top.
// The state object is read by Input.poll() like a gamepad for player 1.

const ACTIONS = [
  // [state key, label, hebrew, grid area]
  ['special', 'SPECIAL', 'מיוחד', 'top'],
  ['punch', 'PUNCH', 'אגרוף', 'left'],
  ['kick', 'KICK', 'בעיטה', 'right'],
  ['block', 'BLOCK', 'הגנה', 'bottom'],
];

// short haptic tick on Android (browsers only allow it after a real tap)
const buzz = () => { try { if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(8); } catch { /* not supported */ } };

export class TouchControls {
  constructor(root) {
    this.state = { left: false, right: false, up: false, down: false, punch: false, kick: false, block: false, special: false, confirm: false, back: false, pause: false };
    this.el = document.createElement('div');
    this.el.id = 'touch';
    this.el.innerHTML = `
      <div class="tc-zone"><div class="tc-stick"><div class="tc-knob"></div></div></div>
      <div class="tc-pad">${ACTIONS.map(([k, en, he, area]) => `<button class="tc-btn tc-${k}" data-k="${k}" style="grid-area:${area}" aria-label="${en}"><b>${en}</b><i dir="rtl">${he}</i></button>`).join('')}</div>
      <div class="tc-top">
        <button class="tc-mini" data-k="pause" aria-label="Pause">❚❚</button>
        <button class="tc-mini tc-fs" aria-label="Fullscreen">⛶</button>
      </div>`;
    root.appendChild(this.el);
    this.stick = this.el.querySelector('.tc-stick');
    this.knob = this.el.querySelector('.tc-knob');
    this.zone = this.el.querySelector('.tc-zone');
    this.special = this.el.querySelector('.tc-special');
    this.wireStick();
    this.el.querySelectorAll('[data-k]').forEach((b) => this.wireButton(b, b.dataset.k));
    this.el.querySelector('.tc-fs').addEventListener('click', () => this.toggleFullscreen());
    this.visible = false;
  }

  wireButton(btn, key) {
    const on = (e) => {
      e.preventDefault();
      try { btn.setPointerCapture(e.pointerId); } catch { /* old browsers */ }
      this.state[key] = true; btn.classList.add('down'); buzz();
    };
    const off = () => { this.state[key] = false; btn.classList.remove('down'); };
    btn.addEventListener('pointerdown', on);
    btn.addEventListener('pointerup', off);
    btn.addEventListener('pointercancel', off);
    btn.addEventListener('lostpointercapture', off);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Floating joystick: it re-centers wherever the thumb lands in the left zone.
  wireStick() {
    let id = null, cx = 0, cy = 0;
    const R = 52;
    const set = (dx, dy) => {
      const len = Math.hypot(dx, dy), k = len > R ? R / len : 1;
      this.knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
      const nx = dx / R, ny = dy / R;
      this.state.left = nx < -0.35; this.state.right = nx > 0.35;
      this.state.up = ny < -0.5; this.state.down = ny > 0.5;
    };
    const release = () => {
      id = null; set(0, 0);
      this.stick.style.left = ''; this.stick.style.top = '';
      this.stick.classList.remove('active');
    };
    this.zone.addEventListener('pointerdown', (e) => {
      if (id !== null) return;
      e.preventDefault();
      id = e.pointerId;
      try { this.zone.setPointerCapture(id); } catch { /* old browsers */ }
      const r = this.zone.getBoundingClientRect();
      cx = e.clientX; cy = e.clientY;
      this.stick.style.left = `${cx - r.left}px`; this.stick.style.top = `${cy - r.top}px`;
      this.stick.classList.add('active');
      set(0, 0);
    });
    this.zone.addEventListener('pointermove', (e) => { if (e.pointerId === id) set(e.clientX - cx, e.clientY - cy); });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      this.zone.addEventListener(ev, (e) => { if (e.pointerId === id) release(); });
    }
    this.release = release;
  }

  async toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else {
        await document.documentElement.requestFullscreen();
        await screen.orientation?.lock?.('landscape').catch(() => {});
      }
    } catch { /* fullscreen not allowed here */ }
  }

  show(on) {
    if (on === this.visible) return;
    this.visible = on;
    this.el.classList.toggle('on', on);
    if (!on) {
      for (const k in this.state) this.state[k] = false;
      this.el.querySelectorAll('.down').forEach((b) => b.classList.remove('down'));
      this.release?.();
    }
  }

  setSpecialReady(ready) { this.special.classList.toggle('ready', ready); }
}
