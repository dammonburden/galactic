import { TOWERS, WEAPONS, ENEMIES, BOSS, MEGA_BOSS } from './data.js';
import { clamp, dist2, rng, hsl } from './utils.js';

const $ = (id) => document.getElementById(id);
const c = $('c');
const ctx = c.getContext('2d', { alpha: false, desynchronized: true });
const menu = $('menu');
const tl = $('tl');
const wl = $('wl');
const tc = $('tc');
const wc = $('wc');
const start = $('start');
const rand = $('rand');
const preset = $('preset');
const ts = $('ts');
const ws = $('ws');
const speed = $('speed');
const upB = $('up');
const tip = $('tip');
const note = $('note');
const sig = $('sig');
const sgn = $('sgn');
const waveE = $('wave');
const crE = $('cr');
const coreE = $('core');
const scE = $('sc');
const hint = $('hint');
const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td', 'Qad', 'Qid', 'Sxd', 'Spd', 'Ocd', 'Nod', 'Vg', 'Uv', 'Dv', 'Tv', 'Qav', 'Qiv', 'Sxv', 'Spv', 'Ocv', 'Nov', 'Tg'];
const fmt = (v) => {
  if (!Number.isFinite(v)) return '∞';
  const sign = v < 0 ? '-' : '';
  const n0 = Math.abs(v);
  if (n0 < 1000) return `${sign}${Math.floor(n0)}`;
  const e = Math.floor(Math.log10(n0) / 3);
  if (e < SUFFIXES.length) {
    const scale = 10 ** (e * 3);
    const n = n0 / scale;
    const digits = n >= 100 ? 0 : n >= 10 ? 1 : 2;
    return `${sign}${n.toFixed(digits)}${SUFFIXES[e]}`;
  }
  return `${sign}${n0.toExponential(2)}`;
};

addEventListener('contextmenu', (e) => e.preventDefault());

let selT = [0, 1, 3, 8];
let selW = [0, 1, 2];
let st = 0;
let sw = 0;
let paused = 0;

const T = TOWERS;
const W = WEAPONS;
const E = ENEMIES;

function mkBtns(el, arr, k) {
  let s = '';
  for (let i = 0; i < arr.length; i++) {
    const x = arr[i];
    s += `<button data-k=${k} data-i=${i}><span>${x.i}</span><b>${x.n}</b><i>${x.c}</i></button>`;
  }
  el.innerHTML = s;
}

mkBtns(tl, T, 't');
mkBtns(wl, W, 'w');

function applySel() {
  for (let i = 0; i < tl.children.length; i++) {
    const b = tl.children[i];
    b.classList.toggle('sel', selT.indexOf(i) >= 0);
  }
  for (let i = 0; i < wl.children.length; i++) {
    const b = wl.children[i];
    b.classList.toggle('sel', selW.indexOf(i) >= 0);
  }
  tc.textContent = `${selT.length}/4`;
  wc.textContent = `${selW.length}/3`;
  start.disabled = !(selT.length === 4 && selW.length === 3);
  mkBar();
}

function togglePick(kind, i) {
  if (kind === 't') {
    const j = selT.indexOf(i);
    if (j >= 0) selT.splice(j, 1);
    else if (selT.length < 4) selT.push(i);
  } else {
    const j = selW.indexOf(i);
    if (j >= 0) selW.splice(j, 1);
    else if (selW.length < 3) selW.push(i);
  }
  applySel();
}

menu.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-k]');
  if (!b) return;
  togglePick(b.dataset.k, +b.dataset.i);
});

preset.onclick = () => {
  selT = [0, 1, 3, 8];
  selW = [0, 1, 2];
  applySel();
};

rand.onclick = () => {
  let a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  selT = a.slice(0, 4);
  a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  selW = a.slice(0, 3);
  applySel();
};

let dpr = 1;
let w = 0;
let h = 0;
let cx = 0;
let cy = 0;
const ps = 720;
const px = new Float32Array(ps);
const py = new Float32Array(ps);
let bg;
let bgctx;
let tSpr = [];
let wSpr = [];
let eSpr = [];
let bSpr;
let megaSpr;

function shape(g, k, x, y, r) {
  const m = k % 8;
  g.beginPath();
  if (m === 0) g.arc(x, y, r, 0, 6.283);
  else if (m === 1) {
    for (let i = 0; i < 6; i++) {
      const a = i * 1.0472;
      const px0 = x + Math.cos(a) * r;
      const py0 = y + Math.sin(a) * r;
      i ? g.lineTo(px0, py0) : g.moveTo(px0, py0);
    }
    g.closePath();
  } else if (m === 2) {
    for (let i = 0; i < 3; i++) {
      const a = -1.5708 + i * 2.0944;
      const px0 = x + Math.cos(a) * r;
      const py0 = y + Math.sin(a) * r;
      i ? g.lineTo(px0, py0) : g.moveTo(px0, py0);
    }
    g.closePath();
  } else if (m === 3) {
    const rr = r * 0.5;
    g.moveTo(x - r + rr, y - r);
    g.arcTo(x + r, y - r, x + r, y + r, rr);
    g.arcTo(x + r, y + r, x - r, y + r, rr);
    g.arcTo(x - r, y + r, x - r, y - r, rr);
    g.arcTo(x - r, y - r, x + r, y - r, rr);
    g.closePath();
  } else if (m === 4) {
    for (let i = 0; i < 5; i++) {
      let a = -1.5708 + i * 1.2566;
      const px0 = x + Math.cos(a) * r;
      const py0 = y + Math.sin(a) * r;
      i ? g.lineTo(px0, py0) : g.moveTo(px0, py0);
      a += 0.6283;
      g.lineTo(x + Math.cos(a) * r * 0.46, y + Math.sin(a) * r * 0.46);
    }
    g.closePath();
  } else if (m === 5) {
    g.moveTo(x, y - r);
    g.bezierCurveTo(x + r, y - r, x + r, y + r, x, y + r);
    g.bezierCurveTo(x - r, y + r, x - r, y - r, x, y - r);
    g.closePath();
  } else if (m === 6) {
    for (let i = 0; i < 4; i++) {
      const a = 0.7854 + i * 1.5708;
      const px0 = x + Math.cos(a) * r;
      const py0 = y + Math.sin(a) * r;
      i ? g.lineTo(px0, py0) : g.moveTo(px0, py0);
    }
    g.closePath();
  } else {
    for (let i = 0; i < 7; i++) {
      const a = -1.5708 + i * 0.8976;
      const px0 = x + Math.cos(a) * r;
      const py0 = y + Math.sin(a) * r;
      i ? g.lineTo(px0, py0) : g.moveTo(px0, py0);
    }
    g.closePath();
  }
}

function mkSpr(out, items, sz, ofs, shade) {
  out.length = 0;
  for (let i = 0; i < items.length; i++) {
    const cv = document.createElement('canvas');
    const S = (sz * dpr) | 0;
    cv.width = S;
    cv.height = S;
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const h0 = (i * 33 + ofs) % 360;
    const x = sz * 0.5;
    const y = sz * 0.5;
    const r = sz * 0.46;
    const gr = g.createRadialGradient(x, y, 0, x, y, sz * 0.6);
    gr.addColorStop(0, hsl(h0, 92, 62, 0.32));
    gr.addColorStop(0.55, hsl(h0, 92, 54, 0.16));
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, sz, sz);
    g.fillStyle = hsl(h0, 92, 56, shade);
    shape(g, i, x, y, r);
    g.fill();
    g.strokeStyle = hsl(h0, 92, 72, 0.26);
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = 'rgba(0,0,0,.22)';
    g.beginPath();
    g.arc(x, y, r * 0.82, 0, 6.283);
    g.fill();
    g.font = `${sz * 0.56}px system-ui,Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = 'rgba(240,255,255,.98)';
    g.fillText(items[i].i, x, y + 1);
    out.push(cv);
  }
}

function mkBoss(boss) {
  const cv = document.createElement('canvas');
  const sz = 80;
  const S = (sz * dpr) | 0;
  cv.width = S;
  cv.height = S;
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const x = sz * 0.5;
  const y = sz * 0.5;
  const r = sz * 0.46;
  const gr = g.createRadialGradient(x, y, 0, x, y, sz * 0.6);
  gr.addColorStop(0, 'rgba(255,200,120,.45)');
  gr.addColorStop(0.6, 'rgba(255,140,60,.18)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, sz, sz);
  g.fillStyle = boss === MEGA_BOSS ? 'rgba(255,110,120,.85)' : 'rgba(255,170,80,.85)';
  shape(g, 7, x, y, r);
  g.fill();
  g.strokeStyle = boss === MEGA_BOSS ? 'rgba(255,120,160,.6)' : 'rgba(255,210,150,.5)';
  g.lineWidth = 3;
  g.stroke();
  g.font = `${sz * 0.56}px system-ui,Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(255,255,255,.98)';
  g.fillText(boss.i, x, y + 1);
  return cv;
}

function mkPath() {
  const mr = Math.min(w, h) * 0.46;
  const ir = mr * 0.12;
  const tz = 12 * Math.PI;
  for (let i = 0; i < ps; i++) {
    const t = i / (ps - 1);
    const a = t * tz;
    const r = mr * (1 - t) + ir * t;
    px[i] = cx + Math.cos(a) * r;
    py[i] = cy + Math.sin(a) * r;
  }
}

function mkBg() {
  bg = document.createElement('canvas');
  bg.width = (w * dpr) | 0;
  bg.height = (h * dpr) | 0;
  bgctx = bg.getContext('2d', { alpha: false });
  bgctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const g0 = bgctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.8);
  g0.addColorStop(0, '#08122a');
  g0.addColorStop(0.55, '#040711');
  g0.addColorStop(1, '#000');
  bgctx.fillStyle = g0;
  bgctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 1400; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const a = rng();
    const s = rng() < 0.9 ? 1 : 2;
    bgctx.globalAlpha = 0.15 + 0.75 * a;
    bgctx.fillStyle = a > 0.7 ? '#cfefff' : a > 0.35 ? '#9cc8ff' : '#fff';
    bgctx.fillRect(x, y, s, s);
  }
  bgctx.globalAlpha = 1;
  bgctx.lineWidth = 2;
  bgctx.strokeStyle = 'rgba(140,220,255,.16)';
  bgctx.beginPath();
  bgctx.moveTo(px[0], py[0]);
  for (let i = 1; i < ps; i++) bgctx.lineTo(px[i], py[i]);
  bgctx.stroke();
  bgctx.fillStyle = 'rgba(180,255,255,.1)';
  for (let i = 0; i < ps; i += 36) {
    bgctx.beginPath();
    bgctx.arc(px[i], py[i], 2, 0, 6.283);
    bgctx.fill();
  }
  const cr = Math.min(w, h) * 0.12;
  const cg = bgctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
  cg.addColorStop(0, 'rgba(160,255,255,.2)');
  cg.addColorStop(1, 'rgba(160,255,255,0)');
  bgctx.fillStyle = cg;
  bgctx.beginPath();
  bgctx.arc(cx, cy, cr, 0, 6.283);
  bgctx.fill();
  bgctx.strokeStyle = 'rgba(200,255,255,.16)';
  bgctx.lineWidth = 2;
  bgctx.beginPath();
  bgctx.arc(cx, cy, cr, 0, 6.283);
  bgctx.stroke();
}

function resize() {
  dpr = devicePixelRatio || 1;
  w = innerWidth;
  h = innerHeight;
  c.width = (w * dpr) | 0;
  c.height = (h * dpr) | 0;
  cx = w * 0.5;
  cy = h * 0.5;
  mkPath();
  mkBg();
  mkSpr(tSpr, T, 54, 10, 0.9);
  mkSpr(wSpr, W, 42, 180, 0.86);
  mkSpr(eSpr, E, 46, 300, 0.9);
  bSpr = mkBoss(BOSS);
  megaSpr = mkBoss(MEGA_BOSS);
}

addEventListener('resize', resize, { passive: true });

let tn = 0;
let en = 0;
let fn = 0;
const MT = 1200;
const ME = 9000;
const MF = 4000;
const tx = new Float32Array(MT);
const ty = new Float32Array(MT);
const tt = new Uint8Array(MT);
const tw = new Uint8Array(MT);
const tier = new Uint8Array(MT);
const heat = new Float32Array(MT);
const cd = new Float32Array(MT);
const bx = new Float32Array(MT);
const by = new Float32Array(MT);
const bt = new Float32Array(MT);
const thp = new Float32Array(MT);
const ep = new Float32Array(ME);
const ex = new Float32Array(ME);
const ey = new Float32Array(ME);
const et = new Uint8Array(ME);
const ec = new Float32Array(ME);
const ehu = new Float32Array(ME);
const eh = new Float32Array(ME);
const es = new Float32Array(ME);
const eb = new Float32Array(ME);
const ek = new Float32Array(ME);
const eboss = new Uint8Array(ME);
const fp = new Float32Array(MF);
const fs = new Float32Array(MF);
const fd = new Float32Array(MF);
const fl = new Float32Array(MF);
const fcd = new Float32Array(MF);

let wave = 1;
let wait = 1.4;
let money = 220;
let bank = 0;
let core = 50;
let dead = 0;
let sel = -1;
let lt = 0;
let best = 1;
let mx = 0;
let my = 0;
let hoverT = -1;
let hoverE = -1;
let noteT = 0;
let pendingPacks = 0;
let spawnTick = 0;
let bossPending = 0;
let megaPending = 0;
let timeScale = 1;
let speedIdx = 0;
let sigStep = 0;
const use = new Uint16Array(10);
const toInt = (v) => Math.max(0, Math.floor(v));

function mkBar() {
  let s = '';
  for (let i = 0; i < selT.length; i++) {
    const tower = T[selT[i]];
    s += `<button data-i=${i} class=${i === st ? 'on' : ''} data-tip="${tower.i} ${tower.n}<br>Chassis cost ${tower.c}c">${tower.i}</button>`;
  }
  ts.innerHTML = s;
  s = '';
  for (let i = 0; i < selW.length; i++) {
    const weapon = W[selW[i]];
    s += `<button data-i=${i} class=${i === sw ? 'on' : ''} data-tip="${weapon.i} ${weapon.n}<br>Weapon cost ${weapon.c}c">${weapon.i}</button>`;
  }
  ws.innerHTML = s;
  if (sel >= 0) {
    const t = tier[sel];
    const ch = T[tt[sel]];
    const we = W[tw[sel]];
    const base = ch.c + we.c * 0.72;
    const cost = (base * (0.58 + 0.62 * t) * (1 + 0.03 * wave)) | 0;
    const nextTier = t + 1;
    let tipText = `Upgrade to Tier ${nextTier} — Cost ${fmt(cost)}c`;
    if (t >= 9) tipText += ' (Max level)';
    else if (money < cost) tipText += ` (Need ${fmt(cost - money)} more credits)`;
    upB.title = tipText;
    upB.disabled = t >= 9 || money < cost;
  } else {
    upB.disabled = true;
    upB.title = '';
  }
  upB.disabled = !(sel >= 0 && tier[sel] < 100);
  hint.textContent = dead
    ? 'Run ended. Restart from menu with R.'
    : paused
      ? 'Paused. Space to resume.'
      : sel >= 0
        ? `Selected: ${T[tt[sel]].n} + ${W[tw[sel]].n} Tier ${tier[sel]} (U to upgrade, right click sell)`
        : `Click to place ${T[selT[st]].n} with ${W[selW[sw]].n}.`;
}

ts.onclick = (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  st = +b.dataset.i;
  mkBar();
};

ws.onclick = (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  sw = +b.dataset.i;
  mkBar();
};

function updBest() {
  if (wave > best) best = wave;
}

function resetRun() {
  tn = 0;
  en = 0;
  fn = 0;
  wave = 1;
  wait = 1.4;
  money = 220;
  bank = 0;
  core = 50;
  dead = 0;
  sel = -1;
  hoverT = -1;
  hoverE = -1;
  paused = 0;
  noteT = 0;
  pendingPacks = 0;
  spawnTick = 0;
  bossPending = 0;
  megaPending = 0;
  timeScale = 1;
  sigStep = 0;
  note.classList.remove('show');
  note.textContent = '';
  setSpeed(0);
  mkBar();
}

function waveBudget() {
  return wave < 2 ? 16 : Math.min(240, 16 + wave * 3.2);
}

function spawnPack(isBoss) {
  if (en >= ME - 2) return;
  const k = (rng() * E.length) | 0;
  const e = isBoss === 2 ? MEGA_BOSS : isBoss ? BOSS : E[k];
  const base = waveBudget();
  const cnt = isBoss ? 1 : Math.max(1, (base * e.c * (0.75 + rng() * 0.55)) | 0);
  const hpU = (1.8 + wave * 0.16) * e.hp * (0.78 + rng() * 0.55);
  const sp = (0.03 + wave * 0.0001) * e.sp * (0.92 + rng() * 0.16);
  const b = (0.14 + wave * 0.0012) * e.b;
  const i = en++;
  ep[i] = 0;
  es[i] = sp;
  et[i] = k;
  ec[i] = cnt;
  ek[i] = e.core;
  ehu[i] = hpU;
  eh[i] = hpU * cnt;
  eb[i] = b;
  eboss[i] = isBoss ? isBoss : 0;
}

function spawnWave() {
  const packs = 4 + Math.min(6, (wave / 3) | 0);
  pendingPacks = packs;
  spawnTick = 0;
  bossPending = wave % 5 === 0 ? 1 : 0;
  megaPending = wave % 10 === 0 ? 1 : 0;
  if (megaPending) {
    showNote(`Wave ${wave}: abyss titan inbound`);
  } else {
    showNote(bossPending ? `Wave ${wave}: boss incoming` : `Wave ${wave} inbound`);
  }
}

function dmgPack(i, dm) {
  const h = eh[i] - dm;
  if (h <= 0) {
    money = toInt(money + ec[i] * eb[i]);
    eh[i] = 0;
    ec[i] = 0;
    en--;
    if (i !== en) {
      ep[i] = ep[en];
      ex[i] = ex[en];
      ey[i] = ey[en];
      et[i] = et[en];
      ec[i] = ec[en];
      ehu[i] = ehu[en];
      eh[i] = eh[en];
      es[i] = es[en];
      eb[i] = eb[en];
      ek[i] = ek[en];
      eboss[i] = eboss[en];
    }
    return;
  }
  const before = ec[i];
  const nc = Math.ceil(h / ehu[i]);
  if (nc < before) money = toInt(money + (before - nc) * eb[i]);
  ec[i] = nc;
  eh[i] = h;
}

function place(x, y, ti, wi) {
  if (dead || paused || tn >= MT) return;
  x = clamp(x, 14, w - 14);
  y = clamp(y, 14, h - 14);
  const ch = T[ti];
  const we = W[wi];
  const cost = (ch.c + we.c * 0.72) | 0;
  if (money < cost) return;
  for (let i = 0; i < tn; i++) if (dist2(x, y, tx[i], ty[i]) < 900) return;
  money = Math.max(0, money - cost);
  const i = tn++;
  tx[i] = x;
  ty[i] = y;
  tt[i] = ti;
  tw[i] = wi;
  tier[i] = 1;
  heat[i] = 0;
  cd[i] = 0;
  bt[i] = 0;
  thp[i] = 100;
}

function pickTower(x, y) {
  for (let i = tn - 1; i >= 0; i--) {
    const r = 16 + tier[i] * 1.5;
    if (dist2(x, y, tx[i], ty[i]) < r * r) return i;
  }
  return -1;
}

function sell(i) {
  if (i < 0 || i >= tn || dead || paused) return;
  const ch = T[tt[i]];
  const we = W[tw[i]];
  const base = ch.c + we.c * 0.72;
  const val = base * (0.85 + 0.35 * tier[i]) * 0.62;
  money = toInt(money + val);
  tn--;
  if (i !== tn) {
    tx[i] = tx[tn];
    ty[i] = ty[tn];
    tt[i] = tt[tn];
    tw[i] = tw[tn];
    tier[i] = tier[tn];
    heat[i] = heat[tn];
    cd[i] = cd[tn];
    bx[i] = bx[tn];
    by[i] = by[tn];
    bt[i] = bt[tn];
    thp[i] = thp[tn];
    if (sel === tn) sel = i;
  }
  if (sel === i) sel = -1;
  mkBar();
}

function upgrade(i) {
  if (i < 0 || i >= tn || dead || paused) return;
  const t = tier[i];
  if (t >= 100) return;
  const ch = T[tt[i]];
  const we = W[tw[i]];
  const base = ch.c + we.c * 0.72;
  const cost = (base * (0.58 + 0.62 * t) * (1 + 0.03 * wave)) | 0;
  if (money < cost) return;
  money = Math.max(0, money - cost);
  tier[i] = t + 1;
  heat[i] *= 0.82;
  mkBar();
}

function spawnFriendly(x, y, amt) {
  if (fn >= MF - 2) return;
  const i = fn++;
  fp[i] = 0;
  fs[i] = 0.11 + amt * 0.002;
  fd[i] = 8 + amt * 1.2;
  fl[i] = 180 + amt * 12;
  fcd[i] = 0;
}

function ui() {
  waveE.textContent = wave;
  crE.textContent = fmt(money);
  coreE.textContent = Math.max(0, core | 0);
  scE.textContent = best;
}

function showNote(text, time = 2.2) {
  note.textContent = text;
  note.classList.add('show');
  noteT = time;
}

function setSpeed(idx) {
  speedIdx = Math.max(0, Math.min(3, idx));
  timeScale = [1, 5, 50, 500][speedIdx] || 1;
  [...speed.children].forEach((btn, i) => btn.classList.toggle('on', i === speedIdx));
}

function showTip() {
  if (menu.style.display !== 'none' || dead) {
    tip.style.opacity = 0;
    return;
  }
  tip.classList.remove('panel');
  const x = mx;
  const y = my;
  if (hoverT >= 0) {
    const i = hoverT;
    const extra = T[tt[i]].spawn ? ' Spawner' : '';
    tip.innerHTML = `${T[tt[i]].i} ${T[tt[i]].n}${extra}<br>${W[tw[i]].i} ${W[tw[i]].n}<br>Tier ${tier[i]} | Integrity ${thp[i] | 0}`;
    tip.style.left = `${x + 14}px`;
    tip.style.top = `${y + 14}px`;
    tip.style.opacity = 1;
    return;
  }
  if (hoverE >= 0) {
    const i = hoverE;
    const bossType = eboss[i];
    const name = bossType === 2 ? MEGA_BOSS.n : bossType ? BOSS.n : E[et[i]].n;
    const icon = bossType === 2 ? MEGA_BOSS.i : bossType ? BOSS.i : E[et[i]].i;
    tip.innerHTML = `${icon} ${name}<br>HP ${fmt(eh[i])} | Count ${fmt(ec[i])}`;
    tip.style.left = `${x + 14}px`;
    tip.style.top = `${y + 14}px`;
    tip.style.opacity = 1;
    return;
  }
  tip.style.opacity = 0;
}

function hoverScan() {
  hoverT = pickTower(mx, my);
  hoverE = -1;
  if (hoverT < 0 && en) {
    let bestHit = -1;
    let bd = 1e9;
    for (let i = 0; i < en; i++) {
      const cnt = ec[i];
      if (cnt <= 0) continue;
      let s = 14 + Math.log1p(cnt) * 2.2;
      if (s > 56) s = 56;
      const d = dist2(mx, my, ex[i], ey[i]);
      if (d < s * s && d < bd) {
        bd = d;
        bestHit = i;
      }
    }
    hoverE = bestHit;
  }
  showTip();
}

function upd(dt) {
  if (wait > 0) {
    wait -= dt;
    if (wait <= 0) spawnWave();
  }
  if (pendingPacks > 0 || bossPending) {
    spawnTick -= dt;
    if (spawnTick <= 0) {
      if (pendingPacks > 0) {
        spawnPack(0);
        pendingPacks--;
        spawnTick = 0.28;
      } else if (bossPending) {
        spawnPack(1);
        bossPending = 0;
        if (megaPending) spawnTick = 0.6;
      }
    }
  }
  if (megaPending && pendingPacks === 0 && bossPending === 0) {
    spawnTick -= dt;
    if (spawnTick <= 0) {
      spawnPack(2);
      megaPending = 0;
      spawnTick = 0.6;
    }
  }
  if (noteT > 0) {
    noteT -= dt;
    if (noteT <= 0) note.classList.remove('show');
  }
  for (let i = 0; i < en; ) {
    ep[i] += es[i] * dt;
    if (ep[i] >= 1) {
      const dmgC = Math.max(1, (ec[i] * ek[i]) / 2400) | 0;
      core = Math.max(0, core - dmgC);
      en--;
      if (i !== en) {
        ep[i] = ep[en];
        et[i] = et[en];
        ec[i] = ec[en];
        ehu[i] = ehu[en];
        eh[i] = eh[en];
        es[i] = es[en];
        eb[i] = eb[en];
        ek[i] = ek[en];
        eboss[i] = eboss[en];
      }
      continue;
    }
    const u = ep[i] * (ps - 1);
    let j = u | 0;
    let f = u - j;
    if (j >= ps - 1) {
      j = ps - 2;
      f = 1;
    }
    ex[i] = px[j] + (px[j + 1] - px[j]) * f;
    ey[i] = py[j] + (py[j + 1] - py[j]) * f;
    i++;
  }
  for (let i = 0; i < use.length; i++) use[i] = 0;
  for (let i = 0; i < tn; i++) use[tw[i]]++;
  for (let i = 0; i < tn; i++) {
    bt[i] = Math.max(0, bt[i] - dt);
    cd[i] = Math.max(0, cd[i] - dt);
    heat[i] = Math.max(0, heat[i] - dt * 1.3);
    const ch = T[tt[i]];
    const we = W[tw[i]];
    const t = tier[i];
    const x = tx[i];
    const y = ty[i];
    if (ch.spawn && cd[i] <= 0) {
      const amt = 2 + t * 1.2;
      spawnFriendly(x, y, amt);
      cd[i] = 2.2 / (1 + 0.06 * (t - 1));
    }
    if (cd[i] > 0) continue;
    const range = (ch.r + we.r) * 0.53 * ch.rm * (1 + 0.055 * (t - 1));
    const r2 = range * range;
    let tar = -1;
    let bp = -1;
    for (let k = en - 1; k >= 0; k--) {
      if (ec[k] <= 0) continue;
      const dx = ex[k] - x;
      const dy = ey[k] - y;
      if (dx * dx + dy * dy < r2) {
        const p = ep[k];
        if (p > bp) {
          bp = p;
          tar = k;
        }
      }
    }
    if (tar < 0) continue;
    const sat = 1 / (1 + 0.18 * Math.max(0, use[tw[i]] - 1));
    const eff = 1 / (1 + Math.max(0, heat[i] - 1.15) * 1.0);
    const dmg0 = we.d * ch.fr * (1 + 0.18 * (t - 1)) * sat * eff;
    heat[i] += we.h * 0.18;
    cd[i] = 1 / (we.f * ch.fr * (1 + 0.06 * (t - 1)));
    const tx0 = ex[tar];
    const ty0 = ey[tar];
    bx[i] = tx0;
    by[i] = ty0;
    bt[i] = 0.085;
    dmgPack(tar, dmg0);
    if (we.ao) {
      const ar = range * we.ao;
      const ar2 = ar * ar;
      for (let j = 0; j < en; j++) {
        if (j === tar || ec[j] <= 0) continue;
        const dx = ex[j] - tx0;
        const dy = ey[j] - ty0;
        if (dx * dx + dy * dy < ar2) dmgPack(j, dmg0 * 0.42);
      }
    }
    if (we.ch) {
      let k = we.ch;
      let fall = 0.26;
      for (let j = 0; j < en && k; j++) {
        if (j === tar || ec[j] <= 0) continue;
        const dx = ex[j] - tx0;
        const dy = ey[j] - ty0;
        if (dx * dx + dy * dy < range * range * 0.62) {
          dmgPack(j, dmg0 * fall);
          fall *= 0.72;
          k--;
        }
      }
    }
  }
  for (let i = 0; i < fn; ) {
    fp[i] += fs[i] * dt;
    fl[i] -= dt * 60;
    fcd[i] -= dt;
    if (fp[i] >= 1 || fl[i] <= 0) {
      fn--;
      if (i !== fn) {
        fp[i] = fp[fn];
        fs[i] = fs[fn];
        fd[i] = fd[fn];
        fl[i] = fl[fn];
        fcd[i] = fcd[fn];
      }
      continue;
    }
    const u = fp[i] * (ps - 1);
    let j = u | 0;
    let f = u - j;
    if (j >= ps - 1) {
      j = ps - 2;
      f = 1;
    }
    const x = px[j] + (px[j + 1] - px[j]) * f;
    const y = py[j] + (py[j + 1] - py[j]) * f;
    if (fcd[i] <= 0) {
      let hit = -1;
      let bd = 1e9;
      for (let j = 0; j < en; j++) {
        if (ec[j] <= 0) continue;
        const d = dist2(x, y, ex[j], ey[j]);
        if (d < 1200 && d < bd) {
          bd = d;
          hit = j;
        }
      }
      if (hit >= 0) {
        dmgPack(hit, fd[i]);
        fcd[i] = 0.4;
      }
    }
    fd[i] += dt * 0.4;
    i++;
  }
  if (en === 0 && wait <= 0) {
    updBest();
    bank = toInt(money);
    money = toInt(bank * 1.2);
    showNote(`Wave ${wave} cleared +20% bank`);
    wave++;
    wait = 1.6;
  }
  if (core <= 0 && !dead) {
    dead = 1;
    mkBar();
    tip.style.opacity = 0;
  }
}

function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.drawImage(bg, 0, 0, w, h);
  for (let i = 0; i < en; i++) {
    const cnt = ec[i];
    if (cnt <= 0) continue;
    let size = 14 + Math.log1p(cnt) * 2.2;
    if (size > 60) size = 60;
    let n = 1 + ((Math.log1p(cnt) * 1.15) | 0);
    if (n > 10) n = 10;
    const rr = size * 0.28;
    const ph = i * 0.41;
    const spr = eboss[i] === 2 ? megaSpr : eboss[i] ? bSpr : eSpr[et[i] % eSpr.length];
    for (let j = 0; j < n; j++) {
      const a = ph + (j * 6.283) / n;
      ctx.drawImage(spr, ex[i] - size * 0.5 + Math.cos(a) * rr, ey[i] - size * 0.5 + Math.sin(a) * rr, size, size);
    }
    const max = ec[i] * ehu[i];
    const p = max > 0 ? eh[i] / max : 0;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.fillRect(ex[i] - 22, ey[i] - 36, 44, 5);
    ctx.fillStyle = eboss[i] ? 'rgba(255,190,100,.9)' : 'rgba(255,120,120,.9)';
    ctx.fillRect(ex[i] - 22, ey[i] - 36, 44 * p, 5);
    ctx.globalAlpha = 1;
  }
  for (let i = 0; i < fn; i++) {
    const u = fp[i] * (ps - 1);
    let j = u | 0;
    let f = u - j;
    if (j >= ps - 1) {
      j = ps - 2;
      f = 1;
    }
    const x = px[j] + (px[j + 1] - px[j]) * f;
    const y = py[j] + (py[j + 1] - py[j]) * f;
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = 'rgba(160,240,255,.9)';
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, 6.283);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  for (let i = 0; i < tn; i++) {
    const ch = tt[i];
    const we = tw[i];
    const t = tier[i];
    const x = tx[i];
    const y = ty[i];
    const sz = 26 + Math.min(20, t * 2);
    const s2 = sz * 0.62;
    ctx.drawImage(tSpr[ch], x - sz * 0.5, y - sz * 0.5, sz, sz);
    ctx.globalAlpha = 0.98;
    ctx.drawImage(wSpr[we], x - s2 * 0.5, y - s2 * 0.5, s2, s2);
    ctx.globalAlpha = 1;
    if (bt[i] > 0) {
      ctx.globalAlpha = Math.min(1, bt[i] * 10);
      ctx.strokeStyle = 'rgba(180,255,255,.8)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(bx[i], by[i]);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (i === sel) {
      ctx.strokeStyle = 'rgba(190,255,255,.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, 6.283);
      ctx.stroke();
    }
  }
  if (!dead && menu.style.display === 'none') {
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = '#bff';
    ctx.fillRect(mx - 10, my - 10, 20, 20);
    ctx.globalAlpha = 1;
  }
}

function loop(t) {
  const raw = Math.min(0.1, (t - lt) / 1000);
  lt = t;
  if (menu.style.display === 'none' && !paused && !dead) {
    let sim = raw * timeScale;
    while (sim > 0) {
      const step = Math.min(0.05, sim);
      upd(step);
      sim -= step;
    }
  }
  draw();
  if (t % 120 < 16) {
    ui();
    mkBar();
  }
  requestAnimationFrame(loop);
}

start.onclick = () => {
  if (!(selT.length === 4 && selW.length === 3)) return;
  menu.style.display = 'none';
  resize();
  resetRun();
  lt = performance.now();
  requestAnimationFrame(loop);
};

upB.onclick = () => {
  if (sel >= 0) upgrade(sel);
};

addEventListener('keydown', (e) => {
  const k = e.key;
  if (k === 'q' || k === 'Q') {
    st = (st + 3) % 4;
    mkBar();
  } else if (k === 'e' || k === 'E') {
    st = (st + 1) % 4;
    mkBar();
  } else if (k >= '1' && k <= '3') {
    sw = k.charCodeAt(0) - 49;
    mkBar();
  } else if (k === ' ') {
    paused = !paused;
    e.preventDefault();
    mkBar();
  } else if (k === 'u' || k === 'U') {
    if (sel >= 0) upgrade(sel);
  } else if (k === 'r' || k === 'R') {
    menu.style.display = 'grid';
    applySel();
    tip.style.opacity = 0;
  } else if (k === '[' || k === '{' || k === '-' || k === '_') {
    setSpeed(speedIdx - 1);
    showNote(`Speed ${timeScale}x`, 1.2);
  } else if (k === ']' || k === '}' || k === '=' || k === '+') {
    setSpeed(speedIdx + 1);
    showNote(`Speed ${timeScale}x`, 1.2);
  }
});

c.addEventListener(
  'pointermove',
  (e) => {
    const r = c.getBoundingClientRect();
    mx = e.clientX - r.left;
    my = e.clientY - r.top;
    if (menu.style.display === 'none') hoverScan();
  },
  { passive: true }
);

c.addEventListener('pointerdown', (e) => {
  if (menu.style.display !== 'none') return;
  const r = c.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  if (e.button === 2) {
    const i = pickTower(x, y);
    if (i >= 0) sell(i);
    return;
  }
  const i = pickTower(x, y);
  if (i >= 0) {
    sel = i;
    mkBar();
    return;
  }
  sel = -1;
  mkBar();
  place(x, y, selT[st], selW[sw]);
});

let panelTipTarget = null;
const showPanelTip = (b) => {
  if (menu.style.display !== 'none' || dead) return;
  if (!b || b === panelTipTarget) return;
  panelTipTarget = b;
  const r = b.getBoundingClientRect();
  tip.innerHTML = b.dataset.tip;
  tip.classList.add('panel');
  tip.style.left = `${r.left + r.width / 2}px`;
  tip.style.top = `${r.top - 8}px`;
  tip.style.opacity = 1;
};

const hidePanelTip = () => {
  panelTipTarget = null;
  tip.classList.remove('panel');
  tip.style.opacity = 0;
};

const handlePanelOver = (e) => {
  const b = e.target.closest('button[data-tip]');
  if (b) showPanelTip(b);
};

const handlePanelOut = (e) => {
  if (!e.relatedTarget || !e.relatedTarget.closest('button[data-tip]')) hidePanelTip();
};

ts.addEventListener('pointerover', handlePanelOver);
ws.addEventListener('pointerover', handlePanelOver);
ts.addEventListener('pointerout', handlePanelOut);
ws.addEventListener('pointerout', handlePanelOut);

speed.innerHTML = ['1x', '5x', '50x', '500x'].map((label, i) => `<button data-i=${i} class=${i === 0 ? 'on' : ''}>${label}</button>`).join('');
speed.onclick = (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const i = +b.dataset.i;
  setSpeed(i);
  showNote(`Speed ${timeScale}x`, 1.4);
};

setSpeed(0);
applySel();
resize();
ui();
mkBar();
setInterval(() => {
  sigStep = (sigStep + 1) % 60;
  sgn.setAttribute('transform', `rotate(${sigStep * 6} 60 60)`);
  sgn.setAttribute('stroke', sigStep % 2 ? '#9ef' : '#7ff');
}, 1000);
requestAnimationFrame(loop);
