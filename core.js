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
C.fromDate = d => { // same date -> same seed; consecutive days are spread as far apart as possible
  const n = Math.floor(Date.parse(d + 'T00:00:00Z') / 864e5), f = a => { const v = n * a; return v - Math.floor(v) };
  const [u, v, w, x, y] = [f(.8566748838545029), f(.7338918566271260), f(.6287067210378087), f(.5385972572236101), f(.4614027427763898)];
  return C.dec(C.enc({ shift: u * 360, mir: f(.3819660112501051) > .5 ? 1 : 0, sg: .4 + v * .6, sb: w * .3, lg: .25 + x * .35, lb: .12 + y * .28 }));
};

/* ---------- birthdays ---------- */
const dmy = iso => iso.slice(8) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);
C.parseDMY = s => { const m = String(s).trim().match(/^(\d{1,2})[\/.\-\s](\d{1,2})[\/.\-\s](\d{4})$/); if (!m) return null;
  const d = +m[1], mo = +m[2], y = +m[3], t = new Date(Date.UTC(y, mo - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return null;
  return y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0') };
let BD = null; // seed code -> every date (1900-2030) that generates it; built once, on first use
C.bdays = code => { if (!BD) { BD = new Map();
    for (let n = Date.UTC(1900, 0, 1) / 864e5, z = Date.UTC(2030, 11, 31) / 864e5; n <= z; n++) {
      const iso = new Date(n * 864e5).toISOString().slice(0, 10), k = C.enc(C.fromDate(iso)); BD.has(k) ? BD.get(k).push(iso) : BD.set(k, [iso]) } }
  return BD.get(code) || [] };
C.seedTag = p => { const el = id => document.getElementById(id), code = C.enc(p), b = el('bday'), t = el('tag'), d = C.bdays(code);
  let pop = el('bpop');
  if (!pop) { pop = document.createElement('div'); pop.id = 'bpop'; pop.className = 'bday-pop'; pop.hidden = true; document.body.appendChild(pop);
    b.onclick = () => pop.hidden = !pop.hidden;
    addEventListener('click', e => { if (e.target !== b && !pop.contains(e.target)) pop.hidden = true });
    addEventListener('keydown', e => { if (e.key === 'Escape') pop.hidden = true }) }
  t.textContent = 'SEED ' + code;
  b.hidden = !d.length; if (!d.length) pop.hidden = true;
  b.textContent = d.length > 1 ? 'BIRTHDAY ×' + d.length : 'BIRTHDAY';
  pop.innerHTML = `<div class="bday-head">${d.length > 1 ? d.length + ' birthdays, one seed' : 'Birthday seed'}</div><div class="bday-list">${d.slice(0, 60).map(x => `<span>${dmy(x)}</span>`).join('')}</div>`
    + (d.length > 60 ? `<div class="bday-more">+${d.length - 60} more</div>` : '') };

/* ---------- cover art (embedded tags, via jsmediatags) -> 96px jpeg data url ---------- */
C.cover = f => new Promise(res => { if (!window.jsmediatags) return res(null);
  try { jsmediatags.read(f, { onError: () => res(null), onSuccess: t => { const p = t.tags && t.tags.picture; if (!p) return res(null);
    const url = URL.createObjectURL(new Blob([new Uint8Array(p.data)], { type: p.format || 'image/jpeg' })), im = new Image();
    im.onerror = () => { URL.revokeObjectURL(url); res(null) };
    im.onload = () => { const S = 96, k = Math.min(im.width, im.height), c = document.createElement('canvas'); c.width = c.height = S;
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
    if (!sil[i]) { const z = cv.reduce((a, b) => a + b) || 1; for (let p = 0; p < 12; p++) g12[p] += cv[p] / z }
    if (i % 150 === 0) { prog && prog(i / n); await new Promise(r => setTimeout(r)) }
  }
  let mx = 1e-9; for (let i = 0; i < n; i++) mx = Math.max(mx, fx[i]);
  for (let i = 0; i < n; i++) fx[i] /= mx;
  for (let i = 0; i < n; i++) { const a = Math.max(0, i - 10), b = Math.min(n, i + 11); let m = 0; for (let j = a; j < b; j++) m += fx[j]; m /= b - a;
    on[i] = !sil[i] && fx[i] > m * 1.5 + .05 && fx[i] >= (fx[i - 1] || 0) && fx[i] > (fx[i + 1] || 0) ? 1 : 0 }
  const cx = new Float64Array(n + 1), cy = new Float64Array(n + 1), cL = new Float64Array(n + 1), cn = new Float64Array(n + 1), co = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) { const s = !sil[i];
    cx[i + 1] = cx[i] + (s ? hx[i] : 0); cy[i + 1] = cy[i] + (s ? hy[i] : 0); cL[i + 1] = cL[i] + (s ? lf[i] : 0); cn[i + 1] = cn[i] + (s ? 1 : 0); co[i + 1] = co[i] + on[i] }
  return { n, dt, cx, cy, cl: cL, cn, co, lf, on, sil, g12 };
};
// averages over sections [a,b): any slice of a song gets its own colour in O(1)
C.sum = (fr, a = 0, b = fr.n) => { const n = fr.cn[b] - fr.cn[a], t = (b - a) * fr.dt || 1, rate = (fr.co[b] - fr.co[a]) / t;
  return { hx: n ? (fr.cx[b] - fr.cx[a]) / n : 0, hy: n ? (fr.cy[b] - fr.cy[a]) / n : 0, l0: n ? (fr.cl[b] - fr.cl[a]) / n : .5, s0: 1 - Math.exp(-rate / 5), rate } };

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
    for (let i = a; i < b; i++) { if (!fr.sil[i]) { l += fr.lf[i]; c++ } o += fr.on[i] }
    L.push(c ? l / c : .5); R.push(1 - Math.exp(-(o / ((b - a) * fr.dt)) / 5)) }
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
C.histAdd = (name, fr, art) => {
  const f = C.fingerprint(fr), s = C.sum(fr), H = C.hist(), r = (x, d) => +x.toFixed(d);
  const e = { name, fp: f.fp, L: f.L.map(x => r(x, 2)), R: f.R.map(x => r(x, 2)), raw: { hx: r(s.hx, 4), hy: r(s.hy, 4), l0: r(s.l0, 4), s0: r(s.s0, 4) }, dur: Math.round(fr.n * fr.dt), t: Date.now() };
  const i = H.findIndex(x => x.fp === e.fp || (x.name === name && C.sim(x.fp, e.fp) > .9));
  if (art) e.art = art; else if (i >= 0 && H[i].art) e.art = H[i].art;
  if (i >= 0) H.splice(i, 1);
  H.unshift(e); C.histSave(H); return { e, H } };
C.histSave = H => { try { localStorage.setItem(HK, JSON.stringify(H.slice(0, 60))) } catch (e) {} };
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
