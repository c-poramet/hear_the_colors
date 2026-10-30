(() => {
const TAU = Math.PI * 2, fmt = t => (t / 60 | 0) + ':' + String(t % 60 | 0).padStart(2, '0');
const loadImg = src => new Promise(res => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src });
const fonts = () => document.fonts ? Promise.all(['700 40px "Space Mono"', '400 24px "Space Mono"', '600 46px Inter', '400 24px Inter'].map(f => document.fonts.load(f).catch(() => 0))) : Promise.resolve();
const wrap = (g, text, w, max) => { const words = text.split(/\s+/), out = []; let l = '';
  for (const wd of words) { const t = l ? l + ' ' + wd : wd; if (g.measureText(t).width <= w || !l) l = t; else { out.push(l); l = wd } }
  if (l) out.push(l);
  if (out.length > max) { out.length = max; out[max - 1] += '…' }
  return out.map(s => { if (g.measureText(s).width <= w) return s; while (s.length && g.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…' }) };

/* ---------- what can be shown on the card ---------- */
const OPT = [['brand', 'Brand & footer'], ['seed', 'Seed code'], ['cover', 'Cover art'], ['title', 'Title'], ['color', 'Colour'], ['length', 'Length'], ['fp', 'Fingerprint'], ['stats', 'Stats']];
const CONTENT = ['cover', 'title', 'color', 'length', 'fp', 'stats'], CK = 'colorseed.card.v1';
const getOpts = () => { let o = {}; try { o = JSON.parse(localStorage.getItem(CK)) || {} } catch (e) {} const r = {}; OPT.forEach(([k]) => r[k] = o[k] !== false); return r };
const putOpts = o => { try { localStorage.setItem(CK, JSON.stringify(o)) } catch (e) {} };

/* The card is drawn as one of the app's panels (style guide §5) on the page background, at ~2x CSS scale:
   --bg #2b2b2b outside, --card-dark #111 panel, 2px low-opacity border, double shadow, mono data / Inter copy.
   Blocks stack vertically, so any subset of options still gives a tight, balanced card. */
C.cardRender = async (e, P, o = getOpts()) => {
  await fonts(); const art = o.cover ? await loadImg(e.art) : null;
  const c = C.color(e.raw, P), hex = C.hex(c), rate = -5 * Math.log(1 - Math.min(.999, e.raw.s0)), seed = C.enc(P);
  const tint = a => `hsl(${c.h} ${c.s * 100}% ${c.l * 100}% / ${a})`;
  const MONO = '"Space Mono", monospace', UI = 'Inter, system-ui, sans-serif';
  const W = 1080, M = 36, PAD = 60, X0 = M + PAD, CW = W - 2 * X0, GAP = 52, MIN_H = 1080;
  const mc = document.createElement('canvas').getContext('2d');
  const hasHead = o.brand || o.seed, hasText = o.title || o.color || o.length, hasId = o.cover || hasText, onlyFp = !hasId && !o.stats;

  // ---- measure
  const blocks = [];
  const head = { h: 52, draw: (g, y) => {
    if (o.brand) { g.fillStyle = c.l > .02 ? C.css(c) : '#f0f0f0'; g.beginPath(); g.arc(X0 + 8, y + 26, 8, 0, TAU); g.fill();
      T(g, 'COLOR SEED', X0 + 30, y + 35, '600 30px ' + UI, '#f0f0f0', 'left', 2) }
    if (o.seed) { g.font = '700 24px ' + MONO; g.letterSpacing = '1px'; const label = 'SEED ' + seed, sw = g.measureText(label).width + 44; g.letterSpacing = '0px';
      g.fillStyle = 'rgba(201,127,80,.1)'; C.rr(g, X0 + CW - sw, y, sw, 52, 12); g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(201,127,80,.22)'; g.stroke();
      T(g, label, X0 + CW - sw / 2, y + 34, '700 24px ' + MONO, '#c97f50', 'center', 1) } } };

  // identity block: cover + title + colour + length
  let id = null;
  if (hasId) {
    if (o.cover && hasText) {
      const cov = 264, tx = X0 + cov + 44, tw = CW - cov - 44; mc.font = '600 50px ' + UI;
      const lines = o.title ? wrap(mc, e.name, tw, 3) : [], titleH = lines.length * 62, botH = (o.color ? 56 : 0) + (o.length ? (o.color ? 16 : 0) + 24 : 0);
      const h = Math.max(cov, titleH + (titleH && botH ? 28 : 0) + botH);
      id = { h, draw: (g, y) => { drawCover(g, X0, y + (h - cov) / 2, cov);
        lines.forEach((l, i) => T(g, l, tx, y + 46 + i * 62, '600 50px ' + UI, '#f0f0f0'));
        let by = y + (h - cov) / 2 + cov - botH; if (!lines.length) by = y + (h - botH) / 2;
        if (o.color) { swatch(g, tx, by, 56, hex, 44); by += 56 + 16 }
        if (o.length) T(g, 'LENGTH ' + fmt(e.dur), tx, by + 20, '400 24px ' + MONO, 'rgba(255,255,255,.38)', 'left', 1) } };
    } else if (o.cover) {
      const cov = Math.min(CW, 520); id = { h: cov, draw: (g, y) => drawCover(g, X0 + (CW - cov) / 2, y, cov) };
    } else {
      const big = !o.stats && !o.fp, fs = big ? 72 : 60, lh = fs * 1.22; mc.font = `600 ${fs}px ` + UI;
      const lines = o.title ? wrap(mc, e.name, CW, 3) : [], titleH = lines.length * lh, sw = big ? 76 : 60;
      const h = titleH + (o.color ? (titleH ? 28 : 0) + sw : 0) + (o.length ? ((titleH || o.color) ? 20 : 0) + 24 : 0);
      id = { h, draw: (g, y) => { let yy = y; lines.forEach((l, i) => T(g, l, X0, yy + fs * .95 + i * lh, `600 ${fs}px ` + UI, '#f0f0f0')); yy += titleH;
        if (o.color) { yy += titleH ? 28 : 0; swatch(g, X0, yy, sw, hex, big ? 64 : 48); yy += sw }
        if (o.length) { yy += (titleH || o.color) ? 20 : 0; T(g, 'LENGTH ' + fmt(e.dur), X0, yy + 20, '400 24px ' + MONO, 'rgba(255,255,255,.38)', 'left', 1) } } };
    }
  }
  function drawCover(g, x, y, s) { g.save(); C.rr(g, x, y, s, s, 24); g.clip();
    if (art) g.drawImage(art, x, y, s, s); else { g.fillStyle = C.css(c); g.fillRect(x, y, s, s) }
    g.restore(); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.14)'; C.rr(g, x, y, s, s, 24); g.stroke() }
  function swatch(g, x, y, s, hx, fs) { g.fillStyle = C.css(c); C.rr(g, x, y, s, s, 16); g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.2)'; g.stroke();
    T(g, hx, x + s + 22, y + s / 2 + fs * .34, `700 ${fs}px ` + MONO, '#f0f0f0') }

  // fingerprint block
  let fp = null;
  if (o.fp) { const D = onlyFp ? 640 : 480, capH = 36 + 22 + 16 + 40;
    fp = { h: D + capH, draw: (g, y) => { const cx = X0 + CW / 2, cy = y + D / 2;
      const disc = g.createRadialGradient(cx, cy, 0, cx, cy, D / 2); disc.addColorStop(0, 'rgba(0,0,0,.45)'); disc.addColorStop(1, 'rgba(0,0,0,.25)');
      g.fillStyle = disc; g.beginPath(); g.arc(cx, cy, D / 2, 0, TAU); g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.11)'; g.stroke();
      const gs = Math.round(D * .933), tmp = document.createElement('canvas'); tmp.width = tmp.height = gs; C.glyph(tmp, e, C.css(c));
      g.save(); g.shadowColor = tint(.55); g.shadowBlur = 60; g.drawImage(tmp, cx - gs / 2, cy - gs / 2); g.restore();
      T(g, 'FINGERPRINT', cx, y + D + 50, '700 20px ' + MONO, 'rgba(255,255,255,.38)', 'center', 4);
      T(g, e.fp.match(/.{4}/g).join('  '), cx, y + D + 98, '700 38px ' + MONO, '#f0f0f0', 'center', 2) } } }

  // stats row (style guide stat chips)
  let st = null;
  if (o.stats) { const stats = [['HUE', c.h.toFixed(0) + '°'], ['SAT', (c.s * 100).toFixed(0) + '%'], ['LIGHT', (c.l * 100).toFixed(0) + '%'], ['HITS / S', rate.toFixed(1)]], cw = (CW - 48) / 4;
    st = { h: 108, draw: (g, y) => stats.forEach(([l, v], i) => { const x = X0 + i * (cw + 16);
      g.fillStyle = '#1f1f1f'; C.rr(g, x, y, cw, 108, 20); g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.07)'; g.stroke();
      T(g, v, x + 24, y + 56, '700 40px ' + MONO, '#f0f0f0'); T(g, l, x + 24, y + 88, '600 18px ' + UI, 'rgba(255,255,255,.38)', 'left', 1.6) }) } }

  const foot = o.brand ? { h: 24, draw: (g, y) => T(g, 'Color Seed · see music, hear colour', X0, y + 20, '400 20px ' + MONO, 'rgba(255,255,255,.28)', 'left', 1) } : null;
  const mid = [id, fp, st].filter(Boolean);

  // ---- layout: header on top, footer at the bottom, middle group centred between them
  const top = M + PAD, midH = mid.reduce((a, b) => a + b.h, 0) + GAP * Math.max(0, mid.length - 1);
  const natural = top + (hasHead ? head.h + GAP : 0) + midH + (foot ? GAP + foot.h : 0) + PAD + M, H = Math.max(natural, MIN_H);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');

  g.fillStyle = '#2b2b2b'; g.fillRect(0, 0, W, H);
  g.save(); g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 56; g.shadowOffsetY = 20; g.fillStyle = '#111'; C.rr(g, M, M, W - 2 * M, H - 2 * M, 36); g.fill(); g.restore();
  g.save(); C.rr(g, M, M, W - 2 * M, H - 2 * M, 36); g.clip();
  const gy = M + (H - 2 * M) * .36, bg = g.createRadialGradient(W / 2, gy, 0, W / 2, gy, Math.hypot(W / 2, H * .64) * .68); bg.addColorStop(0, tint(.2)); bg.addColorStop(1, tint(0)); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.restore();
  g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.1)'; C.rr(g, M, M, W - 2 * M, H - 2 * M, 36); g.stroke();

  let y = top; if (hasHead) { head.draw(g, y); y += head.h + GAP }
  const bottom = H - M - PAD - (foot ? foot.h + GAP : 0), avail = bottom - y; y += Math.max(0, (avail - midH) / 2);
  mid.forEach(b => { b.draw(g, y); y += b.h + GAP });
  if (foot) foot.draw(g, H - M - PAD - foot.h);
  return cv;
};
function T(g, s, x, y, font, col, al = 'left', ls = 0) { g.font = font; g.fillStyle = col; g.textAlign = al; g.letterSpacing = ls + 'px'; g.fillText(s, x, y); g.letterSpacing = '0px' }

/* ---------- modal: live preview + visibility toggles ---------- */
C.card = async (e, P) => {
  const prev = document.activeElement; let o = getOpts(), tick = 0, cv = null;
  document.getElementById('modal')?.remove();
  const m = document.createElement('div'); m.id = 'modal'; m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Share card');
  m.innerHTML = `<div class="modal-box card-box"><div class="frame"></div><section class="panel card-side"><div class="panel-title">Show on card</div>
    ${OPT.map(([k, l]) => `<div class="toggle-row"><span class="toggle-label">${l}</span><label class="toggle-switch"><input type="checkbox" data-k="${k}" aria-label="${l}"${o[k] ? ' checked' : ''}><span class="toggle-track"></span></label></div>`).join('')}
    <div class="btn-row presets"><button class="btn-reset" data-p="all">All</button><button class="btn-reset" data-p="min">Minimal</button></div>
    <div class="btn-row"><button class="btn-analyze" data-a="dl">Download PNG</button><button class="btn-reset" data-a="share" hidden>Share</button><button class="btn-reset" data-a="x">Close</button></div></section></div>`;
  document.body.appendChild(m);
  const slug = e.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'song', file = () => new Promise(r => cv.toBlob(r, 'image/png')), fname = 'colorseed-' + slug + '.png';
  const frame = m.querySelector('.frame'), sync = () => m.querySelectorAll('[data-k]').forEach(i => i.checked = !!o[i.dataset.k]);
  const refresh = async () => { const my = ++tick, c = await C.cardRender(e, P, o); if (my !== tick) return; c.className = 'card-preview'; frame.replaceChildren(c); cv = c };
  const set = n => { if (!CONTENT.some(k => n[k])) { C.toast('Keep at least one item on the card'); sync(); return } o = n; putOpts(o); sync(); refresh() };
  const shut = () => { m.remove(); removeEventListener('keydown', key, true); prev && prev.focus && prev.focus() };
  const key = ev => { if (ev.key === 'Escape') { ev.stopPropagation(); shut() } };
  addEventListener('keydown', key, true);
  await refresh();
  file().then(b => { if (navigator.canShare && navigator.canShare({ files: [new File([b], fname, { type: 'image/png' })] })) m.querySelector('[data-a=share]').hidden = false });
  m.onchange = ev => { const k = ev.target.dataset.k; if (k) set({ ...o, [k]: ev.target.checked }) };
  m.onclick = async ev => { if (ev.target === m) return shut();
    const p = ev.target.closest('[data-p]'); if (p) { const all = {}; OPT.forEach(([k]) => all[k] = true); return set(p.dataset.p === 'all' ? all : { brand: false, seed: false, cover: true, title: true, color: true, length: false, fp: false, stats: false }) }
    const a = ev.target.closest('[data-a]'); if (!a) return;
    if (a.dataset.a === 'x') shut();
    else if (a.dataset.a === 'dl') { const b = await file(), l = document.createElement('a'); l.href = URL.createObjectURL(b); l.download = fname; l.click(); setTimeout(() => URL.revokeObjectURL(l.href), 1000); C.toast('Card saved') }
    else if (a.dataset.a === 'share') { const b = await file(); try { await navigator.share({ files: [new File([b], fname, { type: 'image/png' })], title: e.name }) } catch (err) {} } };
  m.querySelector('[data-a=dl]').focus();
};
})();
