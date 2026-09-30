const $ = (s) => document.querySelector(s);

export function show(id) {
  document.querySelectorAll('.screen').forEach((e) => e.classList.toggle('on', e.id === id));
}
export function hud(on) { $('#hud').classList.toggle('on', on); }

let bannerTimer = 0;
export function banner(text, { sub = '', cls = '', dur = 1400 } = {}) {
  const b = $('#banner');
  clearTimeout(bannerTimer);
  if (!text) { b.className = ''; return; }
  b.innerHTML = `<div class="t">${text}</div>${sub ? `<div class="s">${sub}</div>` : ''}`;
  b.className = cls;
  void b.offsetWidth;
  b.classList.add('show');
  if (dur > 0) bannerTimer = setTimeout(() => { b.classList.remove('show'); b.classList.add('hide'); }, dur);
}

export function flash(a = 0.8, ms = 450, color = '#fff') {
  const f = $('#flash');
  f.style.transition = 'none'; f.style.background = color; f.style.opacity = a;
  void f.offsetWidth;
  f.style.transition = `opacity ${ms}ms ease-out`; f.style.opacity = 0;
}

export function hint(t) { const h = $('#hint'); h.innerHTML = t || ''; h.classList.toggle('on', !!t); }

export function setMenu(sel, idx) {
  [...document.querySelectorAll(`${sel} button`)].forEach((c, i) => c.classList.toggle('sel', i === idx));
}

export function buildGrid(roster, locked, portraits, onPick, onHover) {
  const g = $('#grid'); g.innerHTML = '';
  roster.forEach((d, i) => {
    const c = document.createElement('div');
    c.className = 'card'; c.dataset.i = i;
    c.innerHTML = `<img src="${portraits[d.id]}" alt=""><div class="n" dir="rtl">${d.he}</div>`;
    c.addEventListener('mouseenter', () => onHover(i));
    c.addEventListener('click', () => onPick(i));
    g.appendChild(c);
  });
  for (let i = 0; i < locked; i++) {
    const c = document.createElement('div');
    c.className = 'card locked';
    c.innerHTML = `<div class="q">?</div><div class="n">???</div>`;
    g.appendChild(c);
  }
}

export function updateGrid(sel, lockedP, showP2, p2Label) {
  document.querySelectorAll('#grid .card').forEach((c, i) => {
    const s1 = sel[0] === i, s2 = showP2 && sel[1] === i;
    c.classList.toggle('s1', s1); c.classList.toggle('s2', s2);
    c.classList.toggle('lk', (s1 && lockedP[0]) || (s2 && lockedP[1]));
    c.querySelectorAll('.tag').forEach((t) => t.remove());
    if (s1) c.insertAdjacentHTML('beforeend', '<span class="tag tag1">P1</span>');
    if (s2) c.insertAdjacentHTML('beforeend', `<span class="tag tag2">${p2Label}</span>`);
  });
}

export function selName(p, def, locked, label) {
  const el = $(`#selName${p + 1}`);
  if (!def) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="who">${label}${locked ? ' ✓' : ''}</div>
    <div class="he" dir="rtl">${def.he}</div>
    <div class="en">${def.name}${def.tag ? ` · <span>${def.tag}</span>` : ''}</div>
    <div class="spn">SPECIAL · ${def.special.name}</div>
    ${def.special.desc ? `<div class="spd">${def.special.desc}</div>` : ''}`;
}

export function versus(d1, d2, portraits) {
  $('#versus').innerHTML = `
    <div class="vs-card l" style="background-image:url(${portraits[d1.id]})"><div class="nm"><b dir="rtl">${d1.he}</b><i>${d1.name}</i></div></div>
    <div class="vs-mid">VS</div>
    <div class="vs-card r" style="background-image:url(${portraits[d2.id]})"><div class="nm"><b dir="rtl">${d2.he}</b><i>${d2.name}</i></div></div>`;
}

let hudCache = {};
export function setupHud(fighters) {
  hudCache = {};
  fighters.forEach((f, i) => {
    const s = $(`#hud .p${i + 1}`);
    s.querySelector('.nm b').textContent = f.def.he;
    s.querySelector('.nm i').textContent = f.def.name;
  });
}
export function updateHud(fighters, timer, wins) {
  fighters.forEach((f, i) => {
    const s = $(`#hud .p${i + 1}`);
    const pct = Math.max(0, (f.hp / f.maxHp) * 100);
    const key = `${i}:${pct.toFixed(1)}`;
    if (hudCache[i] !== key) {
      hudCache[i] = key;
      s.querySelector('.fill').style.width = pct + '%';
      s.querySelector('.lag').style.width = pct + '%';
      s.querySelector('.fill').classList.toggle('low', pct < 25);
    }
    const sp = f.specialCD > 0 ? 1 - f.specialCD / Math.max(f.specialCD, f.def.special.cd ?? 90) : 1;
    s.querySelector('.meter div').style.width = Math.max(0, Math.min(1, sp)) * 100 + '%';
    s.querySelector('.meter').classList.toggle('ready', sp >= 1);
    const w = s.querySelectorAll('.wins span');
    w.forEach((d, k) => d.classList.toggle('on', k < wins[i]));
  });
  $('#hud .clock span').textContent = Math.max(0, timer);
}

export function results(title, sub) {
  $('#resTitle').innerHTML = title;
  $('#resSub').innerHTML = sub;
}
