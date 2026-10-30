const $ = id => document.getElementById(id);
const P = C.fromHash() || C.load(), au = $('au') || document.createElement('audio'), st = $('strip'), sg = st.getContext('2d'), orb = $('orb'), og = orb.getContext('2d'), TAU = Math.PI * 2;
document.querySelectorAll('.mode-link').forEach(a => a.href += location.hash);
C.seedTag(P);
let fr = null, an = null, ac = null, spec = new Uint8Array(256), cut = null, loop = false, drag = null, ripples = [], slow = 0;
const wc = document.createElement('canvas'); wc.width = wc.height = 360; // colour wheel is rendered off-screen, then drawn into the orb
const fmt = t => { t = Math.max(0, t | 0); return (t / 60 | 0) + ':' + String(t % 60).padStart(2, '0') };
const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const hsla = (c, a, dl = 0, dh = 0) => `hsl(${(c.h + dh + 360) % 360} ${c.s * 100}% ${C.cl(c.l + dl, 0, 1) * 100}% / ${a})`;
const legacyCopy = t => { const a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy') } catch (e) {} a.remove() };
const copy = t => navigator.clipboard ? navigator.clipboard.writeText(t).catch(() => legacyCopy(t)) : Promise.resolve(legacyCopy(t));

$('file').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  fr = null; cut = null; cutUI(); au.pause(); au.src = URL.createObjectURL(f);
  const name = f.name.replace(/\.[^.]+$/, ''); $('song').textContent = name;
  if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); const s = ac.createMediaElementSource(au);
    an = ac.createAnalyser(); an.fftSize = 512; an.smoothingTimeConstant = .8; s.connect(an); an.connect(ac.destination); spec = new Uint8Array(an.frequencyBinCount) }
  try {
    $('status').textContent = 'Decoding…'; const buf = await C.decode(f);
    fr = await C.analyze(buf, p => $('status').textContent = `Analysing… ${Math.round(p * 100)}%`);
    const art = await C.cover(f), prior = C.hist(), { e: he } = C.histAdd(name, fr, art);
    const sim = prior.filter(x => x.fp !== he.fp).map(x => [C.sim(x.fp, he.fp), x.name]).sort((a, b) => b[0] - a[0])[0];
    $('status').textContent = sim && sim[0] > .8 ? `Resembles “${sim[1]}” · ${Math.round(sim[0] * 100)}% alike` : 'Ready. Press play.';
    renderHist();
  } catch (err) { $('status').textContent = 'Could not read that file.' }
};
$('pp').onclick = () => { if (!fr) return; ac.resume(); au.paused ? au.play() : au.pause() };
['play', 'pause', 'ended'].forEach(ev => au.addEventListener(ev, () => { $('pp').classList.toggle('playing', !au.paused); $('dot').classList.toggle('live', !au.paused) }));
addEventListener('keydown', e => { if (e.code === 'Space' && !/INPUT|BUTTON/.test(document.activeElement.tagName)) { e.preventDefault(); $('pp').click() } if (e.key === 'Escape') { cut = null; cutUI() } });

const fx = e => C.cl((e.clientX - st.getBoundingClientRect().left) / st.clientWidth, 0, 1);
st.onpointerdown = e => { if (!fr) return; st.setPointerCapture(e.pointerId); drag = { x0: fx(e), moved: false } };
st.onpointermove = e => { if (!drag) return; const x = fx(e); if (Math.abs(x - drag.x0) * st.clientWidth > 5) drag.moved = true;
  if (drag.moved) { const a = Math.floor(Math.min(x, drag.x0) * fr.n); cut = [a, Math.min(fr.n, Math.max(a + 3, Math.floor(Math.max(x, drag.x0) * fr.n)))]; cutUI() } };
st.onpointerup = () => { if (drag && !drag.moved && au.duration) au.currentTime = drag.x0 * au.duration; drag = null };
$('cclr').onclick = () => { cut = null; cutUI() };
$('loop').onchange = e => loop = e.target.checked;

function cutUI() {
  const b = $('cutbox');
  if (!cut || !fr) { b.innerHTML = '<div class="placeholder-state"><div class="placeholder-text">Drag across the timeline to cut out a piece and see its own colour.</div></div>'; return }
  const s = C.color(C.sum(fr, cut[0], cut[1]), P), w = C.color(C.sum(fr), P), dh = ((s.h - w.h + 540) % 360) - 180, sg = n => (n > 0 ? '+' : '') + n.toFixed(0);
  b.innerHTML = `<div class="cut-row"><i style="background:${C.css(s)}"></i><div><div class="cut-hex">${C.hex(s)}</div><div class="hint mono" style="margin:0">${fmt(cut[0] * fr.dt)} – ${fmt(cut[1] * fr.dt)}</div></div></div>
  <div class="stats-bar"><div class="stat-chip"><span class="stat-val">${sg(dh)}°</span><span class="stat-lbl">hue vs whole</span></div>
  <div class="stat-chip"><span class="stat-val">${sg((s.s - w.s) * 100)}%</span><span class="stat-lbl">saturation</span></div>
  <div class="stat-chip"><span class="stat-val">${sg((s.l - w.l) * 100)}%</span><span class="stat-lbl">lightness</span></div></div>`;
}
function renderHist() {
  const H = C.hist(), box = $('hist');
  box.innerHTML = H.length ? H.map((e, i) => { const c = C.color(e.raw, P), hex = C.hex(c);
    return `<div class="hist-item" data-i="${i}" title="Click to copy ${hex}">${e.art ? `<img class="hist-art" src="${esc(e.art)}" alt="">` : ''}<canvas width="104" height="104" data-i="${i}"></canvas><div class="hist-meta"><div class="hist-name">${esc(e.name)}</div><div class="hist-fp">${e.fp} · ${fmt(e.dur)}</div><div class="hist-col"><i style="background:${C.css(c)}"></i><span class="hist-hex">${hex}</span></div></div><button class="btn-reset" data-d="${i}">✕</button></div>` }).join('')
    : '<div class="placeholder-state"><div class="placeholder-text">Songs you play leave a glyph here: a fuzzy fingerprint ring and their colour. Click one to copy its colour code.</div></div>';
  box.querySelectorAll('canvas').forEach(cv => { const e = H[cv.dataset.i]; C.glyph(cv, e, C.css(C.color(e.raw, P))) });
}
$('hist').onclick = e => {
  const d = e.target.dataset.d; if (d != null) { const H = C.hist(); H.splice(d, 1); C.histSave(H); renderHist(); return }
  const it = e.target.closest('.hist-item'), x = it && C.hist()[it.dataset.i]; if (!x) return;
  const hex = C.hex(C.color(x.raw, P)), lbl = it.querySelector('.hist-hex');
  copy(hex).then(() => { lbl.textContent = 'Copied ✓'; setTimeout(() => lbl.textContent = hex, 1000) });
};
$('hclr').onclick = () => { C.histSave([]); renderHist() };

function drawStrip(idx) {
  const W = st.width, H = st.height; sg.clearRect(0, 0, W, H);
  for (let x = 0; x < W; x++) { const j = Math.max(1, Math.floor((x + 1) / W * fr.n)); sg.globalAlpha = j <= idx ? 1 : .22; sg.fillStyle = C.css(C.color(C.sum(fr, 0, j), P)); sg.fillRect(x, 0, 1, H) }
  sg.globalAlpha = 1;
  if (cut) { const a = cut[0] / fr.n * W, b = cut[1] / fr.n * W; sg.fillStyle = 'rgba(0,0,0,.45)'; sg.fillRect(0, 0, a, H); sg.fillRect(b, 0, W - b, H); sg.fillStyle = '#fff'; sg.fillRect(a, 0, 2, H); sg.fillRect(b - 2, 0, 2, H) }
  sg.fillStyle = '#fff'; sg.fillRect(idx / fr.n * W, 0, 2, H);
}
function drawOrb(c, t, on, live) {
  const S = orb.width, m = S / 2; og.clearRect(0, 0, S, S);
  if (an) an.getByteFrequencyData(spec);
  let b = 0; for (let i = 0; i < 6; i++) b += spec[i]; b /= 1530;
  if (on && b - slow > .09 && ripples.length < 6) ripples.push(0);
  slow = slow * .92 + b * .08;
  // guide rings: the track the bars grow along
  og.lineWidth = S / 320; og.strokeStyle = 'rgba(255,255,255,.07)';
  [.6, .93].forEach(k => { og.beginPath(); og.arc(m, m, m * k, 0, TAU); og.stroke() });
  // glow behind the wheel
  const R = m * .58 * (1 + b * .2), g = og.createRadialGradient(m, m, m * .3, m, m, R);
  g.addColorStop(0, hsla(c, .85)); g.addColorStop(1, hsla(c, 0));
  og.fillStyle = g; og.beginPath(); og.arc(m, m, R, 0, TAU); og.fill();
  // running colour wheel, centred in the orb (disc radius in wc is wc.width/2 - 16)
  const wr = m * .44 * (1 + b * .05), ws = 2 * wr * wc.width / (wc.width / 2 - 16);
  og.globalAlpha = live ? 1 : .35; og.drawImage(wc, m - ws / 2, m - ws / 2, ws, ws); og.globalAlpha = 1;
  og.lineWidth = S / 320; og.strokeStyle = 'rgba(255,255,255,.18)'; og.beginPath(); og.arc(m, m, wr, 0, TAU); og.stroke();
  // spectrum bars: coloured when there is signal, dim neutral when idle
  const n = 120, rot = t / 9000; og.lineCap = 'round'; og.lineWidth = S / 150;
  for (let i = 0; i < n; i++) {
    const j = i < n / 2 ? i : n - 1 - i, k = 2 + Math.floor((j / 60) ** 1.5 * 110), raw = (spec[k] || 0) / 255, v = raw || (.04 + .03 * Math.sin(t / 700 + j * .4)),
      a = i / n * TAU + rot - Math.PI / 2, r0 = m * .6, r1 = r0 + m * (.03 + .3 * v);
    og.strokeStyle = raw ? hsla(c, .6 + v * .4, v * .22, (j - 30) * .35) : 'rgba(255,255,255,.16)';
    og.beginPath(); og.moveTo(m + Math.cos(a) * r0, m + Math.sin(a) * r0); og.lineTo(m + Math.cos(a) * r1, m + Math.sin(a) * r1); og.stroke();
  }
  ripples = ripples.map(x => x + .018).filter(x => x < 1);
  ripples.forEach(x => { og.strokeStyle = hsla(c, (1 - x) * .5, .15); og.lineWidth = S / 200; og.beginPath(); og.arc(m, m, m * (.6 + x * .38), 0, TAU); og.stroke() });
}
function frame(t) {
  requestAnimationFrame(frame);
  let c = { h: 0, s: 0, l: .42 }, on = false, items = [];
  if (fr) {
    on = !au.paused;
    const idx = Math.min(fr.n, Math.floor(au.currentTime / fr.dt)), s = C.sum(fr, 0, Math.max(1, idx)); c = C.color(s, P);
    $('sH').textContent = c.h.toFixed(0) + '°'; $('sS').textContent = (c.s * 100).toFixed(0) + '%'; $('sL').textContent = (c.l * 100).toFixed(0) + '%'; $('sR').textContent = s.rate.toFixed(1);
    $('time').textContent = fmt(au.currentTime) + ' / ' + fmt(au.duration || 0);
    const trail = [], step = Math.max(1, Math.floor(1 / fr.dt));
    for (let j = step; j <= idx; j += step) { const k = C.color(C.sum(fr, 0, j), P); trail.push([k.h, k.s]) }
    trail.push([c.h, c.s]); items = [{ h: c.h, s: c.s, color: C.css(c), trail }];
    drawStrip(idx);
    if (loop && cut && au.currentTime >= cut[1] * fr.dt) au.currentTime = cut[0] * fr.dt;
  }
  C.wheel(wc, items);
  $('stage').style.setProperty('--c', C.css(c)); drawOrb(c, t, on, !!fr);
}
cutUI(); renderHist(); requestAnimationFrame(frame);
