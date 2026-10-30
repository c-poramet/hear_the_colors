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
function setCover(a) { const im = $('coverimg');
  if (a) { im.src = a; im.hidden = false; $('coverph').hidden = true } else { im.hidden = true; im.removeAttribute('src'); $('coverph').hidden = false } }
async function loadFile(f) {
  fr = null; cut = null; cutUI(); au.pause(); $('pp').disabled = true; $('empty').classList.add('gone');
  setCover(null); $('nsub').textContent = 'Analysing…'; $('nhex').textContent = '–';
  if (au.src) URL.revokeObjectURL(au.src);
  au.src = URL.createObjectURL(f); name = f.name.replace(/\.[^.]+$/, ''); $('song').textContent = name;
  if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); const s = ac.createMediaElementSource(au);
    an = ac.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = .8; gain = ac.createGain();
    s.connect(an); an.connect(gain); gain.connect(ac.destination); au.volume = 1; spec = new Uint8Array(an.frequencyBinCount); setVol(vol) }
  $('progw').classList.add('on'); $('prog').style.width = '0';
  try {
    $('status').textContent = 'Decoding…'; const buf = await C.decode(f);
    fr = await C.analyze(buf, p => { $('status').textContent = `Analysing… ${Math.round(p * 100)}%`; $('prog').style.width = p * 100 + '%' });
    const art = await C.cover(f), meta = await readMetadata(f), prior = C.hist(), { e: he } = C.histAdd(name, fr, art, meta);
    setCover(art); $('nsub').textContent = 'Length ' + fmt(fr.n * fr.dt);
    const sim = prior.filter(x => x.fp !== he.fp).map(x => [C.sim(x.fp, he.fp), x.name]).sort((a, b) => b[0] - a[0])[0];
    $('status').textContent = sim && sim[0] > .8 ? `Resembles “${sim[1]}” · ${Math.round(sim[0] * 100)}% alike` : 'Ready. Press play.';
    $('pp').disabled = false; renderHist();
  } catch (err) { $('status').textContent = 'Could not read that file. Try an mp3, m4a, wav, flac or ogg.'; $('empty').classList.remove('gone') }
  $('progw').classList.remove('on');
}
$('file').onchange = e => { const f = e.target.files[0]; if (f) loadFile(f); e.target.value = '' };
const isAudio = f => f && (/^audio\//.test(f.type) || /\.(mp3|m4a|aac|wav|flac|ogg|opus|weba|webm|aiff?)$/i.test(f.name));
const readMetadata = f => new Promise(resolve => {
  if (!window.jsmediatags || !f) return resolve({});
  window.jsmediatags.read(f, { onSuccess: tag => {
    const t = tag.tags || {};
    resolve({ artist: t.artist || '', album: t.album || '', year: String(t.year || t.date || '').slice(0, 4) });
  }, onError: () => resolve({}) });
});
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
let hsl = lsGet('colorseed.viz', 'hsl') === 'hsl', mt = hsl ? 1 : 0; $('hslt').checked = hsl;
$('hslt').onchange = e => { hsl = e.target.checked; lsSet('colorseed.viz', hsl ? 'hsl' : 'wheel') };
let showCut = lsGet('colorseed.cut', '0') === '1';
function applyCut() { $('cutpanel').hidden = !showCut; $('cutt').checked = showCut; if (!showCut) { cut = null; loop = false; $('loop').checked = false } cutUI() }
$('cutt').onchange = e => { showCut = e.target.checked; lsSet('colorseed.cut', showCut ? '1' : '0'); applyCut() };

const fx = e => C.cl((e.clientX - st.getBoundingClientRect().left) / st.clientWidth, 0, 1);
st.onpointerdown = e => { if (!fr) return; st.setPointerCapture(e.pointerId); drag = { x0: fx(e), moved: false } };
st.onpointermove = e => { if (!drag) return; const x = fx(e); if (Math.abs(x - drag.x0) * st.clientWidth > 5) drag.moved = true;
  if (drag.moved && showCut) { const a = Math.floor(Math.min(x, drag.x0) * fr.n); cut = [a, Math.min(fr.n, Math.max(a + 3, Math.floor(Math.max(x, drag.x0) * fr.n)))]; cutUI() } };
st.onpointerup = e => { if (drag && (!drag.moved || !showCut) && au.duration) au.currentTime = (drag.moved ? fx(e) : drag.x0) * au.duration; drag = null };
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
/* ---------- history: songs / compare / birthdays, all card based ---------- */
let htab = lsGet('colorseed.htab', 'songs'), mapMode = lsGet('colorseed.map', 'wheel'), songMode = lsGet('colorseed.songs', 'row'), halfMap = lsGet('colorseed.half', '0') === '1', selectMap = lsGet('colorseed.select', '0') === '1', hsel = 0, pair = [0, 1], msel = -1; const bdOff = new Set();
if (!['songs', 'map', 'bday'].includes(htab)) htab = 'songs';
const KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'C♯', 'A♭', 'E♭', 'B♭', 'F'], rad = d => d * Math.PI / 180;
// hue = place on the circle of fifths (key area), saturation = rhythmic density, lightness = timbre brightness
const facts = e => { const c = C.color(e.raw, P), a = (c.a + 360) % 360; return { c, a, r: e.raw.s0, rate: -5 * Math.log(1 - Math.min(.999, e.raw.s0)), key: KEYS[Math.round(a / 30) % 12] } };
const rel = (x, y) => { const A = facts(x), B = facts(y), d = Math.abs(A.a - B.a), st = Math.min(d, 360 - d) / 30;
  return { A, B, st, pct: Math.round(100 * (1 - (.5 * st / 6 + .25 * Math.abs(A.c.s - B.c.s) + .25 * Math.abs(A.c.l - B.c.l)))) } };
const gl = {}, glyphURL = (e, col) => { const k = e.fp + col; if (!gl[k]) { const t = document.createElement('canvas'); t.width = t.height = 120; C.glyph(t, e, col); gl[k] = t.toDataURL() } return gl[k] };
const hx = c => `<span class="hx"><i style="background:${C.css(c)}"></i>${C.hex(c)}</span>`;
const thumb = (e, c, cls = '', n) => `<span class="th ${cls}" style="--c:${C.css(c)}"><img ${e.art ? '' : 'class="gl" '}src="${e.art ? esc(e.art) : glyphURL(e, C.css(c))}" alt="">${n ? `<b class="nb">${n}</b>` : ''}</span>`;
const dial = (a, col, key) => `<svg class="dial" viewBox="-22 -22 44 44"><circle r="17" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="2"/><circle cx="${(17 * Math.sin(rad(a))).toFixed(1)}" cy="${(-17 * Math.cos(rad(a))).toFixed(1)}" r="4.5" fill="${col}" stroke="#fff" stroke-width="1.5"/>${key ? `<text y="4.5" text-anchor="middle" font-size="12" font-weight="700" font-family="Space Mono,monospace" fill="#f0f0f0">${key}</text>` : ''}</svg>`;
const bar = (v, col) => `<span class="bar"><i style="width:${Math.round(C.cl(v, 0, 1) * 100)}%;background:${col}"></i></span>`;
const empty = t => `<div class="placeholder-state"><div class="placeholder-text">${t}</div></div>`;

function songCard(e) { const f = facts(e), css = C.css(f.c);
  return `<div class="scard" style="--c:${css}">${thumb(e, f.c, 'lg')}<div class="sc-body"><div class="sc-name">${esc(e.name)}</div><div class="sc-sub">${fmt(e.dur)} · ${e.fp}</div>${hx(f.c)}</div>
  <div class="sc-meters"><div class="mt">${dial(f.a, css, f.key)}<span>Key</span></div><div class="mt">${bar(f.r, css)}<span>Rhythm ${f.rate.toFixed(1)}/s</span></div><div class="mt">${bar(f.c.l, css)}<span>Brightness</span></div></div>
  <div class="sc-act"><button class="btn-reset" data-a="copy">Copy hex</button><button class="btn-reset" data-a="card">Share card</button><button class="btn-reset" data-a="del">Remove</button></div></div>` }
function songRow(e, i) { const f = facts(e), css = C.css(f.c); return `<button class="srow${i === hsel ? ' on' : ''}" data-i="${i}" style="--c:${css}"><span class="srow-color" aria-label="${C.hex(f.c)}" style="background:${css}"><b>${C.hex(f.c)}</b></span><span class="srow-info">${thumb(e, f.c)}<span><span class="srow-name">${esc(e.name)}</span><span class="srow-meta">${fmt(e.dur)} · ${f.key} · ${f.rate.toFixed(1)}/s</span></span></span><span class="srow-actions"><span data-a="copy">Copy</span><span data-a="card">Card</span></span></button>` }
function songsView(L, box) { const control = `<div class="view-controls"><span class="hint">Song view</span><div class="seg"><button class="seg-btn${songMode === 'row' ? ' on' : ''}" data-songs="row">Rows</button><button class="seg-btn${songMode === 'card' ? ' on' : ''}" data-songs="card">Cards</button></div></div>`; box.innerHTML = control + (songMode === 'card' ? songCard(L[hsel]) + '<div class="gcards">' + L.map((e, i) => { const c = facts(e).c; return `<button class="gcard${i === hsel ? ' on' : ''}" data-i="${i}">${thumb(e, c)}<span class="gn">${esc(e.name)}</span>${hx(c)}</button>` }).join('') + '</div>' : '<div class="srows">' + L.map(songRow).join('') + '</div>') }

function drawMap(cv, L) { const g = cv.getContext('2d'), S = cv.width;
  if (mapMode === 'wheel') return C.wheel(cv, L.map((e, i) => { const c = C.color(e.raw, P); return { h: c.h, s: c.s, color: C.css(c), label: i + 1, sel: i === msel } }));
  const Hh = cv.height, rh = (Hh - 16) / 3, bw = Math.min(30, (S - 60) / L.length / 1.15); g.clearRect(0, 0, S, Hh); g.font = '700 12px "Space Mono",monospace';
  [['HUE', c => c.h / 360], ['SAT', c => c.s], ['LIGHT', c => c.l]].forEach(([lab, f], r) => { g.fillStyle = 'rgba(255,255,255,.38)'; g.fillText(lab, 2, r * rh + rh / 2); g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(40, (r + 1) * rh - 4, S - 44, 1);
    L.forEach((e, i) => { const c = C.color(e.raw, P), h = Math.max(3, f(c) * (rh - 14)); g.fillStyle = C.css(c); C.rr(g, 40 + i * bw * 1.15, (r + 1) * rh - 4 - h, bw, h, 3); g.fill() }) });
  g.fillStyle = 'rgba(255,255,255,.38)'; L.forEach((e, i) => g.fillText(i + 1, 40 + i * bw * 1.15 + bw / 2 - 3, Hh - 2)) }
function hslBars(L) {
  const rows = [['HUE', c => c.h / 360, c => `hsl(${c.h} ${c.s * 100}% ${c.l * 100}%)`], ['SAT', c => c.s, c => `hsl(${c.h} ${c.s * 100}% ${c.l * 100}%)`], ['LIGHT', c => c.l, c => `hsl(${c.h} ${c.s * 100}% ${c.l * 100}%)`]];
  return `<div class="compare-hsl">${rows.map(([label, value, color]) => { const base = facts(L[0]).c, meaning = label === 'HUE' ? 'key area' : label === 'SAT' ? 'rhythmic density' : 'timbre brightness', gradient = label === 'HUE' ? 'linear-gradient(90deg,#d44,#ddc52d,#45c96b,#36bed1,#5068cf,#bd40c5,#d44)' : label === 'SAT' ? `linear-gradient(90deg,hsl(${base.h} 0% ${base.l * 100}%),hsl(${base.h} 100% ${base.l * 100}%))` : 'linear-gradient(90deg,#000,#fff)'; return `<div class="compare-hsl-row"><span class="compare-hsl-label">${label}</span><div class="compare-hsl-lane"><div class="compare-hsl-track" style="background:${gradient}"></div>${L.map((e, i) => { const c = facts(e).c, v = value(c); return `<button class="compare-hsl-marker${i === hsel ? ' on' : ''}" data-i="${i}" style="left:${Math.round(v * 100)}%" title="${esc(e.name)} · ${Math.round(v * 100)}%">${thumb(e, c, '', i + 1)}<b>${Math.round(v * 100)}%</b></button>` }).join('')}<span class="compare-hsl-meaning">${meaning}</span></div></div>` }).join('')}</div>`;
}
function pairCard(a, b, i, j) { const r = rel(a, b), A = r.A, B = r.B, ca = C.css(A.c), cb = C.css(B.c);
  return `<div class="pair"><div class="ph">${thumb(a, A.c, '', i + 1)}<div class="pp"><b>${r.pct}%</b><span>alike</span></div>${thumb(b, B.c, '', j + 1)}</div>
  <div class="prow"><span>Key</span><div class="pd">${dial(A.a, ca, A.key)}<em>${r.st < .5 ? 'same key area' : Math.round(r.st) + (Math.round(r.st) === 1 ? ' fifth apart' : ' fifths apart')}</em>${dial(B.a, cb, B.key)}</div></div>
  <div class="prow"><span>Hue</span><div class="bars color-bars"><div>${thumb(a, A.c)}${bar(A.c.h / 360, ca)}</div><div>${thumb(b, B.c)}${bar(B.c.h / 360, cb)}</div></div></div>
  <div class="prow"><span>Saturation</span><div class="bars color-bars"><div>${thumb(a, A.c)}${bar(A.c.s, ca)}</div><div>${thumb(b, B.c)}${bar(B.c.s, cb)}</div></div></div>
  <div class="prow"><span>Light</span><div class="bars color-bars"><div>${thumb(a, A.c)}${bar(A.c.l, ca)}</div><div>${thumb(b, B.c)}${bar(B.c.l, cb)}</div></div></div></div>` }
function mapView(L, box) { const n = L.slice(0, 8); msel = hsel < n.length ? hsel : -1; pair = pair.map(i => Math.min(i, n.length - 1));
  const actions = $('hist-actions'); actions.innerHTML = `<div class="compare-head-controls"><div class="seg"><button class="seg-btn${mapMode === 'wheel' ? ' on' : ''}" data-m="wheel">Wheel</button><button class="seg-btn${mapMode === 'bars' ? ' on' : ''}" data-m="bars">HSL</button></div><div class="seg"><button class="seg-btn${!selectMap ? ' on' : ''}" data-select="0">Triangle</button><button class="seg-btn${selectMap ? ' on' : ''}" data-select="1">Select</button></div><label class="head-toggle${selectMap ? ' disabled' : ''}" title="${selectMap ? 'Only available in Triangle mode' : 'Show only half of the comparison triangle'}"><span>Half</span><input type="checkbox" data-half${halfMap ? ' checked' : ''}${selectMap ? ' disabled' : ''}><i></i></label><button class="btn-reset" data-clear>Clear</button></div>`;
  actions.onclick = e => {
    const b = e.target.closest('[data-m],[data-select],[data-half],[data-clear]');
    if (!b) return;
    if (b.dataset.clear != null) {
      const clear = b; if (!C.hist().length) return;
      if (sure) { clearTimeout(sure); sure = 0; clear.textContent = 'Clear'; C.histSave([]); renderHist(); C.toast('History cleared'); return }
      clear.textContent = 'Sure?'; sure = setTimeout(() => { sure = 0; clear.textContent = 'Clear' }, 2500); return;
    }
    if (b.dataset.m) { mapMode = b.dataset.m; lsSet('colorseed.map', mapMode) }
    else if (b.dataset.select) { selectMap = b.dataset.select === '1'; lsSet('colorseed.select', selectMap ? '1' : '0') }
    else { halfMap = b.checked; lsSet('colorseed.half', halfMap ? '1' : '0') }
    renderHist();
  };
  const seg = '';
  const scores = []; for (let i = 0; i < n.length; i++) for (let j = i + 1; j < n.length; j++) scores.push(rel(n[i], n[j]).pct); const lo = Math.min(...scores), hi = Math.max(...scores), norm = p => hi === lo ? 1 : (p - lo) / (hi - lo);
  const mx = n.length < 2 ? '' : selectMap ? `<div class="select-pairs"><label>First song<select data-pick="0">${n.map((e, i) => `<option value="${i}"${pair[0] === i ? ' selected' : ''}>${esc(e.name)}</option>`).join('')}</select></label><label>Second song<select data-pick="1">${n.map((e, i) => `<option value="${i}"${pair[1] === i ? ' selected' : ''}>${esc(e.name)}</option>`).join('')}</select></label></div>` : `<div class="mx${halfMap ? ' half' : ''}" style="--n:${n.length}"><span></span>${n.map((e, i) => thumb(e, facts(e).c, '', i + 1)).join('')}${n.map((a, i) => thumb(a, facts(a).c, '', i + 1) + n.map((b, j) => i === j ? `<span class="mc self" style="--c:${C.css(facts(a).c)}"></span>` : (halfMap && j < i ? '<span class="mc blank"></span>' : `<button class="mc${pair[0] === i && pair[1] === j ? ' on' : ''}" data-p="${i},${j}" style="--k:${norm(rel(a, b).pct).toFixed(2)}" title="${esc(a.name)} vs ${esc(b.name)}">${rel(a, b).pct}</button>`)).join('')).join('')}</div>`;
  const chart = mapMode === 'wheel' ? '<canvas id="mapcv" class="map-cv" width="360" height="360"></canvas>' : hslBars(n);
  box.innerHTML = seg + chart + mx + (n.length > 1 && pair[0] !== pair[1] ? pairCard(n[pair[0]], n[pair[1]], pair[0], pair[1]) : empty('Load a second song to compare how alike two songs are.'));
  if (mapMode === 'wheel') drawMap($('mapcv'), n) }
function bdayView(L, box) { const H = C.bdayHist(), e = L[hsel];
  if (!H.length) return box.innerHTML = empty('Save birthdays with the BIRTHDAY tag in the header, then compare one song\'s colour across them here.');
  const R = [{ k: 'cur', d: '', label: 'Current seed', p: P }, ...H.map(h => ({ k: h.d, d: h.d, label: h.label, p: C.fromDate(h.d) }))].map(r => ({ ...r, c: C.color(e.raw, r.p) })), on = R.filter(r => !bdOff.has(r.k));
  box.innerHTML = `<div class="bday-head"><div class="bday-song">${thumb(e, facts(e).c, 'lg')}<div><div class="eyebrow">Comparing birthdays for</div><div class="sc-name">${esc(e.name)}</div><div class="bday-song-meta">${fmt(e.dur)} · ${e.fp}</div></div></div><div class="sstrip">${L.slice(0, 10).map((x, i) => `<button class="sbtn${i === hsel ? ' on' : ''}" data-i="${i}" title="${esc(x.name)}">${thumb(x, facts(x).c)}</button>`).join('')}</div></div>
  <div class="bday-overview"><div><div class="eyebrow">Colour timeline</div><div class="stripe">${on.map(r => `<i style="background:${C.css(r.c)}"></i>`).join('')}</div></div><canvas id="bdcv" class="map-cv sm" width="360" height="360"></canvas></div>
  <p class="hint bday-help">Click a birthday card to show or hide it. Use a card to make that birthday the active seed.</p>
  <div class="bgrid">${R.map((r, i) => `<div class="bcard${bdOff.has(r.k) ? ' off' : ''}${r.k === 'cur' ? ' cur' : ''}" data-k="${r.k}" role="button" tabindex="0" aria-pressed="${!bdOff.has(r.k)}" style="--c:${C.css(r.c)}"><div class="sw">${thumb(e, r.c, '', i + 1)}</div><div class="bb"><div class="bn">${esc(r.label || C.fmtD(r.d))}</div>${r.d && r.label ? `<div class="bs">${C.fmtD(r.d)}</div>` : ''}${hx(r.c)}${r.d ? `<button class="btn-reset" data-u="${r.d}">Use</button>` : '<span class="chip">In use</span>'}</div></div>`).join('')}</div>`;
  C.wheel($('bdcv'), R.map((r, i) => bdOff.has(r.k) ? null : { h: r.c.h, s: r.c.s, color: C.css(r.c), label: i + 1 }).filter(Boolean)) }
function renderHist() { const L = C.hist(), box = $('hist'); hsel = Math.min(hsel, Math.max(0, L.length - 1));
  document.querySelectorAll('#htabs [data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === htab));
  if (htab !== 'map') { $('hist-actions').innerHTML = '<button class="btn-reset" id="hclr">Clear</button>'; $('hclr').onclick = clearHistory }
  if (!L.length) { box.innerHTML = empty('Songs you play collect here as cards: cover, colour, key, rhythm and brightness at a glance. Compare them and try them under your birthdays.'); return }
  (htab === 'map' ? mapView : htab === 'bday' ? bdayView : songsView)(L, box) }
$('htabs').onclick = e => { const t = e.target.closest('[data-t]'); if (t) { htab = t.dataset.t; lsSet('colorseed.htab', htab); renderHist() } };
$('hist').onclick = e => { const q = s => e.target.closest(s), L = C.hist(); let b;
  if ((b = q('[data-u]'))) { const u = b.dataset.u, p = C.bdayUse(u); C.save(p); C.onSeed(p); C.toast('Using ' + C.fmtD(u)); return }
  if ((b = q('[data-m]'))) { mapMode = b.dataset.m; lsSet('colorseed.map', mapMode) }
  else if ((b = q('[data-songs]'))) { songMode = b.dataset.songs; lsSet('colorseed.songs', songMode) }
  else if ((b = q('[data-select]'))) { selectMap = b.dataset.select === '1'; lsSet('colorseed.select', selectMap ? '1' : '0') }
  else if (q('[data-half]')) { halfMap = q('[data-half]').checked; lsSet('colorseed.half', halfMap ? '1' : '0') }
  else if ((b = q('[data-a]'))) { const x = L[hsel], a = b.dataset.a; if (!x) return;
    const row = b.closest('[data-i]'); if (row) hsel = +row.dataset.i;
    const selected = L[hsel]; if (!selected) return;
    if (a === 'copy') { const hex = C.hex(C.color(selected.raw, P)); C.copy(hex).then(() => C.toast('Copied ' + hex)); return }
    if (a === 'card') { C.card(selected, P); return }
    L.splice(hsel, 1); C.histSave(L); hsel = 0 }
  else if ((b = q('[data-p]'))) pair = b.dataset.p.split(',').map(Number);
  else if ((b = q('[data-k]'))) bdOff.has(b.dataset.k) ? bdOff.delete(b.dataset.k) : bdOff.add(b.dataset.k);
  else if ((b = q('[data-i]'))) hsel = +b.dataset.i;
  else return; renderHist() };
$('hist').onchange = e => { const pick = e.target.closest('[data-pick]'); if (!pick) return; pair[+pick.dataset.pick] = +pick.value; renderHist() };
$('hist').onkeydown = e => { const b = e.target.closest('[data-k]'); if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); b.click() } };
let sure = 0;
function clearHistory() { const b = $('hclr'); if (!C.hist().length) return;
  if (sure) { clearTimeout(sure); sure = 0; b.textContent = 'Clear'; C.histSave([]); renderHist(); C.toast('History cleared'); return }
  b.textContent = 'Sure?'; sure = setTimeout(() => { sure = 0; b.textContent = 'Clear' }, 2500) }

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
  if (mt < .99) { const wr = 128 * (1 + bass * .04), ws = wr * wc.width / (wc.width / 2 - 16); // wheel disc radius R=wc/2-16 maps to wr
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
    $('nhex').textContent = C.hex(cs); $('ncol').style.background = C.css(cs);
    $('time').textContent = fmt(au.currentTime) + ' / ' + fmt(au.duration || 0);
    drawStrip(idx);
    if (loop && cut && au.currentTime >= cut[1] * fr.dt) au.currentTime = cut[0] * fr.dt;
  }
  trail.push([cs.h, cs.s]); C.wheel(wc, fr ? [{ h: cs.h, s: cs.s, color: C.css(cs), trail }] : []);
  $('stage').style.setProperty('--c', C.css(cs)); drawViz(t, !!fr);
}
applyCut(); renderHist(); requestAnimationFrame(frame);
