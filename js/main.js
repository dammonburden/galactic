import { TOWERS, WEAPONS, ENEMIES, BOSS, MEGA_BOSS, DIFFICULTIES } from './data.js';
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
const diffRow = $('diffRow');
const mapRow = $('mapRow');
const panel = $('panel');
const ts = $('ts');
const ws = $('ws');
const speed = $('speed');
const upB = $('up');
const pauseBtn = $('pauseBtn');
const restartBtn = $('restartBtn');
const tip = $('tip');
const note = $('note');
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
let diff = 2;
let maxWaves = 40;
let mapIdx = 0;

const MAPS = [
  { n: 'Spiral', desc: 'Classic inward spiral' },
  { n: 'Zigzag', desc: 'Sharp switchbacks' },
  { n: 'Figure-8', desc: 'Crossing loops' },
  { n: 'Star', desc: 'Star-shaped orbit' },
  { n: 'Helix', desc: 'Twin drifting coils' },
  { n: 'Diamond', desc: 'Angular crystal run' },
  { n: 'Orbitals', desc: 'Ring-hopping lanes' },
  { n: 'Comet', desc: 'Tail-heavy slingshot' },
];

let T = TOWERS.map(t => ({...t}));
let W = WEAPONS.map(w => ({...w}));
let E = ENEMIES.map(e => ({...e}));
let B = {...BOSS};
let MB = {...MEGA_BOSS};
let DIFF = DIFFICULTIES.map(d => ({...d}));

const GS_DEFAULTS = {
  startingCore: 50,
  bankInterest: 1.2,
  waveBudgetBase: 16,
  waveBudgetScale: 3.2,
  waveBudgetMax: 240,
  waveBonus: 15,
  waveBonusScale: 8,
  bossEvery: 5,
  megaBossEvery: 10,
  sellRefundMul: 0.62,
  weaponCostMul: 0.72,
  upgBaseMul: 0.58,
  upgScaleMul: 0.62,
  upgWaveScale: 0.03,
  antiMonoFactor: 0.18,
  maxTier: 100,
  towerMinDist: 900,
  waitTime: 1.6,
  initialWait: 1.4,
};

let gs = {...GS_DEFAULTS};

const ADMIN_KEY = 'galactic_td_admin';

const GS_LABELS = {
  startingCore: 'Starting Core HP',
  bankInterest: 'Bank Interest Multiplier',
  waveBudgetBase: 'Wave Budget Base',
  waveBudgetScale: 'Wave Budget Scaling',
  waveBudgetMax: 'Wave Budget Max',
  waveBonus: 'Wave Clear Bonus Base',
  waveBonusScale: 'Wave Clear Bonus Scaling',
  bossEvery: 'Boss Every N Waves',
  megaBossEvery: 'Mega Boss Every N Waves',
  sellRefundMul: 'Sell Refund Multiplier',
  weaponCostMul: 'Weapon Cost Factor',
  upgBaseMul: 'Upgrade Cost Base Mul',
  upgScaleMul: 'Upgrade Cost Scale Mul',
  upgWaveScale: 'Upgrade Cost Wave Scale',
  antiMonoFactor: 'Anti-Monoculture Factor',
  maxTier: 'Max Tower Tier',
  towerMinDist: 'Tower Min Distance (sq)',
  waitTime: 'Wave Wait Time (s)',
  initialWait: 'Initial Wait Time (s)',
};

const TOWER_FIELDS = ['c', 'r', 'rm', 'fr'];
const TOWER_LABELS = { c: 'Cost', r: 'Range', rm: 'Range Mul', fr: 'Fire Rate' };
const WEAPON_FIELDS = ['c', 'd', 'f', 'r', 'ao', 'ch', 'h'];
const WEAPON_LABELS = { c: 'Cost', d: 'Damage', f: 'Fire Rate', r: 'Range', ao: 'AoE', ch: 'Chain', h: 'Heat' };
const ENEMY_FIELDS = ['hp', 'sp', 'c', 'b', 'core'];
const ENEMY_LABELS = { hp: 'HP', sp: 'Speed', c: 'Count', b: 'Bounty', core: 'Core Dmg' };
const DIFF_FIELDS = ['waves', 'hpMul', 'spdMul', 'money', 'coreDmgMul'];
const DIFF_LABELS = { waves: 'Waves', hpMul: 'HP Mul', spdMul: 'Speed Mul', money: 'Start Money', coreDmgMul: 'Core Dmg Mul' };

function loadAdmin() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(ADMIN_KEY)); } catch { return; }
  if (!saved) return;
  if (saved.towers) saved.towers.forEach((o, i) => { if (i < T.length) Object.assign(T[i], o); });
  if (saved.weapons) saved.weapons.forEach((o, i) => { if (i < W.length) Object.assign(W[i], o); });
  if (saved.enemies) saved.enemies.forEach((o, i) => { if (i < E.length) Object.assign(E[i], o); });
  if (saved.boss) Object.assign(B, saved.boss);
  if (saved.megaBoss) Object.assign(MB, saved.megaBoss);
  if (saved.difficulties) saved.difficulties.forEach((o, i) => { if (i < DIFF.length) Object.assign(DIFF[i], o); });
  if (saved.gs) Object.assign(gs, saved.gs);
}

function saveAdmin() {
  const towerOverrides = T.map((t, i) => {
    const d = {}; const orig = TOWERS[i];
    TOWER_FIELDS.forEach(f => { if (t[f] !== orig[f]) d[f] = t[f]; });
    return Object.keys(d).length ? d : null;
  });
  const weaponOverrides = W.map((w, i) => {
    const d = {}; const orig = WEAPONS[i];
    WEAPON_FIELDS.forEach(f => { if (w[f] !== orig[f]) d[f] = w[f]; });
    return Object.keys(d).length ? d : null;
  });
  const enemyOverrides = E.map((e, i) => {
    const d = {}; const orig = ENEMIES[i];
    ENEMY_FIELDS.forEach(f => { if (e[f] !== orig[f]) d[f] = e[f]; });
    return Object.keys(d).length ? d : null;
  });
  const bossOverrides = {};
  ENEMY_FIELDS.forEach(f => { if (B[f] !== BOSS[f]) bossOverrides[f] = B[f]; });
  const megaOverrides = {};
  ENEMY_FIELDS.forEach(f => { if (MB[f] !== MEGA_BOSS[f]) megaOverrides[f] = MB[f]; });
  const diffOverrides = DIFF.map((d, i) => {
    const o = {}; const orig = DIFFICULTIES[i];
    DIFF_FIELDS.forEach(f => { if (d[f] !== orig[f]) o[f] = d[f]; });
    return Object.keys(o).length ? o : null;
  });
  const gsOverrides = {};
  Object.keys(GS_DEFAULTS).forEach(k => { if (gs[k] !== GS_DEFAULTS[k]) gsOverrides[k] = gs[k]; });

  const hasAny = towerOverrides.some(Boolean) || weaponOverrides.some(Boolean) ||
    enemyOverrides.some(Boolean) || Object.keys(bossOverrides).length ||
    Object.keys(megaOverrides).length || diffOverrides.some(Boolean) || Object.keys(gsOverrides).length;

  if (!hasAny) { try { localStorage.removeItem(ADMIN_KEY); } catch {} return; }

  try {
    localStorage.setItem(ADMIN_KEY, JSON.stringify({
      towers: towerOverrides,
      weapons: weaponOverrides,
      enemies: enemyOverrides,
      boss: Object.keys(bossOverrides).length ? bossOverrides : null,
      megaBoss: Object.keys(megaOverrides).length ? megaOverrides : null,
      difficulties: diffOverrides,
      gs: Object.keys(gsOverrides).length ? gsOverrides : null,
    }));
  } catch {}
}

function resetAdmin() {
  try { localStorage.removeItem(ADMIN_KEY); } catch {}
  T = TOWERS.map(t => ({...t}));
  W = WEAPONS.map(w => ({...w}));
  E = ENEMIES.map(e => ({...e}));
  B = {...BOSS};
  MB = {...MEGA_BOSS};
  DIFF = DIFFICULTIES.map(d => ({...d}));
  gs = {...GS_DEFAULTS};
}

const adminModal = $('adminModal');
const adminTabs = $('adminTabs');
const adminBody = $('adminBody');
const adminTrigger = $('adminTrigger');
const adminReset = $('adminReset');
const adminSave = $('adminSave');

let adminTab = 'settings';

const ADMIN_TAB_LIST = [
  { id: 'settings', label: 'Game Settings' },
  { id: 'towers', label: 'Towers' },
  { id: 'weapons', label: 'Weapons' },
  { id: 'enemies', label: 'Enemies' },
  { id: 'bosses', label: 'Bosses' },
  { id: 'difficulties', label: 'Difficulties' },
];

function adminFieldHtml(id, label, value, defaultVal, step) {
  const mod = value !== defaultVal ? ' modified' : '';
  const s = step != null ? step : (defaultVal % 1 !== 0 ? 0.01 : 1);
  return `<div class="admin-field${mod}"><label>${label}</label><input type=number data-id="${id}" value="${value}" step="${s}"><div class="admin-default">Default: ${defaultVal}</div></div>`;
}

function renderAdminTabs() {
  adminTabs.innerHTML = ADMIN_TAB_LIST.map(t =>
    `<button data-tab="${t.id}" class=${t.id === adminTab ? 'sel' : ''}>${t.label}</button>`
  ).join('');
}

function renderAdminBody() {
  let html = '';
  if (adminTab === 'settings') {
    html += '<div class=admin-section><h3>Game Settings</h3><div class=admin-grid>';
    Object.keys(GS_DEFAULTS).forEach(k => {
      html += adminFieldHtml(`gs.${k}`, GS_LABELS[k] || k, gs[k], GS_DEFAULTS[k]);
    });
    html += '</div></div>';
  } else if (adminTab === 'towers') {
    T.forEach((t, i) => {
      const orig = TOWERS[i];
      html += `<div class=admin-section><h3>${orig.i} ${orig.n}</h3><div class=admin-grid>`;
      TOWER_FIELDS.forEach(f => {
        html += adminFieldHtml(`t.${i}.${f}`, TOWER_LABELS[f], t[f], orig[f]);
      });
      html += '</div></div>';
    });
  } else if (adminTab === 'weapons') {
    W.forEach((w, i) => {
      const orig = WEAPONS[i];
      html += `<div class=admin-section><h3>${orig.i} ${orig.n}</h3><div class=admin-grid>`;
      WEAPON_FIELDS.forEach(f => {
        html += adminFieldHtml(`w.${i}.${f}`, WEAPON_LABELS[f], w[f], orig[f]);
      });
      html += '</div></div>';
    });
  } else if (adminTab === 'enemies') {
    E.forEach((e, i) => {
      const orig = ENEMIES[i];
      html += `<div class=admin-section><h3>${orig.i} ${orig.n}</h3><div class=admin-grid>`;
      ENEMY_FIELDS.forEach(f => {
        html += adminFieldHtml(`e.${i}.${f}`, ENEMY_LABELS[f], e[f], orig[f]);
      });
      html += '</div></div>';
    });
  } else if (adminTab === 'bosses') {
    html += `<div class=admin-section><h3>${BOSS.i} ${BOSS.n} (Boss)</h3><div class=admin-grid>`;
    ENEMY_FIELDS.forEach(f => {
      html += adminFieldHtml(`b.${f}`, ENEMY_LABELS[f], B[f], BOSS[f]);
    });
    html += '</div></div>';
    html += `<div class=admin-section><h3>${MEGA_BOSS.i} ${MEGA_BOSS.n} (Mega Boss)</h3><div class=admin-grid>`;
    ENEMY_FIELDS.forEach(f => {
      html += adminFieldHtml(`mb.${f}`, ENEMY_LABELS[f], MB[f], MEGA_BOSS[f]);
    });
    html += '</div></div>';
  } else if (adminTab === 'difficulties') {
    DIFF.forEach((d, i) => {
      const orig = DIFFICULTIES[i];
      html += `<div class=admin-section><h3>${orig.n}</h3><div class=admin-grid>`;
      DIFF_FIELDS.forEach(f => {
        html += adminFieldHtml(`d.${i}.${f}`, DIFF_LABELS[f], d[f], orig[f]);
      });
      html += '</div></div>';
    });
  }
  adminBody.innerHTML = html;
}

function collectAdminInputs() {
  const inputs = adminBody.querySelectorAll('input[data-id]');
  inputs.forEach(inp => {
    const id = inp.dataset.id;
    const val = parseFloat(inp.value);
    if (isNaN(val)) return;
    const parts = id.split('.');
    if (parts[0] === 'gs') {
      gs[parts[1]] = val;
    } else if (parts[0] === 't') {
      T[+parts[1]][parts[2]] = val;
    } else if (parts[0] === 'w') {
      W[+parts[1]][parts[2]] = val;
    } else if (parts[0] === 'e') {
      E[+parts[1]][parts[2]] = val;
    } else if (parts[0] === 'b') {
      B[parts[1]] = val;
    } else if (parts[0] === 'mb') {
      MB[parts[1]] = val;
    } else if (parts[0] === 'd') {
      DIFF[+parts[1]][parts[2]] = val;
    }
  });
}

function openAdmin() {
  adminTab = 'settings';
  renderAdminTabs();
  renderAdminBody();
  adminModal.style.display = 'grid';
}

function closeAdmin() {
  adminModal.style.display = 'none';
}

adminTrigger.addEventListener('click', openAdmin);

adminTabs.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]');
  if (!b) return;
  collectAdminInputs();
  adminTab = b.dataset.tab;
  renderAdminTabs();
  renderAdminBody();
});

adminSave.addEventListener('click', () => {
  collectAdminInputs();
  saveAdmin();
  mkBtns(tl, T, 't');
  mkBtns(wl, W, 'w');
  mkDiffBtns();
  applySel();
  closeAdmin();
});

adminReset.addEventListener('click', () => {
  resetAdmin();
  mkBtns(tl, T, 't');
  mkBtns(wl, W, 'w');
  mkDiffBtns();
  applySel();
  renderAdminBody();
});

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

function mkDiffBtns() {
  let s = '';
  for (let i = 0; i < DIFF.length; i++) {
    const d = DIFF[i];
    s += `<button data-d=${i} class=${i === diff ? 'sel' : ''}>${d.n}<small>${d.waves} waves — ${d.desc}</small></button>`;
  }
  diffRow.innerHTML = s;
}
mkDiffBtns();

diffRow.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-d]');
  if (!b) return;
  diff = +b.dataset.d;
  mkDiffBtns();
});

function mkMapBtns() {
  let s = '';
  for (let i = 0; i < MAPS.length; i++) {
    const m = MAPS[i];
    s += `<button data-m=${i} class=${i === mapIdx ? 'sel' : ''}>${m.n}<small>${m.desc}</small></button>`;
  }
  mapRow.innerHTML = s;
}
mkMapBtns();

mapRow.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-m]');
  if (!b) return;
  mapIdx = +b.dataset.m;
  mkMapBtns();
});

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
  let a = Array.from({length: T.length}, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  selT = a.slice(0, 4);
  a = Array.from({length: W.length}, (_, i) => i);
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
let playTopInset = 0;
let playBottomInset = 0;
let playH = 0;
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
  g.fillStyle = boss === MB ? 'rgba(255,110,120,.85)' : 'rgba(255,170,80,.85)';
  shape(g, 7, x, y, r);
  g.fill();
  g.strokeStyle = boss === MB ? 'rgba(255,120,160,.6)' : 'rgba(255,210,150,.5)';
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
  const mr = Math.min(w, playH || h) * 0.46;
  if (mapIdx === 0) {
    const ir = mr * 0.12;
    const tz = 12 * Math.PI;
    for (let i = 0; i < ps; i++) {
      const t = i / (ps - 1);
      const a = t * tz;
      const r = mr * (1 - t) + ir * t;
      px[i] = cx + Math.cos(a) * r;
      py[i] = cy + Math.sin(a) * r;
    }
  } else if (mapIdx === 1) {
    const legs = 14;
    const margin = mr * 0.9;
    for (let i = 0; i < ps; i++) {
      const t = i / (ps - 1);
      const leg = (t * legs) | 0;
      const lt = (t * legs) - leg;
      const yOfs = (leg + (leg % 2 === 0 ? lt : 1 - lt)) / legs;
      const xDir = leg % 2 === 0 ? 1 : -1;
      const xOfs = xDir * (lt - 0.5) * 2;
      px[i] = cx + xOfs * margin;
      py[i] = cy - margin + yOfs * margin * 2;
    }
  } else if (mapIdx === 2) {
    for (let i = 0; i < ps; i++) {
      const t = i / (ps - 1);
      const a = t * Math.PI * 4;
      const r = mr * 0.42 * Math.sin(a * 0.5);
      px[i] = cx + Math.cos(a) * mr * 0.65;
      py[i] = cy + Math.sin(a) * r;
    }
  } else if (mapIdx === 3) {
    const points = 5;
    const loops = 3;
    for (let i = 0; i < ps; i++) {
      const t = i / (ps - 1);
      const a = t * Math.PI * 2 * loops;
      const starR = mr * (0.3 + 0.6 * Math.abs(Math.sin(a * points * 0.5)));
      const decay = 1 - t * 0.6;
      px[i] = cx + Math.cos(a) * starR * decay;
      py[i] = cy + Math.sin(a) * starR * decay;
    }
  } else if (mapIdx === 4) {
    const loops = 4;
    for (let i = 0; i < ps; i++) {
      const t = i / (ps - 1);
      const a = t * Math.PI * 2 * loops;
      const r = mr * (0.18 + 0.8 * (1 - t));
      px[i] = cx + Math.cos(a) * r;
      py[i] = cy + Math.sin(a * 2.1) * r * 0.62;
    }
  } else if (mapIdx === 5) {
    const sides = 4;
    const loops = 4;
    for (let i = 0; i < ps; i++) {
      const t = i / (ps - 1);
      const a = t * Math.PI * 2 * loops;
      const shapePow = 0.62;
      const cs = Math.cos(a);
      const sn = Math.sin(a);
      const diamond = (Math.pow(Math.abs(cs), shapePow) + Math.pow(Math.abs(sn), shapePow)) ** (-1 / shapePow);
      const r = mr * (0.2 + 0.75 * (1 - t)) * diamond;
      px[i] = cx + Math.cos(a + Math.PI / sides) * r;
      py[i] = cy + Math.sin(a + Math.PI / sides) * r;
    }
  } else if (mapIdx === 6) {
    const rings = 5;
    for (let i = 0; i < ps; i++) {
      const t = i / (ps - 1);
      const a = t * Math.PI * 2 * (2.4 + t * 4.4);
      const ring = Math.floor(t * rings);
      const ringT = (t * rings) - ring;
      const ringR = mr * (0.18 + 0.15 * ring + 0.12 * ringT);
      px[i] = cx + Math.cos(a) * ringR;
      py[i] = cy + Math.sin(a) * ringR;
    }
  } else if (mapIdx === 7) {
    for (let i = 0; i < ps; i++) {
      const t = i / (ps - 1);
      const a = t * Math.PI * 2 * 3.3;
      const tail = 1 - t;
      const r = mr * (0.1 + tail * tail * 0.95);
      px[i] = cx + Math.cos(a) * r + Math.sin(a * 0.5) * mr * 0.12;
      py[i] = cy + Math.sin(a) * r * 0.8;
    }
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

/* ── dynamic background ── */
const NM = 45, NP = 5, NS = 4;
const mX = new Float32Array(NM), mY = new Float32Array(NM);
const mVx = new Float32Array(NM), mVy = new Float32Array(NM);
const mSz = new Float32Array(NM), mAl = new Float32Array(NM);
const mPh = new Float32Array(NM), mHu = new Uint16Array(NM);
const pX = new Float32Array(NP), pY = new Float32Array(NP);
const pSz = new Float32Array(NP), pHu = new Uint16Array(NP);
const pPh = new Float32Array(NP), pSp = new Float32Array(NP);
const sX = new Float32Array(NS), sY = new Float32Array(NS);
const sDx = new Float32Array(NS), sDy = new Float32Array(NS);
const sLf = new Float32Array(NS), sMx = new Float32Array(NS);
let dynT = 0, hOff = 0;
const MAP_HUE = [[180, 210], [260, 300], [20, 55], [120, 170], [190, 250], [310, 350], [45, 75], [0, 30]];

function initDynBg() {
  hOff = (Math.random() * 40 - 20) | 0;
  const [h1, h2] = MAP_HUE[mapIdx] || MAP_HUE[0];
  const ha = h1 + hOff, hb = h2 + hOff, hr = hb - ha;
  for (let i = 0; i < NM; i++) {
    mX[i] = Math.random() * w;
    mY[i] = Math.random() * h;
    mVx[i] = (Math.random() - 0.5) * 8;
    mVy[i] = (Math.random() - 0.5) * 8;
    mSz[i] = 1 + Math.random() * 2.5;
    mAl[i] = 0.05 + Math.random() * 0.15;
    mPh[i] = Math.random() * 6.283;
    mHu[i] = ((ha + Math.random() * hr) % 360 + 360) % 360;
  }
  for (let i = 0; i < NP; i++) {
    pX[i] = w * 0.15 + Math.random() * w * 0.7;
    pY[i] = h * 0.15 + Math.random() * h * 0.7;
    pSz[i] = 80 + Math.random() * 160;
    pHu[i] = ((ha + Math.random() * hr) % 360 + 360) % 360;
    pPh[i] = Math.random() * 6.283;
    pSp[i] = 0.08 + Math.random() * 0.25;
  }
  for (let i = 0; i < NS; i++) sLf[i] = -1;
  dynT = performance.now() * 0.001;
}

function drawDynBg() {
  const now = performance.now() * 0.001;
  const dt = Math.min(0.1, now - dynT);
  dynT = now;

  /* nebula puffs — large faint color clouds */
  for (let i = 0; i < NP; i++) {
    const x = pX[i] + Math.sin(now * pSp[i] + pPh[i]) * 50;
    const y = pY[i] + Math.cos(now * pSp[i] * 0.7 + pPh[i]) * 35;
    const r = pSz[i] + Math.sin(now * 0.25 + pPh[i]) * 25;
    const a = 0.028 + Math.sin(now * 0.18 + pPh[i]) * 0.012;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `hsl(${pHu[i]} 55% 45%/${a})`);
    g.addColorStop(0.6, `hsl(${pHu[i]} 45% 35%/${a * 0.35})`);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  /* floating motes — tiny drifting particles */
  for (let i = 0; i < NM; i++) {
    mX[i] += mVx[i] * dt;
    mY[i] += mVy[i] * dt;
    if (mX[i] < -10) mX[i] += w + 20;
    if (mX[i] > w + 10) mX[i] -= w + 20;
    if (mY[i] < -10) mY[i] += h + 20;
    if (mY[i] > h + 10) mY[i] -= h + 20;
    const pulse = 0.5 + 0.5 * Math.sin(now * 1.2 + mPh[i]);
    ctx.globalAlpha = mAl[i] * (0.3 + pulse * 0.7);
    ctx.fillStyle = hsl(mHu[i], 65, 70, 1);
    ctx.beginPath();
    ctx.arc(mX[i], mY[i], mSz[i] * (0.6 + pulse * 0.4), 0, 6.283);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  /* map-specific accent effects */
  if (mapIdx === 0) {
    /* Spiral — slow-rotating galaxy arms */
    ctx.save();
    ctx.translate(cx, cy);
    const armR = Math.min(w, h) * 0.52;
    for (let a = 0; a < 3; a++) {
      const base = now * 0.1 + a * 2.094;
      ctx.strokeStyle = `hsl(${190 + hOff} 50% 60%/.04)`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let j = 0; j <= 80; j++) {
        const t = j / 80;
        const ang = base + t * 5;
        const r = t * armR;
        j ? ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r)
          : ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
      }
      ctx.stroke();
    }
    ctx.restore();
  } else if (mapIdx === 1) {
    /* Zigzag — horizontal scanning light bands */
    for (let i = 0; i < 3; i++) {
      const y0 = ((now * 18 + i * h / 3) % (h + 60)) - 30;
      const g = ctx.createLinearGradient(0, y0 - 25, 0, y0 + 25);
      g.addColorStop(0, 'transparent');
      g.addColorStop(0.5, `hsl(${270 + hOff} 50% 60%/.035)`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, y0 - 25, w, 50);
    }
  } else if (mapIdx === 2) {
    /* Figure-8 — expanding ring pulses from center */
    for (let i = 0; i < 3; i++) {
      const phase = (now * 0.3 + i * 1.1) % 3;
      const r = phase / 3 * Math.min(w, h) * 0.5;
      const a = 0.06 * (1 - phase / 3);
      ctx.strokeStyle = `hsl(${35 + hOff} 70% 60%/${a})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 6.283);
      ctx.stroke();
    }
  } else if (mapIdx === 3) {
    /* Star — shooting star streaks */
    for (let i = 0; i < NS; i++) {
      if (sLf[i] <= 0) {
        if (Math.random() < 0.008) {
          const ang = Math.random() * 6.283;
          const spd = 250 + Math.random() * 350;
          sX[i] = Math.random() * w;
          sY[i] = Math.random() * h * 0.6;
          sDx[i] = Math.cos(ang) * spd;
          sDy[i] = Math.sin(ang) * spd;
          sMx[i] = sLf[i] = 0.4 + Math.random() * 0.8;
        }
        continue;
      }
      sLf[i] -= dt;
      sX[i] += sDx[i] * dt;
      sY[i] += sDy[i] * dt;
      const p = sLf[i] / sMx[i];
      const len = 25 + p * 45;
      const mag = Math.hypot(sDx[i], sDy[i]);
      const nx = sDx[i] / mag, ny = sDy[i] / mag;
      ctx.globalAlpha = p * 0.45;
      ctx.strokeStyle = `hsl(${150 + hOff} 60% 80%/1)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sX[i], sY[i]);
      ctx.lineTo(sX[i] - nx * len, sY[i] - ny * len);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  } else if (mapIdx === 4) {
    /* Helix — crossing ribbons */
    const pulse = (Math.sin(now * 1.5) * 0.5 + 0.5) * 0.22;
    ctx.globalAlpha = 0.08 + pulse;
    ctx.strokeStyle = `hsl(${215 + hOff} 78% 70% / 1)`;
    ctx.lineWidth = 1.1;
    for (let i = 20; i < ps - 20; i += 40) {
      ctx.beginPath();
      ctx.moveTo(px[i], py[i]);
      ctx.lineTo(px[i + 16], py[i + 16]);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (mapIdx === 5) {
    /* Diamond — corner pulses */
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = `hsl(${330 + hOff} 75% 72% / 1)`;
    for (let i = 30; i < ps; i += 120) {
      const p = 2.5 + Math.sin(now * 2 + i * 0.1) * 1.2;
      ctx.beginPath();
      ctx.arc(px[i], py[i], p, 0, 6.283);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (mapIdx === 6) {
    /* Orbitals — rotating lane beacons */
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = `hsl(${55 + hOff} 78% 74% / 1)`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const a = now * 0.35 + i * 1.047;
      const rr = Math.min(w, h) * (0.16 + i * 0.05);
      ctx.beginPath();
      ctx.arc(cx, cy, rr, a, a + 0.75);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (mapIdx === 7) {
    /* Comet — glowing tail behind the core */
    const grad = ctx.createLinearGradient(cx, cy, cx - Math.min(w, h) * 0.35, cy + Math.min(w, h) * 0.18);
    grad.addColorStop(0, `hsl(${10 + hOff} 90% 72% / .24)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx - Math.min(w, h) * 0.18, cy + Math.min(w, h) * 0.08, Math.min(w, h) * 0.28, Math.min(w, h) * 0.1, 0.35, 0, 6.283);
    ctx.fill();
  }
}

function resize() {
  dpr = devicePixelRatio || 1;
  w = innerWidth;
  h = innerHeight;
  c.width = (w * dpr) | 0;
  c.height = (h * dpr) | 0;
  const panelRect = panel.getBoundingClientRect();
  const hudRect = $('hud').getBoundingClientRect();
  playTopInset = Math.max(0, hudRect.bottom + 10);
  playBottomInset = Math.max(0, h - panelRect.top) + 14;
  playH = Math.max(220, h - playTopInset - playBottomInset);
  cx = w * 0.5;
  cy = playTopInset + playH * 0.5;
  mkPath();
  mkBg();
  initDynBg();
  mkSpr(tSpr, T, 54, 10, 0.9);
  mkSpr(wSpr, W, 42, 180, 0.86);
  mkSpr(eSpr, E, 46, 300, 0.9);
  bSpr = mkBoss(B);
  megaSpr = mkBoss(MB);
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
const ft = new Uint8Array(MF);
const fxp = new Float32Array(MF);
const fyp = new Float32Array(MF);

// --- Status effect arrays (Feature 1) ---
const eSlow = new Float32Array(ME);     // slow timer
const eBurn = new Float32Array(ME);     // burn timer
const eBurnDmg = new Float32Array(ME);  // burn DPS
const eExpose = new Float32Array(ME);   // expose timer
const eGlitch = new Float32Array(ME);   // glitch (stun) timer
const eShatter = new Uint8Array(ME);    // shatter applied flag
const eBaseSpd = new Float32Array(ME);  // original speed (before slow)

// --- Particle system (Feature 3) ---
const MP = 2000;
let pn = 0;
let pHead = 0;
const partX = new Float32Array(MP);
const partY = new Float32Array(MP);
const partVX = new Float32Array(MP);
const partVY = new Float32Array(MP);
const partLife = new Float32Array(MP);
const partMaxLife = new Float32Array(MP);
const partR = new Uint8Array(MP);
const partG = new Uint8Array(MP);
const partB = new Uint8Array(MP);

function spawnParticle(x, y, vx, vy, r, g, b, life) {
  const i = pHead;
  pHead = (pHead + 1) % MP;
  if (pn < MP) pn++;
  partX[i] = x;
  partY[i] = y;
  partVX[i] = vx;
  partVY[i] = vy;
  partLife[i] = life;
  partMaxLife[i] = life;
  partR[i] = r;
  partG[i] = g;
  partB[i] = b;
}

function spawnHitParticles(x, y, count, r, g, b) {
  for (let j = 0; j < count; j++) {
    const a = rng() * 6.283;
    const s = 30 + rng() * 60;
    spawnParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, r, g, b, 0.3 + rng() * 0.3);
  }
}

function spawnKillBurst(x, y, count, isBoss) {
  const n = isBoss ? count * 3 : count;
  for (let j = 0; j < n; j++) {
    const a = rng() * 6.283;
    const s = 40 + rng() * (isBoss ? 120 : 80);
    const r = isBoss ? 255 : 200 + (rng() * 55) | 0;
    const g = isBoss ? (100 + rng() * 100) | 0 : (180 + rng() * 75) | 0;
    const b = isBoss ? (50 + rng() * 50) | 0 : (220 + rng() * 35) | 0;
    spawnParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, r, g, b, 0.5 + rng() * 0.5);
  }
}

// --- Tower stats tracking (Feature 6) ---
const tKills = new Float64Array(MT);
const tDmg = new Float64Array(MT);
let runTotalKills = 0;
let runTotalDmg = 0;
let runStartTime = 0;
let statsSaved = false;

// --- Tower synergy (Feature 5) ---
const synBonus = new Float32Array(MT);

// --- Wave preview (Feature 2) ---
let nextWaveInfo = [];
let nextWaveBoss = 0;
let nextWaveMega = 0;

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
const use = new Uint16Array(10);
const toInt = (v) => Math.max(0, Math.floor(v));

function mkBar() {
  let s = '';
  for (let i = 0; i < selT.length; i++) {
    const tower = T[selT[i]];
    s += `<button data-i=${i} class=${i === st ? 'on' : ''} data-tip="${tower.i} ${tower.n}\nChassis cost ${tower.c}c">${tower.i}</button>`;
  }
  ts.innerHTML = s;
  s = '';
  for (let i = 0; i < selW.length; i++) {
    const weapon = W[selW[i]];
    const fxTip = weapon.fx ? `\nEffect: ${weapon.fx}` : '';
    s += `<button data-i=${i} class=${i === sw ? 'on' : ''} data-tip="${weapon.i} ${weapon.n}\nWeapon cost ${weapon.c}c${fxTip}">${weapon.i}</button>`;
  }
  ws.innerHTML = s;
  if (sel >= 0) {
    const t = tier[sel];
    const ch = T[tt[sel]];
    const we = W[tw[sel]];
    const base = ch.c + we.c * gs.weaponCostMul;
    const cost = (base * (gs.upgBaseMul + gs.upgScaleMul * t) * (1 + gs.upgWaveScale * wave)) | 0;
    const nextTier = t + 1;
    let tipText = `Upgrade to Tier ${nextTier} — Cost ${fmt(cost)}c`;
    if (t >= gs.maxTier) tipText += ' (Max level)';
    else if (money < cost) tipText += ` (Need ${fmt(cost - money)} more credits)`;
    upB.title = tipText;
    upB.disabled = t >= gs.maxTier || money < cost;
  } else {
    upB.disabled = true;
    upB.title = '';
  }
  pauseBtn.textContent = paused ? '▶' : '⏸';
  pauseBtn.classList.toggle('playing', !paused && !dead);
  pauseBtn.title = paused ? 'Resume (Space)' : 'Pause (Space)';
  hint.textContent = dead === 2
    ? 'Victory! Click ↺ or press R to restart.'
    : dead
    ? 'Defeated. Click ↺ or press R to restart.'
    : paused
      ? 'Paused. Click ▶ or press Space to resume.'
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
  const d = DIFF[diff];
  maxWaves = d.waves;
  tn = 0;
  en = 0;
  fn = 0;
  wave = 1;
  wait = gs.initialWait;
  money = d.money;
  bank = 0;
  core = gs.startingCore;
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
  pn = 0;
  pHead = 0;
  runTotalKills = 0;
  runTotalDmg = 0;
  runStartTime = performance.now();
  statsSaved = false;
  for (let i = 0; i < MT; i++) { tKills[i] = 0; tDmg[i] = 0; synBonus[i] = 1; }
  nextWaveInfo = [];
  nextWaveBoss = 0;
  nextWaveMega = 0;
  calcWavePreview();
  note.classList.remove('show');
  note.textContent = '';
  setSpeed(0);
  mkBar();
}

function waveBudget() {
  return wave < 2 ? gs.waveBudgetBase : Math.min(gs.waveBudgetMax, gs.waveBudgetBase + wave * gs.waveBudgetScale);
}

function calcWavePreview() {
  const w = wave;
  nextWaveBoss = w % gs.bossEvery === 0 ? 1 : 0;
  nextWaveMega = w % gs.megaBossEvery === 0 ? 1 : 0;
  const packs = 4 + Math.min(6, (w / 3) | 0);
  const counts = new Array(E.length).fill(0);
  const base = w < 2 ? gs.waveBudgetBase : Math.min(gs.waveBudgetMax, gs.waveBudgetBase + w * gs.waveBudgetScale);
  for (let p = 0; p < packs; p++) {
    const k = (rng() * E.length) | 0;
    const cnt = Math.max(1, (base * E[k].c * 0.95) | 0);
    counts[k] += cnt;
  }
  nextWaveInfo = [];
  for (let i = 0; i < E.length; i++) {
    if (counts[i] > 0) nextWaveInfo.push({ type: i, icon: E[i].i, count: counts[i], ab: E[i].ab || '' });
  }
}

function calcSynergies() {
  const synRadius = gs.towerMinDist * 4;
  for (let i = 0; i < tn; i++) {
    let bonus = 1.0;
    let sameCount = 0;
    let hasSpawnerNeighbor = false;
    let hasRangeComplement = false;
    const ch = T[tt[i]];
    const myRange = ch.r;
    const isSpawner = !!ch.spawn;
    for (let j = 0; j < tn; j++) {
      if (j === i) continue;
      if (dist2(tx[i], ty[i], tx[j], ty[j]) > synRadius) continue;
      const ch2 = T[tt[j]];
      if (tt[i] === tt[j]) sameCount++;
      if (ch2.spawn && !isSpawner) hasSpawnerNeighbor = true;
      if (!ch2.spawn && isSpawner) hasSpawnerNeighbor = true;
      const rangeDiff = Math.abs(myRange - ch2.r);
      if (rangeDiff > 30) hasRangeComplement = true;
    }
    if (sameCount > 0) bonus *= Math.max(0.8, 1 - 0.05 * sameCount);
    if (hasRangeComplement) bonus *= 1.08;
    if (hasSpawnerNeighbor && isSpawner) bonus *= 1.15;
    synBonus[i] = bonus;
  }
}

function spawnPack(isBoss) {
  if (en >= ME - 2) return;
  const k = (rng() * E.length) | 0;
  const e = isBoss === 2 ? MB : isBoss ? B : E[k];
  const base = waveBudget();
  const cnt = isBoss ? 1 : Math.max(1, (base * e.c * (0.75 + rng() * 0.55)) | 0);
  const dif = DIFF[diff];
  const hpU = (1.8 + wave * 0.16) * e.hp * (0.78 + rng() * 0.55) * dif.hpMul;
  const sp = (0.03 + wave * 0.0001) * e.sp * (0.92 + rng() * 0.16) * dif.spdMul;
  const b = (2.5 + wave * 0.8) * e.b;
  const i = en++;
  ep[i] = 0;
  es[i] = sp;
  eBaseSpd[i] = sp;
  et[i] = k;
  ec[i] = cnt;
  ek[i] = e.core;
  ehu[i] = hpU;
  eh[i] = hpU * cnt;
  eb[i] = b;
  eboss[i] = isBoss ? isBoss : 0;
  eSlow[i] = 0;
  eBurn[i] = 0;
  eBurnDmg[i] = 0;
  eExpose[i] = 0;
  eGlitch[i] = 0;
  eShatter[i] = 0;
}

function spawnWave() {
  const packs = 4 + Math.min(6, (wave / 3) | 0);
  pendingPacks = packs;
  spawnTick = 0;
  bossPending = wave % gs.bossEvery === 0 ? 1 : 0;
  megaPending = wave % gs.megaBossEvery === 0 ? 1 : 0;
  calcSynergies();
  if (megaPending) {
    showNote(`Wave ${wave}: abyss titan inbound`);
  } else {
    showNote(bossPending ? `Wave ${wave}: boss incoming` : `Wave ${wave} inbound`);
  }
}

function dmgPack(i, dm, towerIdx, weaponFx) {
  // Enemy ability: armor reduces damage by 25%
  if (!eboss[i] && E[et[i]].ab === 'armor') dm *= 0.75;
  // Enemy ability: phase has 20% dodge chance
  if (!eboss[i] && E[et[i]].ab === 'phase' && rng() < 0.2) return;
  // Weapon effect: pierce ignores 30% of HP scaling (flat bonus)
  if (weaponFx === 'pierce') dm *= 1.3;
  // Status effect: expose increases damage taken
  if (eExpose[i] > 0) dm *= 1.2;
  // Tower synergy bonus
  if (towerIdx >= 0 && towerIdx < tn) dm *= synBonus[towerIdx];
  // Stats tracking
  if (towerIdx >= 0 && towerIdx < tn) { tDmg[towerIdx] += dm; }
  runTotalDmg += dm;
  // Hit particles
  spawnHitParticles(ex[i], ey[i], 3 + (rng() * 3) | 0, 180, 240, 255);
  // Apply status effect from weapon
  if (weaponFx) {
    if (weaponFx === 'expose') eExpose[i] = 2.0;
    else if (weaponFx === 'slow') eSlow[i] = 2.0;
    else if (weaponFx === 'burn') { eBurn[i] = 3.0; eBurnDmg[i] = Math.max(eBurnDmg[i], 8); }
    else if (weaponFx === 'glitch' && rng() < 0.15) eGlitch[i] = 0.5;
    else if (weaponFx === 'warp') ep[i] = Math.max(0, ep[i] - 0.02);
    else if (weaponFx === 'shatter' && !eShatter[i]) { eShatter[i] = 1; eh[i] *= 0.85; }
    else if (weaponFx === 'vortex') {
      const vr2 = 3600;
      for (let j = 0; j < en; j++) {
        if (j === i) continue;
        const dx = ex[j] - ex[i];
        const dy = ey[j] - ey[i];
        if (dx * dx + dy * dy < vr2) ep[j] = Math.max(0, ep[j] - 0.005);
      }
    }
  }
  const h = eh[i] - dm;
  if (h <= 0) {
    const killCount = ec[i];
    const killBounty = ec[i] * eb[i];
    const isBossKill = eboss[i];
    const killX = ex[i];
    const killY = ey[i];
    const killType = et[i];
    money = toInt(money + killBounty);
    if (towerIdx >= 0 && towerIdx < tn) tKills[towerIdx] += killCount;
    runTotalKills += killCount;
    // Kill burst particles
    spawnKillBurst(killX, killY, 10, isBossKill);
    eh[i] = 0;
    ec[i] = 0;
    // Enemy ability: split spawns 2 packs on death
    const shouldSplit = !isBossKill && E[killType].ab === 'split' && en < ME - 4;
    en--;
    if (i !== en) {
      ep[i] = ep[en]; ex[i] = ex[en]; ey[i] = ey[en];
      et[i] = et[en]; ec[i] = ec[en]; ehu[i] = ehu[en];
      eh[i] = eh[en]; es[i] = es[en]; eb[i] = eb[en];
      ek[i] = ek[en]; eboss[i] = eboss[en];
      eSlow[i] = eSlow[en]; eBurn[i] = eBurn[en]; eBurnDmg[i] = eBurnDmg[en];
      eExpose[i] = eExpose[en]; eGlitch[i] = eGlitch[en]; eShatter[i] = eShatter[en];
      eBaseSpd[i] = eBaseSpd[en];
    }
    if (shouldSplit) {
      const halfCnt = Math.max(1, (killCount * 0.5) | 0);
      const splitProg = Math.min(0.95, (killX - px[0]) !== 0 ? ep[i > en ? en : i] || 0.5 : 0.5);
      for (let s = 0; s < 2; s++) {
        if (en >= ME - 1) break;
        const si = en++;
        ep[si] = Math.max(0, splitProg - 0.01 + rng() * 0.02);
        const u = ep[si] * (ps - 1);
        let j2 = u | 0; let f2 = u - j2;
        if (j2 >= ps - 1) { j2 = ps - 2; f2 = 1; }
        ex[si] = px[j2] + (px[j2 + 1] - px[j2]) * f2;
        ey[si] = py[j2] + (py[j2 + 1] - py[j2]) * f2;
        et[si] = killType;
        ec[si] = halfCnt;
        const dif = DIFF[diff];
        const splitHpU = (1.8 + wave * 0.16) * E[killType].hp * 0.5 * dif.hpMul;
        ehu[si] = splitHpU;
        eh[si] = splitHpU * halfCnt;
        eBaseSpd[si] = eBaseSpd[i > en ? en : 0] || 0.03;
        es[si] = eBaseSpd[si] * 1.1;
        eb[si] = 0;
        ek[si] = E[killType].core;
        eboss[si] = 0;
        eSlow[si] = 0; eBurn[si] = 0; eBurnDmg[si] = 0;
        eExpose[si] = 0; eGlitch[si] = 0; eShatter[si] = 0;
      }
    }
    return;
  }
  const before = ec[i];
  const nc = Math.ceil(h / ehu[i]);
  if (nc < before) {
    const killed = before - nc;
    money = toInt(money + killed * eb[i]);
    if (towerIdx >= 0 && towerIdx < tn) tKills[towerIdx] += killed;
    runTotalKills += killed;
  }
  ec[i] = nc;
  eh[i] = h;
}

function place(x, y, ti, wi) {
  if (dead || paused || tn >= MT) return;
  x = clamp(x, 14, w - 14);
  y = clamp(y, 14, h - 14);
  const ch = T[ti];
  const we = W[wi];
  const cost = (ch.c + we.c * gs.weaponCostMul) | 0;
  if (money < cost) return;
  for (let i = 0; i < tn; i++) if (dist2(x, y, tx[i], ty[i]) < gs.towerMinDist) return;
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
  tKills[i] = 0;
  tDmg[i] = 0;
  synBonus[i] = 1;
  calcSynergies();
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
  const base = ch.c + we.c * gs.weaponCostMul;
  const val = base * (0.85 + 0.35 * tier[i]) * gs.sellRefundMul;
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
    tKills[i] = tKills[tn];
    tDmg[i] = tDmg[tn];
    synBonus[i] = synBonus[tn];
    if (sel === tn) sel = i;
  }
  if (sel === i) sel = -1;
  mkBar();
}

function upgrade(i) {
  if (i < 0 || i >= tn || dead || paused) return;
  const t = tier[i];
  if (t >= gs.maxTier) return;
  const ch = T[tt[i]];
  const we = W[tw[i]];
  const base = ch.c + we.c * gs.weaponCostMul;
  const cost = (base * (gs.upgBaseMul + gs.upgScaleMul * t) * (1 + gs.upgWaveScale * wave)) | 0;
  if (money < cost) return;
  money = Math.max(0, money - cost);
  tier[i] = t + 1;
  heat[i] *= 0.82;
  mkBar();
}

function spawnFriendly(x, y, amt, type) {
  if (fn >= MF - 2) return;
  const i = fn++;
  ft[i] = type || 1;
  fp[i] = 0;
  fs[i] = 0.11 + amt * 0.002;
  fd[i] = 8 + amt * 1.2;
  fl[i] = 180 + amt * 12;
  fcd[i] = 0;
  if (type === 3) {
    fxp[i] = cx + (rng() - 0.5) * w * 0.7;
    fyp[i] = cy + (rng() - 0.5) * h * 0.7;
    fp[i] = 0.5;
  } else {
    fxp[i] = 0;
    fyp[i] = 0;
  }
}

function ui() {
  waveE.textContent = `${wave}/${maxWaves}`;
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

function positionTip(x, y) {
  const tr = tip.getBoundingClientRect();
  let tx0 = x + 14;
  let ty0 = y + 14;
  if (tx0 + tr.width > w - 8) tx0 = x - tr.width - 8;
  if (ty0 + tr.height > h - 8) ty0 = y - tr.height - 8;
  tip.style.left = `${tx0}px`;
  tip.style.top = `${ty0}px`;
  tip.style.opacity = 1;
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
    const sType = T[tt[i]].spawn;
    const extra = sType === 3 ? ' Airdrop' : sType === 2 ? ' Brawler' : sType ? ' Spawner' : '';
    const wep = W[tw[i]];
    const fxLabel = wep.fx ? ` [${wep.fx}]` : '';
    const synLabel = synBonus[i] > 1.01 ? ` +${((synBonus[i]-1)*100)|0}% syn` : synBonus[i] < 0.99 ? ` ${((synBonus[i]-1)*100)|0}% syn` : '';
    tip.innerHTML = `${T[tt[i]].i} ${T[tt[i]].n}${extra}<br>${wep.i} ${wep.n}${fxLabel}<br>Tier ${tier[i]}${synLabel}<br>Kills ${fmt(tKills[i])} | Dmg ${fmt(tDmg[i])}`;
    positionTip(x, y);
    return;
  }
  if (hoverE >= 0) {
    const i = hoverE;
    const bossType = eboss[i];
    const name = bossType === 2 ? MB.n : bossType ? B.n : E[et[i]].n;
    const icon = bossType === 2 ? MB.i : bossType ? B.i : E[et[i]].i;
    const ab = bossType ? 'regen' : E[et[i]].ab;
    const abLabel = ab ? ` [${ab}]` : '';
    let fxList = '';
    if (eSlow[i] > 0) fxList += ' slow';
    if (eBurn[i] > 0) fxList += ' burn';
    if (eExpose[i] > 0) fxList += ' expose';
    if (eGlitch[i] > 0) fxList += ' glitch';
    if (eShatter[i]) fxList += ' shatter';
    tip.innerHTML = `${icon} ${name}${abLabel}<br>HP ${fmt(eh[i])} | Count ${fmt(ec[i])}${fxList ? '<br>Effects:' + fxList : ''}`;
    positionTip(x, y);
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
    // Tick status effect timers
    if (eSlow[i] > 0) { eSlow[i] -= dt; es[i] = eBaseSpd[i] * 0.7; } else { es[i] = eBaseSpd[i]; }
    if (eExpose[i] > 0) eExpose[i] -= dt;
    if (eGlitch[i] > 0) { eGlitch[i] -= dt; es[i] = 0; }
    if (eBurn[i] > 0) {
      eBurn[i] -= dt;
      const burnDm = eBurnDmg[i] * dt;
      eh[i] -= burnDm;
      runTotalDmg += burnDm;
      if (eBurn[i] > 0 && rng() < dt * 3) spawnParticle(ex[i] + (rng()-0.5)*6, ey[i], (rng()-0.5)*15, -20 - rng()*30, 255, 140 + (rng()*60)|0, 30, 0.4);
      if (eh[i] <= 0) {
        money = toInt(money + ec[i] * eb[i]);
        runTotalKills += ec[i];
        spawnKillBurst(ex[i], ey[i], 8, 0);
        en--;
        if (i !== en) {
          ep[i]=ep[en];et[i]=et[en];ec[i]=ec[en];ehu[i]=ehu[en];
          eh[i]=eh[en];es[i]=es[en];eb[i]=eb[en];ek[i]=ek[en];eboss[i]=eboss[en];
          eSlow[i]=eSlow[en];eBurn[i]=eBurn[en];eBurnDmg[i]=eBurnDmg[en];
          eExpose[i]=eExpose[en];eGlitch[i]=eGlitch[en];eShatter[i]=eShatter[en];
          eBaseSpd[i]=eBaseSpd[en];
        }
        continue;
      }
      const bnc = Math.ceil(eh[i] / ehu[i]);
      if (bnc < ec[i]) { money = toInt(money + (ec[i] - bnc) * eb[i]); runTotalKills += ec[i] - bnc; ec[i] = bnc; }
    }
    // Boss regen: 1% max HP per second
    if (eboss[i]) eh[i] = Math.min(ec[i] * ehu[i], eh[i] + ehu[i] * ec[i] * 0.01 * dt);
    ep[i] += es[i] * dt;
    if (ep[i] >= 1) {
      const dmgC = Math.max(1, (ec[i] * ek[i] * DIFF[diff].coreDmgMul) / 2400) | 0;
      core = Math.max(0, core - dmgC);
      en--;
      if (i !== en) {
        ep[i]=ep[en];et[i]=et[en];ec[i]=ec[en];ehu[i]=ehu[en];
        eh[i]=eh[en];es[i]=es[en];eb[i]=eb[en];ek[i]=ek[en];eboss[i]=eboss[en];
        eSlow[i]=eSlow[en];eBurn[i]=eBurn[en];eBurnDmg[i]=eBurnDmg[en];
        eExpose[i]=eExpose[en];eGlitch[i]=eGlitch[en];eShatter[i]=eShatter[en];
        eBaseSpd[i]=eBaseSpd[en];
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
      spawnFriendly(x, y, amt, ch.spawn);
      cd[i] = 2.2 / (1 + 0.06 * (t - 1));
    }
    if (cd[i] > 0) continue;
    const range = (ch.r + we.r) * 0.53 * ch.rm * (1 + 0.055 * (t - 1));
    const r2 = range * range;
    let tar = -1;
    let bp = -1;
    for (let k = en - 1; k >= 0; k--) {
      if (ec[k] <= 0) continue;
      // Cloak ability: invisible for first 15% of path
      if (!eboss[k] && E[et[k]].ab === 'cloak' && ep[k] < 0.15) continue;
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
    const sat = 1 / (1 + gs.antiMonoFactor * Math.max(0, use[tw[i]] - 1));
    const eff = 1 / (1 + Math.max(0, heat[i] - 1.15) * 1.0);
    const dmg0 = we.d * ch.fr * (1 + gs.antiMonoFactor * (t - 1)) * sat * eff;
    const wfx = we.fx || '';
    heat[i] += we.h * gs.antiMonoFactor;
    cd[i] = 1 / (we.f * ch.fr * (1 + 0.06 * (t - 1)));
    const tx0 = ex[tar];
    const ty0 = ey[tar];
    bx[i] = tx0;
    by[i] = ty0;
    bt[i] = 0.085;
    dmgPack(tar, dmg0, i, wfx);
    if (we.ao) {
      const ar = range * we.ao;
      const ar2 = ar * ar;
      for (let j = 0; j < en; j++) {
        if (j === tar || ec[j] <= 0) continue;
        const dx = ex[j] - tx0;
        const dy = ey[j] - ty0;
        if (dx * dx + dy * dy < ar2) dmgPack(j, dmg0 * 0.42, i, wfx);
      }
    }
    if (we.ch) {
      let kk = we.ch;
      let fall = we.fx === 'overload' ? 0.36 : 0.26;
      for (let j = 0; j < en && kk; j++) {
        if (j === tar || ec[j] <= 0) continue;
        const dx = ex[j] - tx0;
        const dy = ey[j] - ty0;
        if (dx * dx + dy * dy < range * range * 0.62) {
          dmgPack(j, dmg0 * fall, i, wfx);
          fall *= 0.72;
          kk--;
        }
      }
    }
  }
  for (let i = 0; i < fn; ) {
    const ftype = ft[i];
    if (ftype === 3) {
      fl[i] -= dt * 60;
      fcd[i] -= dt;
      if (fl[i] <= 0) {
        fn--;
        if (i !== fn) { fp[i]=fp[fn];fs[i]=fs[fn];fd[i]=fd[fn];fl[i]=fl[fn];fcd[i]=fcd[fn];ft[i]=ft[fn];fxp[i]=fxp[fn];fyp[i]=fyp[fn]; }
        continue;
      }
      const x = fxp[i];
      const y = fyp[i];
      if (fcd[i] <= 0) {
        let hit = -1; let bd = 1e9;
        for (let j = 0; j < en; j++) {
          if (ec[j] <= 0) continue;
          const d = dist2(x, y, ex[j], ey[j]);
          if (d < 2500 && d < bd) { bd = d; hit = j; }
        }
        if (hit >= 0) { dmgPack(hit, fd[i], -1, ''); fcd[i] = 0.5; }
      }
      fd[i] += dt * 0.3;
      i++;
    } else {
      fp[i] += fs[i] * dt;
      fl[i] -= dt * 60;
      fcd[i] -= dt;
      if (fp[i] >= 1 || fl[i] <= 0) {
        fn--;
        if (i !== fn) { fp[i]=fp[fn];fs[i]=fs[fn];fd[i]=fd[fn];fl[i]=fl[fn];fcd[i]=fcd[fn];ft[i]=ft[fn];fxp[i]=fxp[fn];fyp[i]=fyp[fn]; }
        continue;
      }
      const u = fp[i] * (ps - 1);
      let j = u | 0;
      let f = u - j;
      if (j >= ps - 1) { j = ps - 2; f = 1; }
      const x = px[j] + (px[j + 1] - px[j]) * f;
      const y = py[j] + (py[j + 1] - py[j]) * f;
      if (fcd[i] <= 0) {
        let hit = -1; let bd = 1e9;
        for (let j = 0; j < en; j++) {
          if (ec[j] <= 0) continue;
          const d = dist2(x, y, ex[j], ey[j]);
          if (d < 1200 && d < bd) { bd = d; hit = j; }
        }
        if (hit >= 0) {
          dmgPack(hit, fd[i], -1, '');
          fcd[i] = 0.4;
          if (ftype === 2) {
            ep[hit] = Math.max(0, ep[hit] - 0.012 * (1 + fd[i] * 0.01));
          }
        }
      }
      fd[i] += dt * 0.4;
      i++;
    }
  }
  // Update particles
  for (let i = 0; i < MP; i++) {
    if (partLife[i] <= 0) continue;
    partLife[i] -= dt;
    partX[i] += partVX[i] * dt;
    partY[i] += partVY[i] * dt;
    partVX[i] *= 0.96;
    partVY[i] *= 0.96;
  }
  if (en === 0 && wait <= 0 && !dead) {
    updBest();
    if (wave >= maxWaves) {
      dead = 2;
      try { localStorage.removeItem(SAVE_KEY); } catch {}
      showNote(`VICTORY! ${DIFF[diff].n} mode cleared at wave ${wave}!`, 999);
      mkBar();
      tip.style.opacity = 0;
    } else {
      const waveBonus = toInt(gs.waveBonus + wave * gs.waveBonusScale);
      money = toInt(money + waveBonus);
      bank = toInt(money);
      money = toInt(bank * gs.bankInterest);
      const intPct = Math.round((gs.bankInterest - 1) * 100);
      showNote(`Wave ${wave}/${maxWaves} cleared +${fmt(waveBonus)}c bonus +${intPct}% bank`);
      wave++;
      wait = gs.waitTime;
      calcWavePreview();
    }
  }
  if (core <= 0 && dead === 0) {
    dead = 1;
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    showNote(`Defeated at wave ${wave}/${maxWaves}`, 999);
    mkBar();
    tip.style.opacity = 0;
  }
}

function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.drawImage(bg, 0, 0, w, h);
  drawDynBg();
  // Draw enemies
  for (let i = 0; i < en; i++) {
    const cnt = ec[i];
    if (cnt <= 0) continue;
    // Cloak: semi-transparent when cloaked
    const isCloaked = !eboss[i] && E[et[i]].ab === 'cloak' && ep[i] < 0.15;
    if (isCloaked) ctx.globalAlpha = 0.25;
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
    if (isCloaked) ctx.globalAlpha = 1;
    // Health bar
    const max = ec[i] * ehu[i];
    const p = max > 0 ? eh[i] / max : 0;
    const barW = Math.max(24, size + 8);
    const barY = ey[i] - size * 0.5 - 10;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.fillRect(ex[i] - barW * 0.5, barY, barW, 5);
    ctx.fillStyle = eboss[i] ? 'rgba(255,190,100,.9)' : 'rgba(255,120,120,.9)';
    ctx.fillRect(ex[i] - barW * 0.5, barY, barW * p, 5);
    ctx.globalAlpha = 1;
    // Status effect indicators
    let fxY = barY - 6;
    if (eSlow[i] > 0) { ctx.fillStyle = 'rgba(100,180,255,.8)'; ctx.fillRect(ex[i] - 6, fxY, 4, 4); fxY -= 5; }
    if (eBurn[i] > 0) { ctx.fillStyle = 'rgba(255,120,40,.8)'; ctx.fillRect(ex[i] - 1, fxY, 4, 4); fxY -= 5; }
    if (eExpose[i] > 0) { ctx.fillStyle = 'rgba(255,255,100,.8)'; ctx.fillRect(ex[i] + 4, fxY, 4, 4); fxY -= 5; }
    if (eGlitch[i] > 0) { ctx.fillStyle = 'rgba(200,100,255,.8)'; ctx.fillRect(ex[i] - 4, fxY, 4, 4); }
    // Ability indicator
    const ab = eboss[i] ? '' : E[et[i]].ab;
    if (ab) {
      ctx.globalAlpha = 0.6;
      ctx.font = '8px monospace';
      ctx.fillStyle = ab === 'armor' ? '#aaa' : ab === 'phase' ? '#aef' : ab === 'cloak' ? '#caf' : '#fc8';
      ctx.textAlign = 'center';
      ctx.fillText(ab === 'armor' ? 'A' : ab === 'phase' ? 'P' : ab === 'cloak' ? 'C' : 'S', ex[i], ey[i] + size * 0.5 + 10);
      ctx.globalAlpha = 1;
    }
  }
  // Draw friendly units
  for (let i = 0; i < fn; i++) {
    let x, y;
    const ftype = ft[i];
    if (ftype === 3) {
      x = fxp[i]; y = fyp[i];
    } else {
      const u = fp[i] * (ps - 1);
      let j = u | 0; let f = u - j;
      if (j >= ps - 1) { j = ps - 2; f = 1; }
      x = px[j] + (px[j + 1] - px[j]) * f;
      y = py[j] + (py[j + 1] - py[j]) * f;
    }
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = ftype === 2 ? 'rgba(255,180,120,.9)' : ftype === 3 ? 'rgba(180,255,160,.9)' : 'rgba(160,240,255,.9)';
    ctx.beginPath();
    ctx.arc(x, y, ftype === 3 ? 4.5 : ftype === 2 ? 4 : 3.2, 0, 6.283);
    ctx.fill();
    if (ftype === 3) {
      ctx.strokeStyle = 'rgba(180,255,160,.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, 6.283);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // Draw towers
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
    // Synergy indicator
    if (synBonus[i] > 1.01) {
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = 'rgba(180,255,180,.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, sz * 0.5 + 7, 0, 6.283);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (synBonus[i] < 0.99) {
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = 'rgba(255,180,180,.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, sz * 0.5 + 7, 0, 6.283);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
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
      ctx.arc(x, y, sz * 0.5 + 4, 0, 6.283);
      ctx.stroke();
    }
  }
  // Draw particles
  for (let i = 0; i < MP; i++) {
    if (partLife[i] <= 0) continue;
    const a = Math.min(1, partLife[i] / partMaxLife[i]);
    ctx.globalAlpha = a * 0.9;
    ctx.fillStyle = `rgb(${partR[i]},${partG[i]},${partB[i]})`;
    ctx.beginPath();
    ctx.arc(partX[i], partY[i], 1.5 + a * 1.5, 0, 6.283);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Draw wave preview (between waves)
  if (menu.style.display === 'none' && !dead && (wait > 0 || (en === 0 && pendingPacks === 0))) {
    const prevX = w - 10;
    const prevY = playTopInset + 6;
    ctx.textAlign = 'right';
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = 'rgba(200,230,255,.85)';
    ctx.fillText(`Next: Wave ${wave}`, prevX, prevY + 12);
    let row = 0;
    for (let i = 0; i < nextWaveInfo.length; i++) {
      const inf = nextWaveInfo[i];
      const yy = prevY + 26 + row * 16;
      ctx.font = '12px monospace';
      ctx.fillStyle = 'rgba(220,240,255,.75)';
      const abLabel = inf.ab ? ` [${inf.ab}]` : '';
      ctx.fillText(`${inf.icon} x${inf.count}${abLabel}`, prevX, yy);
      row++;
    }
    if (nextWaveBoss) {
      ctx.fillStyle = 'rgba(255,200,100,.85)';
      ctx.fillText(`${B.i} BOSS`, prevX, prevY + 26 + row * 16);
      row++;
    }
    if (nextWaveMega) {
      ctx.fillStyle = 'rgba(255,100,100,.9)';
      ctx.fillText(`${MB.i} MEGA BOSS`, prevX, prevY + 26 + row * 16);
    }
    ctx.textAlign = 'left';
  }
  // Cursor
  if (!dead && menu.style.display === 'none') {
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#bff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(mx, my, 14, 0, 6.283);
    ctx.stroke();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#bff';
    ctx.beginPath();
    ctx.arc(mx, my, 14, 0, 6.283);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Game over summary (Feature 6)
  if (dead && menu.style.display === 'none') {
    const elapsed = ((performance.now() - runStartTime) / 1000) | 0;
    const minutes = (elapsed / 60) | 0;
    const seconds = elapsed % 60;
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = dead === 2 ? 'rgba(120,255,180,.95)' : 'rgba(255,140,140,.95)';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(dead === 2 ? 'VICTORY' : 'DEFEATED', cx, cy - 80);
    ctx.fillStyle = 'rgba(220,240,255,.85)';
    ctx.font = '16px monospace';
    ctx.fillText(`${DIFF[diff].n} | ${MAPS[mapIdx].n} | Wave ${wave}/${maxWaves}`, cx, cy - 50);
    ctx.font = '13px monospace';
    ctx.fillStyle = 'rgba(200,220,240,.75)';
    const lines = [
      `Enemies destroyed: ${fmt(runTotalKills)}`,
      `Total damage dealt: ${fmt(runTotalDmg)}`,
      `Towers placed: ${tn}`,
      `Time: ${minutes}m ${seconds}s`,
    ];
    // Find MVP tower
    let mvpIdx = -1; let mvpDmg = 0;
    for (let i = 0; i < tn; i++) { if (tDmg[i] > mvpDmg) { mvpDmg = tDmg[i]; mvpIdx = i; } }
    if (mvpIdx >= 0) {
      lines.push(`MVP: ${T[tt[mvpIdx]].i} ${T[tt[mvpIdx]].n} + ${W[tw[mvpIdx]].i} ${W[tw[mvpIdx]].n} (${fmt(tDmg[mvpIdx])} dmg, ${fmt(tKills[mvpIdx])} kills)`);
    }
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], cx, cy - 16 + i * 22);
    }
    ctx.fillStyle = 'rgba(180,200,220,.6)';
    ctx.font = '12px monospace';
    ctx.fillText('Press R or click restart to play again', cx, cy + lines.length * 22);
    ctx.textAlign = 'left';
    // Save personal best stats (once per game over)
    if (!statsSaved) {
      statsSaved = true;
      try {
        const statsKey = 'galactic_td_stats';
        let stats = {};
        try { stats = JSON.parse(localStorage.getItem(statsKey)) || {}; } catch {}
        stats.totalGames = (stats.totalGames || 0) + 1;
        if (!stats.bestWave || wave > stats.bestWave) stats.bestWave = wave;
        if (!stats.bestDiff || diff > stats.bestDiff) stats.bestDiff = diff;
        stats.totalKills = (stats.totalKills || 0) + runTotalKills;
        localStorage.setItem(statsKey, JSON.stringify(stats));
      } catch {}
    }
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
  if (upHold && sel >= 0) {
    upAccum += raw * 1000;
    if (upAccum >= upDelay) {
      upgrade(sel);
      upAccum = 0;
      if (upDelay > 30) upDelay = Math.max(30, upDelay * 0.82);
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

let upHold = 0;
let upDelay = 0;
let upAccum = 0;
upB.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (sel >= 0) upgrade(sel);
  upHold = 1;
  upDelay = 400;
  upAccum = 0;
});
const stopUpHold = () => { upHold = 0; };
upB.addEventListener('pointerup', stopUpHold);
upB.addEventListener('pointercancel', stopUpHold);
upB.addEventListener('pointerleave', stopUpHold);

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
    if (paused) showNote('Paused', 1.2);
    e.preventDefault();
    mkBar();
  } else if (k === 'u' || k === 'U') {
    if (sel >= 0) upgrade(sel);
  } else if (k === 'r' || k === 'R') {
    try { localStorage.removeItem(SAVE_KEY); } catch {}
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
  tip.textContent = b.dataset.tip;
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

const SAVE_KEY = 'galactic_td_save';

pauseBtn.onclick = () => {
  if (menu.style.display !== 'none') return;
  paused = !paused;
  if (paused) showNote('Paused', 1.2);
  mkBar();
};

restartBtn.onclick = () => {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
  menu.style.display = 'grid';
  applySel();
  tip.style.opacity = 0;
};

function saveGame() {
  if (menu.style.display !== 'none' || dead) return;
  const s = {
    v: 3, wave, money, bank, core, best, sel, st, sw, paused,
    speedIdx, timeScale, wait, pendingPacks, spawnTick, bossPending, megaPending,
    diff, maxWaves, mapIdx,
    selT, selW,
    tn, tt: Array.from(tt.subarray(0, tn)), tw: Array.from(tw.subarray(0, tn)),
    tx: Array.from(tx.subarray(0, tn)), ty: Array.from(ty.subarray(0, tn)),
    tier: Array.from(tier.subarray(0, tn)), heat: Array.from(heat.subarray(0, tn)),
    cd: Array.from(cd.subarray(0, tn)), thp: Array.from(thp.subarray(0, tn)),
    tKills: Array.from(tKills.subarray(0, tn)), tDmg: Array.from(tDmg.subarray(0, tn)),
    en, ep: Array.from(ep.subarray(0, en)), et: Array.from(et.subarray(0, en)),
    ec: Array.from(ec.subarray(0, en)), ehu: Array.from(ehu.subarray(0, en)),
    eh: Array.from(eh.subarray(0, en)), es: Array.from(es.subarray(0, en)),
    eb: Array.from(eb.subarray(0, en)), ek: Array.from(ek.subarray(0, en)),
    eboss: Array.from(eboss.subarray(0, en)),
    eBaseSpd: Array.from(eBaseSpd.subarray(0, en)),
    eSlow: Array.from(eSlow.subarray(0, en)), eBurn: Array.from(eBurn.subarray(0, en)),
    eBurnDmg: Array.from(eBurnDmg.subarray(0, en)), eExpose: Array.from(eExpose.subarray(0, en)),
    eGlitch: Array.from(eGlitch.subarray(0, en)), eShatter: Array.from(eShatter.subarray(0, en)),
    fn, fp: Array.from(fp.subarray(0, fn)), fs: Array.from(fs.subarray(0, fn)),
    fd: Array.from(fd.subarray(0, fn)), fl: Array.from(fl.subarray(0, fn)),
    fcd: Array.from(fcd.subarray(0, fn)), ft: Array.from(ft.subarray(0, fn)),
    fxp: Array.from(fxp.subarray(0, fn)), fyp: Array.from(fyp.subarray(0, fn)),
    runTotalKills, runTotalDmg, runStartTime,
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch {}
}

function loadGame() {
  let s;
  try { s = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return false; }
  if (!s || (s.v !== 1 && s.v !== 2 && s.v !== 3)) return false;
  diff = s.diff ?? 2; maxWaves = s.maxWaves ?? 40; mapIdx = s.mapIdx ?? 0;
  selT = s.selT; selW = s.selW; st = s.st; sw = s.sw;
  wave = s.wave; money = s.money; bank = s.bank; core = s.core; best = s.best;
  sel = s.sel; paused = 1; wait = s.wait;
  pendingPacks = s.pendingPacks; spawnTick = s.spawnTick;
  bossPending = s.bossPending; megaPending = s.megaPending;
  tn = s.tn;
  for (let i = 0; i < tn; i++) {
    tx[i] = s.tx[i]; ty[i] = s.ty[i]; tt[i] = s.tt[i]; tw[i] = s.tw[i];
    tier[i] = s.tier[i]; heat[i] = s.heat[i]; cd[i] = s.cd[i]; thp[i] = s.thp[i];
    bt[i] = 0;
    tKills[i] = s.tKills ? s.tKills[i] : 0;
    tDmg[i] = s.tDmg ? s.tDmg[i] : 0;
    synBonus[i] = 1;
  }
  en = s.en;
  for (let i = 0; i < en; i++) {
    ep[i] = s.ep[i]; et[i] = s.et[i]; ec[i] = s.ec[i]; ehu[i] = s.ehu[i];
    eh[i] = s.eh[i]; es[i] = s.es[i]; eb[i] = s.eb[i]; ek[i] = s.ek[i];
    eboss[i] = s.eboss[i];
    eBaseSpd[i] = s.eBaseSpd ? s.eBaseSpd[i] : s.es[i];
    eSlow[i] = s.eSlow ? s.eSlow[i] : 0;
    eBurn[i] = s.eBurn ? s.eBurn[i] : 0;
    eBurnDmg[i] = s.eBurnDmg ? s.eBurnDmg[i] : 0;
    eExpose[i] = s.eExpose ? s.eExpose[i] : 0;
    eGlitch[i] = s.eGlitch ? s.eGlitch[i] : 0;
    eShatter[i] = s.eShatter ? s.eShatter[i] : 0;
    const u = ep[i] * (ps - 1);
    let j = u | 0; let f = u - j;
    if (j >= ps - 1) { j = ps - 2; f = 1; }
    ex[i] = px[j] + (px[j + 1] - px[j]) * f;
    ey[i] = py[j] + (py[j + 1] - py[j]) * f;
  }
  fn = s.fn;
  for (let i = 0; i < fn; i++) {
    fp[i] = s.fp[i]; fs[i] = s.fs[i]; fd[i] = s.fd[i]; fl[i] = s.fl[i]; fcd[i] = s.fcd[i];
    ft[i] = s.ft ? s.ft[i] : 1; fxp[i] = s.fxp ? s.fxp[i] : 0; fyp[i] = s.fyp ? s.fyp[i] : 0;
  }
  runTotalKills = s.runTotalKills || 0;
  runTotalDmg = s.runTotalDmg || 0;
  runStartTime = s.runStartTime || performance.now();
  pn = 0; pHead = 0;
  setSpeed(s.speedIdx);
  dead = 0;
  calcSynergies();
  calcWavePreview();
  localStorage.removeItem(SAVE_KEY);
  return true;
}

addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
addEventListener('pagehide', saveGame);

loadAdmin();
setSpeed(0);
applySel();
mkDiffBtns();
resize();
ui();
mkBar();


if (loadGame()) {
  menu.style.display = 'none';
  resize();
  applySel();
  mkBar();
  ui();
  showNote('Game restored — paused', 2.5);
}
lt = performance.now();
requestAnimationFrame(loop);
