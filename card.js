(() => {
const TAU = Math.PI * 2, fmt = t => (t / 60 | 0) + ':' + String(t % 60 | 0).padStart(2, '0');
const loadImg = src => new Promise(res => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src });
const fonts = () => document.fonts ? Promise.all(['700 40px "Space Mono"', '400 24px "Space Mono"', '600 46px Inter', '400 24px Inter'].map(f => document.fonts.load(f).catch(() => 0))) : Promise.resolve();
const wrap = (g, text, w, max) => { const words = text.split(/\s+/), out = []; let l = '';
  for (const wd of words) { const t = l ? l + ' ' + wd : wd; if (g.measureText(t).width <= w || !l) l = t; else { out.push(l); l = wd } }
  if (l) out.push(l);
  if (out.length > max) { out.length = max; out[max - 1] += '…' }
  return out.map(s => { if (g.measureText(s).width <= w) return s; while (s.length && g.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…' }) };

// 1080x1440 portrait card, drawn with the same tokens as the app
C.cardRender = async (e, P) => {
  await fonts(); const art = await loadImg(e.art);
  const W = 1080, H = 1440, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const c = C.color(e.raw, P), hex = C.hex(c), rate = -5 * Math.log(1 - Math.min(.999, e.raw.s0)), seed = C.enc(P);
  const tint = (a, dl = 0) => `hsl(${c.h} ${c.s * 100}% ${C.cl(c.l + dl, 0, 1) * 100}% / ${a})`;
  const MONO = '"Space Mono", monospace', UI = 'Inter, system-ui, sans-serif';
  const T = (s, x, y, font, col, al = 'left', ls = 0) => { g.font = font; g.fillStyle = col; g.textAlign = al; g.letterSpacing = ls + 'px'; g.fillText(s, x, y); g.letterSpacing = '0px' };

  g.fillStyle = '#111'; g.fillRect(0, 0, W, H);
  const bg = g.createRadialGradient(W / 2, 560, 40, W / 2, 560, 980); bg.addColorStop(0, tint(.3)); bg.addColorStop(1, tint(0)); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.11)'; C.rr(g, 24, 24, W - 48, H - 48, 36); g.stroke();

  // header
  T('COLOR SEED', 72, 108, '700 26px ' + MONO, '#f0f0f0', 'left', 3);
  g.font = '700 22px ' + MONO; g.letterSpacing = '1px'; const sw = g.measureText('SEED ' + seed).width + 40; g.letterSpacing = '0px';
  g.fillStyle = 'rgba(201,127,80,.1)'; C.rr(g, W - 72 - sw, 76, sw, 44, 10); g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(201,127,80,.25)'; g.stroke();
  T('SEED ' + seed, W - 72 - sw / 2, 107, '700 22px ' + MONO, '#c97f50', 'center', 1);

  // cover + title
  g.save(); C.rr(g, 72, 168, 288, 288, 28); g.clip();
  if (art) g.drawImage(art, 72, 168, 288, 288); else { g.fillStyle = C.css(c); g.fillRect(72, 168, 288, 288) }
  g.restore(); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.14)'; C.rr(g, 72, 168, 288, 288, 28); g.stroke();
  g.font = '600 48px ' + UI; const lines = wrap(g, e.name, 616, 3);
  lines.forEach((l, i) => T(l, 392, 224 + i * 60, '600 48px ' + UI, '#f0f0f0'));
  g.fillStyle = C.css(c); C.rr(g, 392, 384, 44, 44, 10); g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.2)'; g.stroke();
  T(hex, 452, 418, '700 44px ' + MONO, '#f0f0f0');
  T('LENGTH ' + fmt(e.dur), 392, 456, '400 24px ' + MONO, 'rgba(255,255,255,.38)', 'left', 1);

  // fingerprint art
  const cx = W / 2, cy = 800;
  const disc = g.createRadialGradient(cx, cy, 0, cx, cy, 300); disc.addColorStop(0, 'rgba(0,0,0,.45)'); disc.addColorStop(1, 'rgba(0,0,0,.25)');
  g.fillStyle = disc; g.beginPath(); g.arc(cx, cy, 300, 0, TAU); g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.11)'; g.stroke();
  const tmp = document.createElement('canvas'); tmp.width = tmp.height = 560; C.glyph(tmp, e, C.css(c));
  g.save(); g.shadowColor = tint(.55); g.shadowBlur = 60; g.drawImage(tmp, cx - 280, cy - 280); g.restore();
  T('FINGERPRINT', cx, 1152, '700 20px ' + MONO, 'rgba(255,255,255,.38)', 'center', 4);
  T(e.fp.match(/.{4}/g).join('  '), cx, 1198, '700 38px ' + MONO, '#f0f0f0', 'center', 2);

  // stats
  const stats = [['HUE', c.h.toFixed(0) + '°'], ['SAT', (c.s * 100).toFixed(0) + '%'], ['LIGHT', (c.l * 100).toFixed(0) + '%'], ['HITS / S', rate.toFixed(1)]], cw = (W - 144 - 48) / 4;
  stats.forEach(([l, v], i) => { const x = 72 + i * (cw + 16);
    g.fillStyle = '#1f1f1f'; C.rr(g, x, 1244, cw, 100, 14); g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.07)'; g.stroke();
    T(v, x + 22, 1296, '700 38px ' + MONO, '#f0f0f0'); T(l, x + 22, 1326, '700 17px ' + MONO, 'rgba(255,255,255,.38)', 'left', 1.5) });
  T('Color Seed · see music, hear colour', 72, 1396, '400 20px ' + MONO, 'rgba(255,255,255,.28)', 'left', 1);
  return cv;
};

C.card = async (e, P) => {
  const prev = document.activeElement, cv = await C.cardRender(e, P);
  document.getElementById('modal')?.remove();
  const m = document.createElement('div'); m.id = 'modal'; m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Share card');
  m.innerHTML = '<div class="modal-box"><div class="frame"></div><div class="btn-row"><button class="btn-analyze" data-a="dl">Download PNG</button><button class="btn-reset" data-a="share" hidden>Share</button><button class="btn-reset" data-a="x">Close</button></div></div>';
  cv.className = 'card-preview'; m.querySelector('.frame').appendChild(cv); document.body.appendChild(m);
  const slug = e.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'song', file = () => new Promise(r => cv.toBlob(r, 'image/png'));
  const shut = () => { m.remove(); removeEventListener('keydown', key, true); prev && prev.focus && prev.focus() };
  const key = ev => { if (ev.key === 'Escape') { ev.stopPropagation(); shut() } };
  addEventListener('keydown', key, true);
  file().then(b => { const f = new File([b], 'colorseed-' + slug + '.png', { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) m.querySelector('[data-a=share]').hidden = false });
  m.onclick = async ev => { if (ev.target === m) return shut(); const a = ev.target.closest('[data-a]'); if (!a) return;
    if (a.dataset.a === 'x') shut();
    else if (a.dataset.a === 'dl') { const b = await file(), l = document.createElement('a'); l.href = URL.createObjectURL(b); l.download = 'colorseed-' + slug + '.png'; l.click(); setTimeout(() => URL.revokeObjectURL(l.href), 1000); C.toast('Card saved') }
    else if (a.dataset.a === 'share') { const b = await file(); try { await navigator.share({ files: [new File([b], 'colorseed-' + slug + '.png', { type: 'image/png' })], title: e.name }) } catch (err) {} } };
  m.querySelector('[data-a=dl]').focus();
};
})();
