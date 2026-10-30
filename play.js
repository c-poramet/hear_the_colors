const $ = id => document.getElementById(id);
let P = C.fromHash() || C.load();
const au = $('au'), st = $('strip'), sg = st.getContext('2d'), vz = $('viz'), og = vz.getContext('2d'), TAU = Math.PI * 2, W = vz.width, H = vz.height;
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v } catch (e) { return d } }, lsSet = (k, v) => { try { localStorage.setItem(k, v) } catch (e) {} };
document.querySelectorAll('.mode-link').forEach(a => a.href += location.hash);
C.seedTag(P);
C.onSeed = p => { P = p; history.replaceState(null, '', location.pathname + location.search);
  document.querySelectorAll('.mode-link').forEach(a => a.href = a.getAttribute('href').split('#')[0]); C.seedTag(P); renderHist(); cutUI() };

let fr = null, an = null, ac = null, gain = null, spec = new Uint8Array(512), cut = null, loop = false, drag = null, name = '';
const wc = document.createElement('canvas'); wc.width = wc.height = 360; // colour wheel renders off-screen, then lands inside the viz
const fmt = t => { t = Math.max(0, t | 0); return (t / 60 | 0) + ':' + String(t % 60).padStart(2, '0') };
const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const hsla = (c, a, dl = 0, dh = 0) => `hsl(${(c.h + dh + 360) % 360} ${c.s * 100}% ${C.cl(c.l + dl, 0, 1) * 100}% / ${a})`;

/* ---------- volume ---------- */
let vol = C.cl(+lsGet('colorseed.vol', .8), 0, 1), muted = false;
const SPK = '<path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor"/>';
function setVol(v, m = muted) {
  vol = C.cl(v, 0, 1); muted = m; const eff = muted ? 0 : vol;
  if (gain) gain.gain.value = eff * eff; else au.volume = eff * eff;
  $('vol').value = eff; $('vol').style.setProperty('--p', eff * 100 + '%');
  $('vi').innerHTML = SPK + (eff === 0 ? '<path d="M16 9l6 6M22 9l-6 6"/>' : eff < .5 ? '<path d="M15.5 8.5a5 5 0 010 7"/>' : '<path d="M15.5 8.5a5 5 0 010 7"/><path d="M18.5 5.5a9 9 0 010 13"/>');
  $('mute').setAttribute('aria-label', eff === 0 ? 'Unmute' : 'Mute');
}
$('vol').oninput = e => { setVol(+e.target.value, false); lsSet('colorseed.vol', vol) };
$('vol').onpointerup = e => e.target.blur();
$('mute').onclick = () => setVol(vol === 0 ? .5 : vol, !muted && vol > 0);
setVol(vol);

/* ---------- loading ---------- */
async function loadFile(f) {
  fr = null; cut = null; cutUI(); au.pause(); $('pp').disabled = true; $('empty').classList.add('gone');
  if (au.src) URL.revokeObjectURL(au.src);
  au.src = URL.createObjectURL(f); name = f.name.replace(/\.[^.]+$/, ''); $('song').textContent = name;
  if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); const s = ac.createMediaElementSource(au);
    an = ac.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = .8; gain = ac.createGain();
    s.connect(an); an.connect(gain); gain.connect(ac.destination); au.volume = 1; spec = new Uint8Array(an.frequencyBinCount); setVol(vol) }
  $('progw').classList.add('on'); $('prog').style.width = '0';
  try {
    $('status').textContent = 'Decoding…'; const buf = await C.decode(f);
    fr = await C.analyze(buf, p => { $('status').textContent = `Analysing… ${Math.round(p * 100)}%`; $('prog').style.width = p * 100 + '%' });
    const art = await C.cover(f), prior = C.hist(), { e: he } = C.histAdd(name, fr, art);
    const sim = prior.filter(x => x.fp !== he.fp).map(x => [C.sim(x.fp, he.fp), x.name]).sort((a, b) => b[0] - a[0])[0];
    $('status').textContent = sim && sim[0] > .8 ? `Resembles “${sim[1]}” · ${Math.round(sim[0] * 100)}% alike` : 'Ready. Press play.';
    $('pp').disabled = false; renderHist();
  } catch (err) { $('status').textContent = 'Could not read that file. Try an mp3, m4a, wav, flac or ogg.'; $('empty').classList.remove('gone') }
  $('progw').classList.remove('on');
}
$('file').onchange = e => { const f = e.target.files[0]; if (f) loadFile(f); e.target.value = '' };
const isAudio = f => f && (/^audio\//.test(f.type) || /\.(mp3|m4a|aac|wav|flac|ogg|opus|weba|webm|aiff?)$/i.test(f.name));
['dragenter', 'dragover'].forEach(ev => addEventListener(ev, e => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); $('stage').classList.add('dragging') } }));
addEventListener('dragleave', e => { if (!e.relatedTarget) $('stage').classList.remove('dragging') });
addEventListener('drop', e => { e.preventDefault(); $('stage').classList.remove('dragging'); const f = e.dataTransfer.files[0]; if (!f) return;
  isAudio(f) ? loadFile(f) : C.toast('That does not look like an audio file') });

/* ---------- transport ---------- */
$('pp').onclick = () => { if (!fr) return; ac.resume(); au.paused ? au.play() : au.pause() };
['play', 'pause', 'ended'].forEach(ev => au.addEventListener(ev, () => { $('pp').classList.toggle('playing', !au.paused); $('dot').classList.toggle('live', !au.paused);
  document.title = au.paused ? 'Color Seed – Play' : '▶ ' + name + ' – Color Seed' }));
addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = document.activeElement.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (e.code === 'Space' && tag !== 'BUTTON') { e.preventDefault(); $('pp').click() }
  else if (e.key === 'Escape') { cut = null; cutUI() }
  else if (e.key === 'm' || e.key === 'M') $('mute').click();
  else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); setVol(vol + (e.key === 'ArrowUp' ? .05 : -.05), false); lsSet('colorseed.vol', vol) }
  else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && fr && au.duration) { e.preventDefault(); au.currentTime = C.cl(au.currentTime + (e.key === 'ArrowRight' ? 5 : -5), 0, au.duration) }
});
let hsl = lsGet('colorseed.viz', 'wheel') === 'hsl', mt = hsl ? 1 : 0; $('hslt').checked = hsl;
$('hslt').onchange = e => { hsl = e.target.checked; lsSet('colorseed.viz', hsl ? 'hsl' : 'wheel') };

const fx = e => C.cl((e.clientX - st.getBoundingClientRect().left) / st.clientWidth, 0, 1);
st.onpointerdown = e => { if (!fr) return; st.setPointerCapture(e.pointerId); drag = { x0: fx(e), moved: false } };
st.onpointermove = e => { if (!drag) return; const x = fx(e); if (Math.abs(x - drag.x0) * st.clientWidth > 5) drag.moved = true;
  if (drag.moved) { const a = Math.floor(Math.min(x, drag.x0) * fr.n); cut = [a, Math.min(fr.n, Math.max(a + 3, Math.floor(Math.max(x, drag.x0) * fr.n)))]; cutUI() } };
st.onpointerup = () => { if (drag && !drag.moved && au.duration) au.currentTime = drag.x0 * au.duration; drag = null };
$('cclr').onclick = () => { cut = null; cutUI() };
$('loop').onchange = e => loop = e.target.checked;

/* ---------- cut + history panels ---------- */
function cutUI() {
  const b = $('cutbox');
  if (!cut || !fr) { b.innerHTML = '<div class="placeholder-state"><div class="placeholder-text">Drag across the timeline to cut out a piece and see its own colour.</div></div>'; return }
  const s = C.color(C.sum(fr, cut[0], cut[1]), P), w = C.color(C.sum(fr), P), dh = ((s.h - w.h + 540) % 360) - 180, sg = n => (n > 0 ? '+' : '') + n.toFixed(0);
  b.innerHTML = `<div class="cut-row" title="Click to copy ${C.hex(s)}"><i style="background:${C.css(s)}"></i><div><div class="cut-hex">${C.hex(s)}</div><div class="hint mono" style="margin:0">${fmt(cut[0] * fr.dt)} – ${fmt(cut[1] * fr.dt)}</div></div></div>
  <div class="stats-bar"><div class="stat-chip"><span class="stat-val">${sg(dh)}°</span><span class="stat-lbl">hue vs whole</span></div>
  <div class="stat-chip"><span class="stat-val">${sg((s.s - w.s) * 100)}%</span><span class="stat-lbl">saturation</span></div>
  <div class="stat-chip"><span class="stat-val">${sg((s.l - w.l) * 100)}%</span><span class="stat-lbl">lightness</span></div></div>`;
}
$('cutbox').onclick = e => { if (!cut || !fr || !e.target.closest('.cut-row')) return; const hex = C.hex(C.color(C.sum(fr, cut[0], cut[1]), P)); C.copy(hex).then(() => C.toast('Copied ' + hex)) };
function renderHist() {
  const L = C.hist(), box = $('hist');
  box.innerHTML = L.length ? L.map((e, i) => { const c = C.color(e.raw, P), hex = C.hex(c);
    return `<div class="hist-item" data-i="${i}" title="Click to copy ${hex}">${e.art ? `<img class="hist-art" src="${esc(e.art)}" alt="">` : ''}<canvas class="hist-glyph" width="104" height="104" data-i="${i}" title="Open share card" aria-label="Open share card for ${esc(e.name)}"></canvas><div class="hist-meta"><div class="hist-name">${esc(e.name)}</div><div class="hist-fp">${e.fp} · ${fmt(e.dur)}</div><div class="hist-col"><i style="background:${C.css(c)}"></i><span class="hist-hex">${hex}</span></div></div><button class="btn-reset" data-d="${i}" aria-label="Remove ${esc(e.name)}">✕</button></div>` }).join('')
    : '<div class="placeholder-state"><div class="placeholder-text">Songs you play leave a glyph here: a fuzzy fingerprint ring and their colour. Click a row to copy its colour, or the glyph to open a share card.</div></div>';
  box.querySelectorAll('canvas').forEach(cv => { const e = L[cv.dataset.i]; C.glyph(cv, e, C.css(C.color(e.raw, P))) });
}
$('hist').onclick = e => {
  const d = e.target.dataset.d; if (d != null) { const L = C.hist(); L.splice(d, 1); C.histSave(L); renderHist(); return }
  const it = e.target.closest('.hist-item'), x = it && C.hist()[it.dataset.i]; if (!x) return;
  if (e.target.closest('canvas')) { C.card(x, P); return }
  const hex = C.hex(C.color(x.raw, P)), lbl = it.querySelector('.hist-hex');
  C.copy(hex).then(() => { lbl.textContent = 'Copied ✓'; setTimeout(() => lbl.textContent = hex, 1000) });
};
let sure = 0;
$('hclr').onclick = () => { const b = $('hclr'); if (!C.hist().length) return;
  if (sure) { clearTimeout(sure); sure = 0; b.textContent = 'Clear'; C.histSave([]); renderHist(); C.toast('History cleared'); return }
  b.textContent = 'Sure?'; sure = setTimeout(() => { sure = 0; b.textContent = 'Clear' }, 2500) };

/* ---------- drawing ---------- */
function drawStrip(idx) {
  const w = st.width, h = st.height; sg.clearRect(0, 0, w, h);
  for (let x = 0; x < w; x++) { const j = Math.max(1, Math.floor((x + 1) / w * fr.n)); sg.globalAlpha = j <= idx ? 1 : .22; sg.fillStyle = C.css(C.color(C.sum(fr, 0, j), P)); sg.fillRect(x, 0, 1, h) }
  sg.globalAlpha = 1;
  if (cut) { const a = cut[0] / fr.n * w, b = cut[1] / fr.n * w; sg.fillStyle = 'rgba(0,0,0,.45)'; sg.fillRect(0, 0, a, h); sg.fillRect(b, 0, w - b, h); sg.fillStyle = '#fff'; sg.fillRect(a, 0, 2, h); sg.fillRect(b - 2, 0, 2, h) }
  sg.fillStyle = '#fff'; sg.fillRect(idx / fr.n * w, 0, 2, h);
}
// log-spaced spectrum: 56 bars over analyser bins 2..~370
const NB = 56, edges = (() => { const lo = 2, hi = 368, e = [lo]; for (let i = 1; i <= NB; i++) e.push(Math.max(e[i - 1] + 1, Math.round(lo * (hi / lo) ** (i / NB)))); return e })();
const bh = new Float32Array(NB), pk = new Float32Array(NB), WY = 178, BASE = 520, MAXH = 195;
let cs = { h: 0, s: 0, l: .42 }, lastT = 0; // cs = the colour the visuals ease towards the running colour with

function drawHSL() {
  const hh = cs.h, ss = cs.s * 100, ll = cs.l * 100, x0 = 96, tx = 196, tw = 370, vx = 704;
  const rows = [
    ['HUE', hh.toFixed(0) + '°', hh / 360, [0, 60, 120, 180, 240, 300, 360].map(d => [d / 360, `hsl(${d} ${ss}% ${ll}%)`])],
    ['SAT', ss.toFixed(0) + '%', cs.s, [[0, `hsl(${hh} 0% ${ll}%)`], [1, `hsl(${hh} 100% ${ll}%)`]]],
    ['LIGHT', ll.toFixed(0) + '%', cs.l, [[0, '#000'], [.5, `hsl(${hh} ${ss}% 50%)`], [1, '#fff']]]];
  og.textBaseline = 'middle';
  rows.forEach(([lab, val, p, stops], i) => { const y = WY - 78 + i * 78;
    og.font = '700 22px "Space Mono", monospace'; og.textAlign = 'left'; og.fillStyle = 'rgba(255,255,255,.38)'; og.fillText(lab, x0, y);
    const gr = og.createLinearGradient(tx, 0, tx + tw, 0); stops.forEach(([o, c]) => gr.addColorStop(o, c));
    og.fillStyle = gr; C.rr(og, tx, y - 7, tw, 14, 7); og.fill(); og.lineWidth = 1.5; og.strokeStyle = 'rgba(255,255,255,.14)'; og.stroke();
    og.beginPath(); og.arc(tx + tw * p, y, 12, 0, TAU); og.fillStyle = C.css(cs); og.fill(); og.lineWidth = 3; og.strokeStyle = '#fff'; og.stroke();
    og.font = '700 30px "Space Mono", monospace'; og.textAlign = 'right'; og.fillStyle = '#f0f0f0'; og.fillText(val, vx, y) });
  og.textBaseline = 'alphabetic';
}
function drawViz(t, live) {
  og.clearRect(0, 0, W, H);
  if (an) an.getByteFrequencyData(spec);
  let bass = 0; for (let i = 0; i < 6; i++) bass += spec[i]; bass /= 1530;
  const g = og.createRadialGradient(W / 2, WY, 20, W / 2, WY, 340); g.addColorStop(0, hsla(cs, .3)); g.addColorStop(1, hsla(cs, 0)); og.fillStyle = g; og.fillRect(0, 0, W, H);
  // colour instrument: wheel or HSL bars, crossfaded
  if (mt < .99) { const wr = 140 * (1 + bass * .04), ws = 2 * wr * wc.width / (wc.width / 2 - 16);
    og.globalAlpha = (live ? 1 : .35) * (1 - mt); og.drawImage(wc, W / 2 - ws / 2, WY - ws / 2, ws, ws);
    og.lineWidth = 2; og.strokeStyle = 'rgba(255,255,255,.2)'; og.beginPath(); og.arc(W / 2, WY, wr, 0, TAU); og.stroke(); og.globalAlpha = 1 }
  if (mt > .01) { og.globalAlpha = mt * (live ? 1 : .5); drawHSL(); og.globalAlpha = 1 }
  // baseline + bars
  const x0 = 40, pitch = (W - 80) / NB, bw = pitch * .68;
  og.strokeStyle = 'rgba(255,255,255,.09)'; og.lineWidth = 2; og.beginPath(); og.moveTo(x0, BASE + 1); og.lineTo(W - x0, BASE + 1); og.stroke();
  for (let i = 0; i < NB; i++) {
    let m = 0; for (let j = edges[i]; j < edges[i + 1]; j++) if (spec[j] > m) m = spec[j];
    const tgt = Math.min(1, (m / 255) ** 1.25 * (1 + i / NB * .55)), idle = .018 + .012 * Math.sin(t / 650 + i * .45);
    bh[i] += (tgt - bh[i]) * (tgt > bh[i] ? .55 : .14); pk[i] = Math.max(pk[i] - .007, bh[i]);
    const hgt = Math.max(idle, bh[i]) * MAXH, x = x0 + i * pitch + (pitch - bw) / 2, dh = (i / NB - .5) * 26, gr = og.createLinearGradient(0, BASE, 0, BASE - hgt);
    gr.addColorStop(0, hsla(cs, .35, -.05, dh)); gr.addColorStop(1, hsla(cs, 1, .08 + bh[i] * .18, dh));
    og.fillStyle = gr; C.rr(og, x, BASE - hgt, bw, hgt, 3); og.fill();
    if (pk[i] > .04) { og.fillStyle = hsla(cs, .85, .25, dh); C.rr(og, x, BASE - pk[i] * MAXH - 8, bw, 3, 1.5); og.fill() }
  }
}
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(64, t - lastT || 16); lastT = t;
  let c = { h: 0, s: 0, l: .42 }, rate = 0, trail = [], idx = 0;
  if (fr) {
    idx = Math.min(fr.n, Math.floor(au.currentTime / fr.dt)); const s = C.sum(fr, 0, Math.max(1, idx)); c = C.color(s, P); rate = s.rate;
    const step = Math.max(1, Math.floor(1 / fr.dt));
    for (let j = step; j <= idx; j += step) { const k = C.color(C.sum(fr, 0, j), P); trail.push([k.h, k.s]) }
  }
  const k = 1 - Math.exp(-dt / 280), dh = ((c.h - cs.h + 540) % 360) - 180; // smooth easing of the shown colour
  cs = { h: (cs.h + dh * k + 360) % 360, s: cs.s + (c.s - cs.s) * k, l: cs.l + (c.l - cs.l) * k };
  mt += ((hsl ? 1 : 0) - mt) * (1 - Math.exp(-dt / 90));
  if (fr) {
    $('sH').textContent = cs.h.toFixed(0) + '°'; $('sS').textContent = (cs.s * 100).toFixed(0) + '%'; $('sL').textContent = (cs.l * 100).toFixed(0) + '%'; $('sR').textContent = rate.toFixed(1);
    $('time').textContent = fmt(au.currentTime) + ' / ' + fmt(au.duration || 0);
    drawStrip(idx);
    if (loop && cut && au.currentTime >= cut[1] * fr.dt) au.currentTime = cut[0] * fr.dt;
  }
  trail.push([cs.h, cs.s]); C.wheel(wc, fr ? [{ h: cs.h, s: cs.s, color: C.css(cs), trail }] : []);
  $('stage').style.setProperty('--c', C.css(cs)); drawViz(t, !!fr);
}
cutUI(); renderHist(); requestAnimationFrame(frame);
