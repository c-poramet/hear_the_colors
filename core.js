(() => {
const TAU = Math.PI * 2, cl = (v, a, b) => Math.min(b, Math.max(a, v));
const DEF = { shift: 0, mir: 0, sg: .75, sb: .15, lg: .4, lb: .3 }, KEY = 'colorseed.v1';
const C = window.C = { DEF, cl };

/* ---------- seed (calibration) ---------- */
C.load = () => { try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY)) } } catch (e) { return { ...DEF } } };
C.save = p => { try { localStorage.setItem(KEY, JSON.stringify(p)) } catch (e) {} };
C.enc = p => '1.' + [((Math.round(p.shift) % 360) + 360) % 360, p.mir ? 1 : 0, Math.round(p.sg * 100),
  Math.round(p.sb * 100) + 100, Math.round(p.lg * 100), Math.round(p.lb * 100) + 100].join('.');
C.dec = s => {
  const a = String(s).trim().split('.');
  if (a[0] !== '1' || a.length !== 7) return null;
  const n = a.slice(1).map(Number);
  if (n.some(x => !isFinite(x))) return null;
  return { shift: n[0] % 360, mir: n[1] ? 1 : 0, sg: cl(n[2] / 100, 0, 1.5), sb: cl((n[3] - 100) / 100, -1, 1),
    lg: cl(n[4] / 100, 0, 1), lb: cl((n[5] - 100) / 100, -1, 1) };
};
C.fromHash = () => { const m = location.hash.match(/c=([\d.]+)/), p = m && C.dec(m[1]); if (p) C.save(p); return p };
C.yearMode = () => { try { return localStorage.getItem('colorseed.year') === '1' } catch (e) { return false } };
C.logicMode = () => { try { return localStorage.getItem('colorseed.logic') === 'smooth' ? 'smooth' : 'legacy' } catch (e) { return 'legacy' } };
C.setLogicMode = mode => {
  const v = mode === 'smooth' ? 'smooth' : 'legacy', cur = lsj ? lsj('colorseed.bday.cur', null) : null;
  try { localStorage.setItem('colorseed.logic', v) } catch (e) {}
  C.updateLogicIndicator();
  if (cur && cur.d && C._p && C.onSeed) { const p = C.bdayUse(cur.d); C.save(p); C.onSeed(p) }
};
C.updateLogicIndicator = () => document.querySelectorAll('[data-logic-indicator]').forEach(el => {
  const legacy = C.logicMode() === 'legacy';
  el.textContent = legacy ? 'LEGACY' : 'SMOOTH';
  el.classList.toggle('on', !legacy);
  el.classList.toggle('off', legacy);
  el.setAttribute('aria-label', legacy ? 'Legacy birthday logic' : 'Smooth birthday logic');
});
C.updateYearIndicator = () => document.querySelectorAll('[data-year-indicator]').forEach(el => {
  const on = C.yearMode();
  el.textContent = 'YEAR ' + (on ? 'ON' : 'OFF');
  el.classList.toggle('on', on);
  el.classList.toggle('off', !on);
  el.setAttribute('aria-label', 'Include year ' + (on ? 'on' : 'off'));
});
C.setYearMode = v => { try { localStorage.setItem('colorseed.year', v ? '1' : '0') } catch (e) {} C.updateYearIndicator() };
const R5 = [.8566748838545029, .7338918566271260, .6287067210378087, .5385972572236101, .4614027427763898, .3819660112501051];
C.fromDate = (d, y = C.yearMode()) => {
  if (C.logicMode() === 'smooth') {
    const day = Math.floor(Date.parse(d + 'T00:00:00Z') / 864e5);
    const yearDay = (Date.UTC(2000, +d.slice(5, 7) - 1, +d.slice(8, 10)) - Date.UTC(2000, 0, 1)) / 864e5;
    const u = y ? day / 365.2425 : yearDay / 365.2425;
    const wave = (period, phase = 0) => (Math.sin(TAU * u / period + phase) + 1) / 2;
    return C.dec(C.enc({
      shift: ((u * 360) % 360 + 360) % 360,
      mir: 0,
      sg: .55 + wave(y ? 5 : 1, 1.4) * .45,
      sb: .18 + wave(y ? 3 : 1, 2.2) * .28,
      lg: .2 + wave(y ? 7 : 1, 3.1) * .55,
      lb: -.08 + wave(y ? 4 : 1, 4.2) * .36
    }));
  }
  // LEGACY: neighbouring dates intentionally use a low-discrepancy sequence.
  let n, u = null; if (y) n = Math.floor(Date.parse(d + 'T00:00:00Z') / 864e5); else { n = Math.round((Date.UTC(2000, +d.slice(5, 7) - 1, +d.slice(8, 10)) - Date.UTC(2000, 0, 1)) / 864e5); u = (n * 313 % 366) / 366 }
  const f = a => { const v = n * a; return v - Math.floor(v) };
  return C.dec(C.enc({ shift: (u ?? f(R5[0])) * 360, mir: f(R5[5]) > .5 ? 1 : 0, sg: .4 + f(R5[1]) * .6, sb: f(R5[2]) * .3, lg: .25 + f(R5[3]) * .35, lb: .12 + f(R5[4]) * .28 })) };

/* ---------- birthdays ---------- */
const dmy = iso => iso.slice(8) + '/' + iso.slice(5, 7) + (iso.startsWith('0000') ? '' : '/' + iso.slice(0, 4));
const longD = iso => { const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']; return +iso.slice(8) + ' ' + months[+iso.slice(5, 7) - 1] + (iso.startsWith('0000') ? '' : ' ' + iso.slice(0, 4)) };
C.fmtD = dmy; C.fmtLongD = longD; C.dkey = iso => C.yearMode() ? iso : '0000' + iso.slice(4); // year-less dates are stored as 0000-MM-DD
C.parseDMY = s => { const m = String(s).trim().match(/^(\d{1,2})[\/.\-\s](\d{1,2})(?:[\/.\-\s](\d{4}))?$/); if (!m) return null;
  const d = +m[1], mo = +m[2], y = m[3] ? +m[3] : C.yearMode() ? 0 : 2000; if (!y) return null; const t = new Date(Date.UTC(y, mo - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return null;
  return (m[3] ? m[3] : '0000') + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0') };
let BD = [null, null], BDB = [0, 0]; // seed code -> every date that generates it, one map per mode (366 days, or 1900-2030), built in small chunks
C.bdays = code => { const m = BD[+C.yearMode()]; return m ? (m.get(code) || []) : [] };
C.bdayBuild = cb => { const y = +C.yearMode(); if (BD[y] || BDB[y]) return; BDB[y] = 1; const m = new Map(), a = Date.UTC(y ? 1900 : 2000, 0, 1) / 864e5, z = y ? Date.UTC(2030, 11, 31) / 864e5 : a + 365; let n = a;
  const step = () => { for (let i = 0; i < 1500 && n <= z; i++, n++) { const t = new Date(n * 864e5).toISOString().slice(0, 10), iso = y ? t : '0000' + t.slice(4), k = C.enc(C.fromDate(iso, !!y)); m.has(k) ? m.get(k).push(iso) : m.set(k, [iso]) }
    if (n <= z) setTimeout(step); else { BD[y] = m; cb && cb() } };
  step() };
// closeness of two seeds = average distance between the colours a fixed set of probe songs would get
C.probe = p => { const o = []; for (let a = 0; a < 360; a += 45) for (const [s, l] of [[.3, .3], [.7, .6]]) { const c = C.color({ hx: Math.cos(a * Math.PI / 180), hy: Math.sin(a * Math.PI / 180), s0: s, l0: l }, p), r = c.h * Math.PI / 180; o.push([c.s * Math.cos(r), c.s * Math.sin(r), c.l]) } return o };
C.nearDates = (p, y, cb, n = 12) => { const T = C.probe(p), out = [], a = Date.UTC(y ? 1900 : 2000, 0, 1) / 864e5, z = y ? Date.UTC(2030, 11, 31) / 864e5 : a + 365; let i = a;
  const step = () => { for (let k = 0; k < 800 && i <= z; k++, i++) { const t = new Date(i * 864e5).toISOString().slice(0, 10), d = y ? t : '0000' + t.slice(4), Q = C.probe(C.fromDate(d, y));
      out.push({ d, dist: Q.reduce((s, q, j) => s + Math.hypot(q[0] - T[j][0], q[1] - T[j][1], q[2] - T[j][2]), 0) / Q.length }) }
    if (i <= z) setTimeout(step); else { out.sort((u, v) => u.dist - v.dist); cb(out.slice(0, n).map(x => ({ d: x.d, pct: Math.round(Math.max(0, 1 - x.dist / .8) * 100) }))) } };
  step() };
const BHK = 'colorseed.bdays.v1', BCK = 'colorseed.bday.cur';
const lsj = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d } catch (e) { return d } }, lss = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} };
const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
C.bdayHist = () => lsj(BHK, []);
C.bdayUse = iso => { const p = C.fromDate(iso), H = C.bdayHist(), i = H.findIndex(x => x.d === iso), e = i >= 0 ? H.splice(i, 1)[0] : { d: iso, label: '' };
  H.unshift(e); lss(BHK, H.slice(0, 30)); lss(BCK, { d: iso, code: C.enc(p) }); return p };

/* ---------- small shared UI helpers ---------- */
C.toast = msg => { let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t) }
  t.textContent = msg; t.classList.add('show'); clearTimeout(C._tt); C._tt = setTimeout(() => t.classList.remove('show'), 1800) };
C.copy = t => { const old = () => { const a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy') } catch (e) {} a.remove() };
  return navigator.clipboard ? navigator.clipboard.writeText(t).catch(old) : Promise.resolve(old()) };
C.rr = (g, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath() };

/* ---------- birthday tag + popover (current, history, labels) ---------- */
const bPlace = () => { const pop = document.getElementById('bpop'), r = document.getElementById('bday').getBoundingClientRect(),
    w = Math.min(320, innerWidth - 16), cx = r.left + r.width / 2, left = cl(cx - w / 2, 8, innerWidth - w - 8);
  pop.style.width = w + 'px'; pop.style.left = left + 'px'; pop.style.top = r.bottom + 10 + 'px'; pop.style.setProperty('--cx', cx - left + 'px') };
const BSK = 'colorseed.bday.sort', SORTS = [['recent', 'Recent use'], ['new', 'Date, newest'], ['old', 'Date, oldest'], ['label', 'Label A–Z']];
const bSort = () => { const v = lsj(BSK, 'recent'); return SORTS.some(x => x[0] === v) ? v : 'recent' };
const bSorted = H => { const k = bSort(), a = H.slice(); // H is stored most-recently-used first; sort() is stable, so ties keep that order
  if (k === 'new') a.sort((x, y) => x.d < y.d ? 1 : x.d > y.d ? -1 : 0);
  else if (k === 'old') a.sort((x, y) => x.d < y.d ? -1 : x.d > y.d ? 1 : 0);
  else if (k === 'label') a.sort((x, y) => !x.label !== !y.label ? (x.label ? -1 : 1) : (x.label || '').localeCompare(y.label || ''));
  return a };
C.toggleYearMode = () => {
  const cur = lsj(BCK, null), was = cur && C._p && cur.code === C.enc(C._p);
  C.setYearMode(!C.yearMode());
  if (was) { const p = C.bdayUse(cur.d); C.save(p); C.onSeed ? C.onSeed(p) : C.seedTag(p) }
  else { C.seedTag(C._p); if (document.getElementById('bpop') && !document.getElementById('bpop').hidden) bRender() }
};
C.stepBirthday = direction => {
  const H = bSorted(C.bdayHist()); if (!H.length) return false;
  const cur = lsj(BCK, null), index = cur ? H.findIndex(x => x.d === cur.d) : -1;
  const next = H[(index < 0 ? direction > 0 ? 0 : H.length - 1 : (index + direction + H.length) % H.length)];
  const p = C.bdayUse(next.d); C.save(p); C.toast('Using ' + dmy(next.d)); C.onSeed ? C.onSeed(p) : C.seedTag(p); return true;
};
// header tag: BIRTHDAY · label ×N  (label of the date in use, else of a labelled date matching this seed)
const tagUpdate = () => { const b = document.getElementById('bday'); if (!b || !C._p) return;
  const code = C.enc(C._p), d = C.bdays(code), cur = lsj(BCK, null), H = C.bdayHist(),
    used = cur && cur.code === code ? H.find(x => x.d === cur.d) : null, hit = used || H.find(x => d.includes(C.dkey(x.d)) && x.label), lab = hit && hit.label;
  b.classList.toggle('on', d.length > 0 || !!(cur && cur.code === code));
  b.textContent = 'BIRTHDAY' + (lab ? ' · ' + lab : '') + (d.length > 1 ? ' ×' + d.length : '');
  b.title = hit ? 'Birthday ' + dmy(hit.d) + (lab ? ' – ' + lab : '') : b.classList.contains('on') ? 'This seed comes from a birthday' : 'Birthday seeds' };
const bRender = () => {
  const code = C.enc(C._p), cur = lsj(BCK, null), H = C.bdayHist(), m = C.bdays(code), used = cur && cur.code === code ? cur.d : null, pop = document.getElementById('bpop');
  const chips = l => `<div class="bp-chips">${l.slice(0, 12).map(x => `<button class="bp-chip" data-a="use" data-d="${x}">${dmy(x)}</button>`).join('')}</div>` + (l.length > 12 ? `<div class="bp-note">+${l.length - 12} more</div>` : '');
  const lab = H.find(x => x.d === used), others = m.filter(x => x !== (used && C.dkey(used)));
  const top = used ? `<div class="bp-cur"><span class="bp-date">${dmy(used)}</span><span class="bp-lab-cur">${lab && lab.label ? esc(lab.label) : 'in use'}</span></div>`
      + (others.length ? `<div class="bp-note">${others.length} other date${others.length > 1 ? 's' : ''} give the same seed:</div>` + chips(others) : '')
    : m.length ? `<div class="bp-note">This seed matches ${m.length > 1 ? m.length + ' birthdays' : 'a birthday'}. Pick one to keep it in your history:</div>` + chips(m)
    : '<div class="bp-note">This seed does not come from a birthday. Add one below to switch to it.</div>';
  const rows = H.length ? bSorted(H).map(x => `<div class="bp-row${x.d === used ? ' cur' : ''}" data-d="${x.d}"><button class="bp-date" data-a="use" title="Use this birthday">${dmy(x.d)}</button><input class="bp-lab" data-a="label" maxlength="24" placeholder="Add a label" value="${esc(x.label || '')}" aria-label="Label for ${dmy(x.d)}"><button class="btn-reset bp-del" data-a="del" title="Remove" aria-label="Remove ${dmy(x.d)}">✕</button></div>`).join('')
    : '<div class="bp-note">Nothing saved yet. Birthdays you use appear here.</div>';
  pop.innerHTML = `<div class="bp-scroll"><div class="bp-sec"><div class="bp-title">In use</div>${top}</div>
    <div class="bp-sec"><div class="bp-title bp-title-row"><span>History</span><select class="bp-sort" data-a="sort" aria-label="Sort history">${SORTS.map(o => `<option value="${o[0]}"${o[0] === bSort() ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></div>${rows}</div>
    <div class="bp-sec"><div class="bp-title">Add a birthday</div><div class="bp-add"><input class="field" id="bpin" placeholder="${C.yearMode() ? 'dd/mm/yyyy' : 'dd/mm, year ignored'}" inputmode="numeric" maxlength="10" aria-label="Birthdate"><button class="btn-reset" data-a="add">Use</button></div><div class="toggle-row"><span class="toggle-label">Include year in seed</span><label class="toggle-switch"><input type="checkbox" data-a="yr" aria-label="Include year in seed"${C.yearMode() ? ' checked' : ''}><span class="toggle-track"></span></label></div></div></div>`;
};
C.seedTag = p => { const el = id => document.getElementById(id), code = C.enc(p), b = el('bday'), d = C.bdays(code); C._p = p; C.bdayBuild(() => C.seedTag(C._p));
  C.updateYearIndicator();
  const cur = lsj(BCK, null), active = cur && cur.code === code ? cur.d : null;
  el('tag').textContent = 'SEED ' + code + (active ? ' · ' + C.fmtLongD(active) : '');
  let pop = el('bpop');
  if (!pop) { pop = document.createElement('div'); pop.id = 'bpop'; pop.className = 'bday-pop'; pop.hidden = true; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Birthday seeds'); document.body.appendChild(pop);
    const shut = () => { pop.hidden = true; b.setAttribute('aria-expanded', 'false') };
    b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-expanded', 'false');
    b.onclick = () => { pop.hidden = !pop.hidden; b.setAttribute('aria-expanded', String(!pop.hidden)); if (!pop.hidden) { bRender(); bPlace() } };
    addEventListener('click', e => { const path = e.composedPath(); if (!pop.hidden && !path.includes(pop) && !path.includes(b)) shut() });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) shut() });
    addEventListener('resize', () => { if (!pop.hidden) bPlace() });
    const use = iso => { const q = C.bdayUse(iso); C.save(q); C.toast('Using ' + dmy(iso)); C.onSeed ? C.onSeed(q) : C.seedTag(q) };
    pop.addEventListener('click', e => { const a = e.target.closest('[data-a]'); if (!a) return; const act = a.dataset.a;
      if (act === 'use') use(a.dataset.d || a.closest('.bp-row').dataset.d);
      else if (act === 'del') { const d = a.closest('.bp-row').dataset.d; lss(BHK, C.bdayHist().filter(x => x.d !== d)); bRender(); tagUpdate() }
      else if (act === 'add') { const iso = C.parseDMY(pop.querySelector('#bpin').value); iso ? use(iso) : C.toast('Enter a real date as dd/mm/yyyy') } });
    pop.addEventListener('input', e => { const t = e.target;
      if (t.dataset.a === 'label') { const d = t.closest('.bp-row').dataset.d, H = C.bdayHist(), x = H.find(y => y.d === d); if (x) { x.label = t.value.trim(); lss(BHK, H); tagUpdate() } }
      if (t.id === 'bpin') { const v = t.value.replace(/\D/g, '').slice(0, 8); t.value = [v.slice(0, 2), v.slice(2, 4), v.slice(4)].filter(Boolean).join('/') } });
    pop.addEventListener('change', e => { const a = e.target.dataset.a; if (a === 'sort') { lss(BSK, e.target.value); bRender() }
      else if (a === 'yr') { const cur = lsj(BCK, null), was = cur && cur.code === C.enc(C._p); C.setYearMode(e.target.checked); if (was) use(cur.d); else { C.seedTag(C._p); bRender() } } });
    pop.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'bpin') pop.querySelector('[data-a=add]').click() }) }
  tagUpdate();
  if (!pop.hidden) { bRender(); bPlace() } };

/* ---------- cover art (embedded tags, via jsmediatags) -> 96px jpeg data url ---------- */
C.cover = f => new Promise(res => { if (!window.jsmediatags) return res(null);
  try { jsmediatags.read(f, { onError: () => res(null), onSuccess: t => { const p = t.tags && t.tags.picture; if (!p) return res(null);
    const url = URL.createObjectURL(new Blob([new Uint8Array(p.data)], { type: p.format || 'image/jpeg' })), im = new Image();
    im.onerror = () => { URL.revokeObjectURL(url); res(null) };
    im.onload = () => { const S = 192, k = Math.min(im.width, im.height), c = document.createElement('canvas'); c.width = c.height = S;
      c.getContext('2d').drawImage(im, (im.width - k) / 2, (im.height - k) / 2, k, k, 0, 0, S, S); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', .72)) };
    im.src = url } }) } catch (e) { res(null) } });

/* ---------- colour ---------- */
const hsl2rgb = (h, s, l) => { const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map(n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))))) };
C.color = (f, p) => { const a = Math.atan2(f.hy, f.hx) * 180 / Math.PI;
  return { a, h: (((p.mir ? -a : a) + p.shift) % 360 + 360) % 360, s: cl(p.sb + p.sg * f.s0, 0, 1), l: cl(p.lb + p.lg * f.l0, .05, .95) } };
C.css = c => `hsl(${c.h.toFixed(1)} ${(c.s * 100).toFixed(1)}% ${(c.l * 100).toFixed(1)}%)`;
C.hex = c => '#' + hsl2rgb(c.h, c.s, c.l).map(v => v.toString(16).padStart(2, '0')).join('');
C.fromHex = x => { const r = [1, 3, 5].map(i => parseInt(x.substr(i, 2), 16) / 255), mx = Math.max(...r), mn = Math.min(...r), l = (mx + mn) / 2, d = mx - mn;
  let h = 0; if (d) { h = mx == r[0] ? ((r[1] - r[2]) / d + 6) % 6 : mx == r[1] ? (r[2] - r[0]) / d + 2 : (r[0] - r[1]) / d + 4; h *= 60 }
  return { h, s: d ? d / (1 - Math.abs(2 * l - 1)) : 0, l } };

/* ---------- analysis ---------- */
const N = 4096, H = 2048, rev = new Uint16Array(N), cs = new Float64Array(N / 2), sn = new Float64Array(N / 2), win = new Float64Array(N);
for (let i = 0; i < N; i++) { let r = 0; for (let b = 0; b < 12; b++) r |= ((i >> b) & 1) << (11 - b); rev[i] = r; win[i] = .5 - .5 * Math.cos(TAU * i / N) }
for (let i = 0; i < N / 2; i++) { cs[i] = Math.cos(TAU * i / N); sn[i] = -Math.sin(TAU * i / N) }
const re = new Float64Array(N), im = new Float64Array(N);
function fft() { for (let s = 2; s <= N; s <<= 1) { const h = s >> 1, st = N / s;
  for (let i = 0; i < N; i += s) for (let j = 0; j < h; j++) { const w = j * st, a = i + j, b = a + h,
    tr = re[b] * cs[w] - im[b] * sn[w], ti = re[b] * sn[w] + im[b] * cs[w];
    re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti } } }

C.decode = async file => { const ac = new (window.AudioContext || window.webkitAudioContext)(); return ac.decodeAudioData(await file.arrayBuffer()) };

C.analyze = async (buf, prog) => {
  const ch = buf.numberOfChannels, sr = buf.sampleRate, d = [...Array(ch)].map((_, i) => buf.getChannelData(i));
  const n = Math.max(1, Math.floor((buf.length - N) / H) + 1), dt = H / sr;
  const hx = new Float32Array(n), hy = new Float32Array(n), lf = new Float32Array(n), fx = new Float32Array(n), sil = new Uint8Array(n), on = new Uint8Array(n);
  const b40 = Math.ceil(40 * N / sr), lo = Math.ceil(55 * N / sr), hi = Math.floor(2000 * N / sr), top = Math.min(N / 2 - 1, Math.floor(8000 * N / sr));
  const cA = new Float64Array(N / 2), sA = new Float64Array(N / 2), pk = new Uint8Array(N / 2), cv = new Float64Array(12), g12 = new Float64Array(12);
  for (let k = lo; k <= hi; k++) { const pc = ((Math.round(69 + 12 * Math.log2(k * sr / N / 440)) % 12) + 12) % 12, ang = (pc * 7 % 12) * 30 * Math.PI / 180; cA[k] = Math.cos(ang); sA[k] = Math.sin(ang); pk[k] = pc }
  const prev = new Float32Array(N / 2), l40 = Math.log2(40), span = Math.log2(8000) - l40;
  for (let i = 0; i < n; i++) {
    let e = 0; im.fill(0);
    for (let j = 0; j < N; j++) { let x = 0; for (let c = 0; c < ch; c++) x += d[c][i * H + j] || 0; x /= ch; e += x * x; re[rev[j]] = x * win[j] }
    fft();
    let X = 0, Y = 0, cen = 0, cm = 0, fl = 0; cv.fill(0);
    for (let k = b40; k <= top; k++) {
      const m = Math.hypot(re[k], im[k]), q = Math.sqrt(m), v = Math.log1p(m);
      if (k >= lo && k <= hi) { X += q * cA[k]; Y += q * sA[k]; cv[pk[k]] += q }
      cen += m * Math.log2(k * sr / N); cm += m; fl += Math.max(0, v - prev[k]); prev[k] = v;
    }
    const g = Math.hypot(X, Y) || 1; hx[i] = X / g; hy[i] = Y / g; fx[i] = fl;
    lf[i] = cm ? cl(((cen / cm - l40) / span - .35) / .45, 0, 1) : .5;
    sil[i] = Math.sqrt(e / N) < .003 ? 1 : 0;
    if (!sil[i]) { const z = cv.reduce((a, b) => a + b) || 1; for (let p = 0; p < 12; p++) g12[p] += cv[p] / z * dt }
    if (i % 150 === 0) { prog && prog(i / n); await new Promise(r => setTimeout(r)) }
  }
  let mx = 1e-9; for (let i = 0; i < n; i++) mx = Math.max(mx, fx[i]);
  for (let i = 0; i < n; i++) fx[i] /= mx;
  for (let i = 0; i < n; i++) { const a = Math.max(0, i - 10), b = Math.min(n, i + 11); let m = 0; for (let j = a; j < b; j++) m += fx[j]; m /= b - a;
    on[i] = !sil[i] && fx[i] > m * 1.5 + .05 && fx[i] >= (fx[i - 1] || 0) && fx[i] > (fx[i + 1] || 0) ? 1 : 0 }
  const cx = new Float64Array(n + 1), cy = new Float64Array(n + 1), cL = new Float64Array(n + 1), cw = new Float64Array(n + 1), co = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) { const s = !sil[i];
    const w = s ? dt : 0; cx[i + 1] = cx[i] + (s ? hx[i] * w : 0); cy[i + 1] = cy[i] + (s ? hy[i] * w : 0); cL[i + 1] = cL[i] + (s ? lf[i] * w : 0); cw[i + 1] = cw[i] + w; co[i + 1] = co[i] + on[i] * dt }
  return { n, dt, cx, cy, cl: cL, cw, cn: cw, co, lf, on, sil, g12 };
};
// averages over sections [a,b): any slice of a song gets its own colour in O(1)
C.sum = (fr, a = 0, b = fr.n) => { const t = (b - a) * fr.dt || 1, w = fr.cw[b] - fr.cw[a], rate = (fr.co[b] - fr.co[a]) / t;
  return { hx: w ? (fr.cx[b] - fr.cx[a]) / w : 0, hy: w ? (fr.cy[b] - fr.cy[a]) / w : 0, l0: w ? (fr.cl[b] - fr.cl[a]) / w : .5, s0: 1 - Math.exp(-rate / 5), rate } };

/* ---------- wheel ---------- */
C.wheel = (cv, items) => {
  const S = cv.width, R = S / 2 - 16, g = cv.getContext('2d');
  if (!C._bg || C._bg.S !== S) { const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), id = x.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let u = 0; u < S; u++) { const dx = u - S / 2, dy = y - S / 2, r = Math.hypot(dx, dy) / R; if (r > 1) continue;
      const [a, b, d] = hsl2rgb((Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360, r, .5), o = (y * S + u) * 4; id.data.set([a, b, d, 255], o) }
    x.putImageData(id, 0, 0); C._bg = c; c.S = S }
  g.clearRect(0, 0, S, S); g.drawImage(C._bg, 0, 0);
  const P = (h, s) => [S / 2 + R * s * Math.sin(h * Math.PI / 180), S / 2 - R * s * Math.cos(h * Math.PI / 180)];
  g.font = '12px system-ui'; g.textAlign = 'center';
  items.forEach(it => {
    if (it.trail) { g.beginPath(); it.trail.forEach(([h, s], i) => { const [x, y] = P(h, s); i ? g.lineTo(x, y) : g.moveTo(x, y) }); g.strokeStyle = '#fff9'; g.lineWidth = 1.5; g.stroke() }
    const [x, y] = P(it.h, it.s);
    g.beginPath(); g.arc(x, y, it.sel ? 10 : 7, 0, TAU);
    if (it.hollow) { g.lineWidth = 3; g.strokeStyle = it.color; g.stroke(); g.lineWidth = 1; g.strokeStyle = '#000'; g.beginPath(); g.arc(x, y, (it.sel ? 10 : 7) + 2, 0, TAU); g.stroke() }
    else { g.fillStyle = it.color; g.fill(); g.lineWidth = it.sel ? 3 : 2; g.strokeStyle = '#fff'; g.stroke() }
    if (it.label) { g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 3; g.strokeText(it.label, x, y - 14); g.fillText(it.label, x, y - 14) }
  });
};
C.wheelPos = (cv, e) => { const r = cv.getBoundingClientRect(), S = cv.width, k = S / r.width, dx = (e.clientX - r.left) * k - S / 2, dy = (e.clientY - r.top) * k - S / 2;
  return { h: (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360, s: cl(Math.hypot(dx, dy) / (S / 2 - 16), 0, 1) } };

/* ---------- fuzzy fingerprint: similar songs differ in only a few of the 64 bits ---------- */
const SEG = 16;
C.contour = fr => { const L = [], R = [];
  for (let q = 0; q < SEG; q++) { const a = Math.floor(q * fr.n / SEG), b = Math.max(a + 1, Math.floor((q + 1) * fr.n / SEG)); let l = 0, c = 0, o = 0;
    for (let i = a; i < b; i++) { if (!fr.sil[i]) { l += fr.lf[i] * fr.dt; c += fr.dt } o += fr.on[i] * fr.dt }
    L.push(c ? l / c : .5); R.push(1 - Math.exp(-((o / ((b - a) * fr.dt)) / 5)) ) }
  return { L, R } };
C.fingerprint = fr => {
  const { L, R } = C.contour(fr), mean = x => x.reduce((a, b) => a + b) / x.length, tot = fr.g12.reduce((a, b) => a + b) || 1, mL = mean(L), mR = mean(R);
  const v = [...Array.from(fr.g12, x => (x / tot - 1 / 12) * 12), ...L.map(x => (x - mL) * 3), ...R.map(x => (x - mR) * 3)];
  let a = 20260101, h = ''; // fixed hyperplanes: same audio -> same fingerprint everywhere
  const r = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 };
  for (let b = 0; b < 16; b++) { let nib = 0; for (let j = 0; j < 4; j++) { let d = 0; for (let k = 0; k < v.length; k++) d += v[k] * (r() * 2 - 1); nib = nib << 1 | (d > 0 ? 1 : 0) } h += nib.toString(16) }
  return { fp: h, L, R } };
C.sim = (a, b) => { let d = 0; for (let i = 0; i < 16; i++) { let x = parseInt(a[i], 16) ^ parseInt(b[i], 16); while (x) { d += x & 1; x >>= 1 } } return 1 - d / 64 };

/* ---------- history (localStorage) ---------- */
const HK = 'colorseed.history.v1';
C.hist = () => { try { return JSON.parse(localStorage.getItem(HK)) || [] } catch (e) { return [] } };
C.histAdd = (name, fr, art, meta = {}) => {
  const f = C.fingerprint(fr), s = C.sum(fr), H = C.hist(), r = (x, d) => +x.toFixed(d);
  const e = { name, fp: f.fp, L: f.L.map(x => r(x, 2)), R: f.R.map(x => r(x, 2)), raw: { hx: r(s.hx, 4), hy: r(s.hy, 4), l0: r(s.l0, 4), s0: r(s.s0, 4) }, dur: Math.round(fr.n * fr.dt), T: C.traj(fr), t: Date.now(), meta: { artist: meta.artist || '', album: meta.album || '', year: meta.year || '' } };
  const i = H.findIndex(x => x.fp === e.fp || (x.name === name && C.sim(x.fp, e.fp) > .9));
  if (art) e.art = art; else if (i >= 0 && H[i].art) e.art = H[i].art;
  if (i >= 0 && !meta.artist && !meta.album && !meta.year && H[i].meta) e.meta = H[i].meta;
  if (i >= 0) H.splice(i, 1);
  H.unshift(e); C.histSave(H); return { e, H } };
// 40 snapshots of the running colour: lets share cards replay the path a song took
C.traj = fr => Array.from({ length: 40 }, (_, i) => { const s = C.sum(fr, 0, Math.max(1, Math.round(fr.n * (i + 1) / 40))); return [s.hx, s.hy, s.l0, s.s0].map(v => +v.toFixed(3)) });
C.trajColors = (e, p) => (e.T || []).map(t => C.color({ hx: t[0], hy: t[1], l0: t[2], s0: t[3] }, p));
C.histSave = H => { try { localStorage.setItem(HK, JSON.stringify(H.slice(0, 60))) } catch (e) {} };
C.histExport = () => ({ format: 'hear-see-history', version: 1, exportedAt: new Date().toISOString(), songs: C.hist() });
C.histImport = value => {
  const songs = Array.isArray(value) ? value : value && value.format === 'hear-see-history' && value.version === 1 ? value.songs : null;
  if (!Array.isArray(songs)) throw new Error('Unsupported history file');
  const valid = songs.filter(e => {
    if (!e || typeof e !== 'object' || typeof e.name !== 'string' || !/^[0-9a-f]{16}$/i.test(e.fp)) return false;
    if (!Array.isArray(e.L) || !Array.isArray(e.R) || !e.raw || !Number.isFinite(e.dur)) return false;
    if (!['hx', 'hy', 'l0', 's0'].every(k => Number.isFinite(e.raw[k]))) return false;
    if (!e.L.every(Number.isFinite) || !e.R.every(Number.isFinite)) return false;
    if (e.T !== undefined && (!Array.isArray(e.T) || e.T.some(t => !Array.isArray(t) || t.length < 4 || t.slice(0, 4).some(v => !Number.isFinite(v))))) return false;
    return !e.art || (typeof e.art === 'string' && e.art.startsWith('data:image/') && e.art.length <= 2 * 1024 * 1024);
  }).map(e => ({
    name: e.name.slice(0, 240), fp: e.fp.toLowerCase(), L: e.L.slice(0, 64), R: e.R.slice(0, 64),
    raw: { hx: e.raw.hx, hy: e.raw.hy, l0: e.raw.l0, s0: e.raw.s0 }, dur: Math.max(0, Math.round(e.dur)),
    T: Array.isArray(e.T) ? e.T.slice(0, 40).map(t => t.slice(0, 4)) : [], t: Number.isFinite(e.t) ? e.t : Date.now(),
    meta: e.meta && typeof e.meta === 'object' ? { artist: String(e.meta.artist || '').slice(0, 240), album: String(e.meta.album || '').slice(0, 240), year: String(e.meta.year || '').slice(0, 4) } : {},
    ...(e.art ? { art: e.art } : {})
  }));
  const existing = C.hist(), merged = [...valid, ...existing];
  const out = [];
  for (const e of merged) {
    if (out.some(x => x.fp === e.fp || (x.name === e.name && C.sim(x.fp, e.fp) > .9))) continue;
    out.push(e);
    if (out.length === 60) break;
  }
  const added = out.filter(e => !existing.some(x => x.fp === e.fp || (x.name === e.name && C.sim(x.fp, e.fp) > .9))).length;
  C.histSave(out); return { imported: valid.length, added, total: out.length };
};
C.glyph = (cv, e, col) => { // 64 ticks = the fingerprint bits; inner shape = the song's busyness/brightness contour
  const g = cv.getContext('2d'), S = cv.width, c = S / 2; g.clearRect(0, 0, S, S); g.lineCap = 'round'; g.lineWidth = S / 40; g.strokeStyle = col;
  for (let i = 0; i < 64; i++) { const bit = (parseInt(e.fp[i >> 2], 16) >> (3 - (i & 3))) & 1, a = i / 64 * TAU - Math.PI / 2;
    g.globalAlpha = bit ? 1 : .3; g.beginPath(); g.moveTo(c + Math.cos(a) * c * .64, c + Math.sin(a) * c * .64); g.lineTo(c + Math.cos(a) * c * (bit ? .96 : .78), c + Math.sin(a) * c * (bit ? .96 : .78)); g.stroke() }
  g.beginPath(); e.L.forEach((l, i) => { const a = i / SEG * TAU - Math.PI / 2, r = c * (.12 + .4 * (.35 * l + .65 * e.R[i])); const x = c + Math.cos(a) * r, y = c + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y) });
  g.closePath(); g.globalAlpha = .3; g.fillStyle = col; g.fill(); g.globalAlpha = 1; g.lineWidth = S / 64; g.stroke() };

/* ---------- QR ---------- */
C.qr = (cv, t) => { if (!window.qrcode) return false;
  const q = qrcode(0, 'M'); q.addData(t); q.make();
  const n = q.getModuleCount(), s = 6, m = 4, g = cv.getContext('2d'); cv.width = cv.height = (n + 2 * m) * s;
  g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = '#000';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect((c + m) * s, (r + m) * s, s, s);
  return true };
})();
