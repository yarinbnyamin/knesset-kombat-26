// Everything is synthesized with WebAudio; the announcer uses speechSynthesis.

// E freygish (phrygian dominant): E F G# A B C D
const N = { D2: 73.42, E2: 82.41, F2: 87.31, Gs2: 103.83, A2: 110, B2: 123.47, C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, Gs3: 207.65, A3: 220, B3: 246.94, C4: 261.63, E4: 329.63, F4: 349.23, Gs4: 415.3, A4: 440, B4: 493.88, C5: 523.25 };
const BASS = [
  ['E2', 'E2', 0, 'E2', 'F2', 0, 'E2', 0, 'Gs2', 0, 'F2', 0, 'E2', 0, 'D2', 0],
  ['E2', 'E2', 0, 'E2', 'F2', 0, 'E2', 0, 'Gs2', 'A2', 'Gs2', 'F2', 'E2', 0, 0, 0],
  ['A2', 'A2', 0, 'A2', 'B2', 0, 'A2', 0, 'C3', 0, 'B2', 0, 'A2', 0, 'Gs2', 0],
  ['E2', 'E2', 0, 'F2', 'Gs2', 0, 'A2', 0, 'B2', 'C3', 'B2', 'A2', 'Gs2', 'F2', 'E2', 0],
];
const LEAD = ['E4', 'F4', 'Gs4', 'A4', 'B4', 'C5', 'B4', 'A4', 'Gs4', 'F4', 'E4', 'F4', 'Gs4', 'F4', 'E4', 0];

class Sound {
  constructor() { this.ctx = null; this.muted = false; this.mode = null; }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    this.master = c.createGain(); this.master.gain.value = 0.8;
    this.master.connect(comp); comp.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.gain.value = 1; this.sfx.connect(this.master);
    this.music = c.createGain(); this.music.gain.value = 0.32; this.music.connect(this.master);
    // reverb
    const len = c.sampleRate * 2.4, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    this.verb = c.createConvolver(); this.verb.buffer = ir;
    const vg = c.createGain(); vg.gain.value = 0.5; this.verb.connect(vg); vg.connect(this.master);
    this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const nd = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }

  _env(g, T, vol, attack, dur) {
    g.gain.setValueAtTime(0.0001, T);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), T + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, T + attack + dur);
  }
  _out(g, dest, send) {
    g.connect(dest || this.sfx);
    if (send) { const s = this.ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(this.verb); }
  }
  tone({ type = 'sine', f0 = 440, f1 = 0, dur = 0.2, vol = 0.3, attack = 0.004, t = 0, dest, send = 0, lp = 0 }) {
    const c = this.ctx, T = c.currentTime + Math.max(0, t);
    const o = c.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, T);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, T + dur);
    const g = c.createGain(); this._env(g, T, vol, attack, dur);
    if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); f.connect(g); } else o.connect(g);
    this._out(g, dest, send);
    o.start(T); o.stop(T + attack + dur + 0.05);
  }
  noise({ dur = 0.2, vol = 0.3, type = 'lowpass', f0 = 1000, f1 = 0, q = 1, attack = 0.002, t = 0, dest, send = 0 }) {
    const c = this.ctx, T = c.currentTime + Math.max(0, t);
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, T);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, T + dur);
    const g = c.createGain(); this._env(g, T, vol, attack, dur);
    src.connect(f); f.connect(g); this._out(g, dest, send);
    src.start(T, Math.random() * 0.5); src.stop(T + attack + dur + 0.05);
  }

  play(name, v = 1) {
    if (!this.ctx || this.muted) return;
    const T = (o) => this.tone(o), Nz = (o) => this.noise(o);
    switch (name) {
      case 'hit': Nz({ dur: 0.09, vol: 0.5 * v, f0: 2200, f1: 400 }); T({ f0: 180, f1: 55, dur: 0.12, vol: 0.6 * v }); break;
      case 'heavy':
        Nz({ dur: 0.18, vol: 0.75 * v, f0: 1800, f1: 200, send: 0.2 }); T({ f0: 140, f1: 40, dur: 0.22, vol: 0.85 * v });
        T({ type: 'square', f0: 90, f1: 40, dur: 0.08, vol: 0.15 * v }); break;
      case 'block': T({ type: 'triangle', f0: 1300, f1: 900, dur: 0.07, vol: 0.22 * v }); Nz({ dur: 0.05, vol: 0.2 * v, type: 'highpass', f0: 3000 }); break;
      case 'whoosh': Nz({ dur: 0.14, vol: 0.12 * v, type: 'bandpass', f0: 500, f1: 2200, q: 1.2 }); break;
      case 'jump': Nz({ dur: 0.1, vol: 0.06, type: 'bandpass', f0: 300, f1: 900 }); break;
      case 'land': T({ f0: 90, f1: 50, dur: 0.08, vol: 0.2 }); break;
      case 'body': T({ f0: 110, f1: 35, dur: 0.25, vol: 0.7 }); Nz({ dur: 0.2, vol: 0.4, f0: 600, f1: 100 }); break;
      case 'throw': Nz({ dur: 0.2, vol: 0.16, type: 'bandpass', f0: 400, f1: 2400, q: 1.5 }); T({ type: 'triangle', f0: 300, f1: 700, dur: 0.15, vol: 0.08 }); break;
      case 'coin': T({ type: 'square', f0: 1318, dur: 0.05, vol: 0.06 }); T({ type: 'square', f0: 1760, dur: 0.18, vol: 0.06, t: 0.05 }); break;
      case 'wave': T({ type: 'sawtooth', f0: 220, f1: 80, dur: 0.5, vol: 0.14, lp: 1200, send: 0.3 }); break;
      case 'march': T({ f0: 130, f1: 60, dur: 0.1, vol: 0.6 }); Nz({ dur: 0.06, vol: 0.25, f0: 1500, f1: 300 }); break;
      case 'scream':
        T({ type: 'sawtooth', f0: 700, f1: 1100, dur: 0.5, vol: 0.14, lp: 3200, send: 0.3 });
        T({ type: 'square', f0: 1050, f1: 1500, dur: 0.45, vol: 0.05, lp: 4000 }); break;
      case 'explode': T({ f0: 90, f1: 30, dur: 0.8, vol: 1, send: 0.6 }); Nz({ dur: 0.7, vol: 0.9, f0: 2500, f1: 120, send: 0.5 }); break;
      case 'clang': T({ type: 'triangle', f0: 520, f1: 500, dur: 0.6, vol: 0.3, send: 0.5 }); T({ type: 'square', f0: 1310, f1: 1290, dur: 0.3, vol: 0.06 }); Nz({ dur: 0.08, vol: 0.4, type: 'highpass', f0: 2000 }); break;
      case 'poof': Nz({ dur: 0.35, vol: 0.35, type: 'bandpass', f0: 2500, f1: 400, q: 0.7 }); break;
      case 'snip': Nz({ dur: 0.05, vol: 0.3, type: 'highpass', f0: 4000 }); Nz({ dur: 0.05, vol: 0.3, type: 'highpass', f0: 4500, t: 0.08 }); break;
      case 'cash': [1568, 2093, 2637].forEach((f, i) => T({ type: 'square', f0: f, dur: 0.07, vol: 0.05, t: i * 0.06 })); break;
      case 'powerup': [392, 523, 659, 784, 1047].forEach((f, i) => T({ type: 'triangle', f0: f, dur: 0.12, vol: 0.12, t: i * 0.06, send: 0.3 })); break;
      case 'counter': T({ type: 'triangle', f0: 1760, f1: 1700, dur: 0.5, vol: 0.2, send: 0.5 }); T({ f0: 880, dur: 0.4, vol: 0.2 }); break;
      case 'tung': T({ f0: 480, f1: 300, dur: 0.12, vol: 0.5 }); T({ type: 'triangle', f0: 960, f1: 700, dur: 0.05, vol: 0.15 }); break;
      case 'gavel':
        T({ f0: 120, f1: 40, dur: 0.5, vol: 1, send: 0.5 }); Nz({ dur: 0.25, vol: 0.8, f0: 3000, f1: 300, send: 0.6 });
        T({ type: 'square', f0: 320, f1: 200, dur: 0.05, vol: 0.3 }); T({ type: 'triangle', f0: 640, f1: 500, dur: 0.04, vol: 0.2 }); break;
      case 'boom': T({ f0: 70, f1: 28, dur: 1.2, vol: 1 * v, send: 0.8 }); Nz({ dur: 1.0, vol: 0.6 * v, f0: 800, f1: 60, send: 0.7 }); break;
      case 'thunder': Nz({ dur: 1.8, vol: 0.55, f0: 500, f1: 70, attack: 0.02, send: 0.8 }); Nz({ dur: 0.3, vol: 0.4, f0: 3000, f1: 400, attack: 0.005 }); break;
      case 'splat': Nz({ dur: 0.3, vol: 0.6, type: 'bandpass', f0: 900, f1: 150, q: 0.8 }); T({ f0: 90, f1: 30, dur: 0.4, vol: 0.8 }); break;
      case 'blip': T({ type: 'square', f0: 880, dur: 0.04, vol: 0.05 }); break;
      case 'confirm': T({ type: 'square', f0: 660, dur: 0.08, vol: 0.07 }); T({ type: 'square', f0: 990, dur: 0.14, vol: 0.07, t: 0.07 }); break;
    }
  }

  say(text) {
    if (this.muted || !window.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = 0.1; u.rate = 0.82; u.volume = 1;
      const vs = speechSynthesis.getVoices();
      const v = vs.find((x) => /Daniel|Fred|Alex|UK English Male|Google US English/i.test(x.name)) || vs.find((x) => /^en/i.test(x.lang));
      if (v) u.voice = v;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch { /* speech not available */ }
  }

  startMusic(mode) {
    if (!this.ctx || this.mode === mode) return;
    this.stopMusic();
    this.mode = mode; this.step = 0; this.nextT = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this._sched(), 25);
    if (mode === 'title') {
      const c = this.ctx;
      this.drone = [N.E2, N.B2 * 1.003, N.E3 * 0.997].map((f) => {
        const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
        const flt = c.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 380;
        const g = c.createGain(); g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(0.09, c.currentTime + 2);
        o.connect(flt); flt.connect(g); g.connect(this.music); o.start();
        return { o, g };
      });
    }
  }
  stopMusic() {
    clearInterval(this.timer); this.mode = null;
    if (this.drone) {
      const t = this.ctx.currentTime;
      for (const d of this.drone) { d.g.gain.cancelScheduledValues(t); d.g.gain.setValueAtTime(d.g.gain.value, t); d.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6); d.o.stop(t + 0.7); }
      this.drone = null;
    }
  }
  _sched() {
    const spb = 60 / 132 / 4;
    while (this.nextT < this.ctx.currentTime + 0.15) { this._step(this.step, this.nextT - this.ctx.currentTime, spb); this.nextT += spb; this.step++; }
  }
  _step(s, t, spb) {
    const i = s % 16, bar = Math.floor(s / 16) % 4, dest = this.music;
    const kick = () => this.tone({ f0: 150, f1: 45, dur: 0.18, vol: 0.9, t, dest });
    if (this.mode === 'fight') {
      if (i % 4 === 0 || (bar === 3 && i === 14)) kick();
      if (i === 4 || i === 12) { this.noise({ dur: 0.12, vol: 0.32, type: 'bandpass', f0: 1800, q: 0.7, t, dest }); this.tone({ type: 'triangle', f0: 190, f1: 150, dur: 0.08, vol: 0.14, t, dest }); }
      if (i % 2 === 0) this.noise({ dur: i % 4 === 2 ? 0.08 : 0.03, vol: 0.07, type: 'highpass', f0: 7000, t, dest });
      if ((i === 7 || i === 15) && bar % 2) this.tone({ type: 'triangle', f0: 380, f1: 320, dur: 0.05, vol: 0.12, t, dest }); // darbuka "tek"
      const b = BASS[bar][i];
      if (b) this.tone({ type: 'sawtooth', f0: N[b], dur: spb * 1.6, vol: 0.2, t, dest, lp: 700 });
      if (bar === 3 && LEAD[i]) this.tone({ type: 'square', f0: N[LEAD[i]], dur: spb * 0.9, vol: 0.05, t, dest, send: 0.3, lp: 2500 });
    } else if (this.mode === 'title') {
      if (i === 0 || i === 3) this.tone({ f0: 110, f1: 40, dur: 0.3, vol: 0.7, t, dest, send: 0.3 });
      if (i === 0 && bar === 0) { this.tone({ f0: N.E3, dur: 2.5, vol: 0.12, t, dest, send: 0.7 }); this.tone({ f0: N.E4 * 1.5, dur: 1.8, vol: 0.05, t, dest, send: 0.7 }); }
      if (i === 8 && bar === 2) this.tone({ type: 'triangle', f0: N.Gs3, dur: 1.4, vol: 0.06, t, dest, send: 0.6 });
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.8;
    if (this.muted && window.speechSynthesis) speechSynthesis.cancel();
    return this.muted;
  }
}

export const sound = new Sound();
