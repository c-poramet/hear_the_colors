const $ = id => document.getElementById(id);
let P = C.fromHash() || C.load(), songs = [], sel = -1;
const KN = [['shift', 'Hue shift °', 0, 359, 1], ['sg', 'Saturation gain', 0, 1.5, .01], ['sb', 'Saturation base', -1, 1, .01], ['lg', 'Lightness gain', 0, 1, .01], ['lb', 'Lightness base', -1, 1, .01]];

$('knobs').innerHTML = KN.map(k => `<label class="knob"><span>${k[1]}</span><output id="o_${k[0]}"></output><input type="range" id="k_${k[0]}" min="${k[2]}" max="${k[3]}" step="${k[4]}"></label>`).join('')
  + '<div class="toggle-row"><span class="toggle-label">Mirror hue direction</span><label class="toggle-switch"><input type="checkbox" id="k_mir"><span class="toggle-track"></span></label></div>';
KN.forEach(k => $('k_' + k[0]).oninput = e => { P[k[0]] = +e.target.value; commit() });
$('k_mir').onchange = e => { P.mir = e.target.checked ? 1 : 0; commit() };

const cur = s => C.color(s.sum, P);
function commit() { C.save(P); draw() }

function draw() {
  KN.forEach(k => { $('k_' + k[0]).value = P[k[0]]; $('o_' + k[0]).textContent = (+P[k[0]]).toFixed(k[4] < 1 ? 2 : 0) });
  $('k_mir').checked = !!P.mir;
  const items = [];
  songs.forEach((s, i) => { const c = cur(s); s.c = c;
    items.push({ h: c.h, s: c.s, color: C.css(c), label: i + 1, sel: i === sel });
    if (s.target) { const t = C.fromHex(s.target); items.push({ h: t.h, s: t.s, color: s.target, hollow: 1, label: i + 1, sel: i === sel }) } });
  C.wheel($('wheel'), items);
  $('list').innerHTML = songs.map((s, i) => `<li class="${i === sel ? 'sel' : ''}" data-i="${i}"><div class="lr"><i style="background:${C.css(s.c)}"></i><span>${i + 1}. ${s.name}</span><button class="btn-reset" data-x="${i}" title="clear target" aria-label="Clear target">✕</button></div>
    <div class="lr"><span class="hx" title="where the song lands now"><i style="background:${C.css(s.c)}"></i>${C.hex(s.c)}</span><span class="arrow">→</span><span class="hx tgt"><i style="background:${s.target || 'transparent'}"></i><input class="hexin" data-h="${i}" value="${s.target || ''}" placeholder="#rrggbb" maxlength="7" spellcheck="false" aria-label="Target hex for song ${i + 1}"></span><input type="color" value="${s.target || C.hex(s.c)}" data-t="${i}" title="pick target colour"></div></li>`).join('');
  const code = C.enc(P), url = location.href.split('#')[0].replace(/[^/]*$/, 'index.html') + '#c=' + code;
  $('code').value = url; C.seedTag(P);
  $('qr').style.display = C.qr($('qr'), url) ? '' : 'none';
}

$('list').onclick = e => { const x = e.target.dataset.x; if (x != null) songs[x].target = null; else if (!e.target.dataset.t && e.target.dataset.h == null) { const li = e.target.closest('li'); if (!li) return; sel = +li.dataset.i } draw() };
$('list').oninput = e => { const t = e.target.dataset.t; if (t != null) { songs[t].target = e.target.value; sel = +t; $('list').querySelectorAll('li')[t].querySelector('i') } };
$('list').onchange = e => { const el = e.target;
  if (el.dataset.h != null) { const i = +el.dataset.h, v = el.value.trim().replace(/^#?/, ''), m = v.match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!v) songs[i].target = null; else if (m) { songs[i].target = '#' + (v.length === 3 ? [...v].map(x => x + x).join('') : v).toLowerCase(); sel = i } else C.toast('Enter a hex colour like #c97f50');
    draw() } else if (el.dataset.t != null) draw() };

const cv = $('wheel'); let down = false;
const pick = e => { if (sel < 0 || !songs[sel]) return; const p = C.wheelPos(cv, e), s = songs[sel];
  s.target = C.hex({ h: p.h, s: p.s, l: s.target ? C.fromHex(s.target).l : s.c.l }); draw() };
cv.onpointerdown = e => { down = true; cv.setPointerCapture(e.pointerId); pick(e) };
cv.onpointermove = e => down && pick(e);
cv.onpointerup = () => down = false;

$('files').onchange = async e => {
  for (const f of e.target.files) {
    try { $('status').textContent = 'Decoding ' + f.name + '…'; const buf = await C.decode(f);
      const fr = await C.analyze(buf, p => $('status').textContent = `Analysing ${f.name}… ${Math.round(p * 100)}%`);
      songs.push({ name: f.name, fr, sum: C.sum(fr), target: null }); sel = songs.length - 1; draw();
    } catch (err) { $('status').textContent = 'Could not read ' + f.name }
  }
  $('status').textContent = songs.length + ' song(s) loaded. Nothing is uploaded anywhere.'; e.target.value = '';
};

const regress = (xs, ys, g0, lo, hi) => { const n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
  let v = 0, c = 0; xs.forEach((x, i) => { v += (x - mx) ** 2; c += (x - mx) * (ys[i] - my) });
  const g = n > 1 && v / n > .005 ? C.cl(c / v, lo, hi) : g0; return [g, my - g * mx] };
$('fit').onclick = () => {
  const L = songs.filter(s => s.target); if (!L.length) { $('status').textContent = 'Set a target colour for at least one song first.'; return }
  const T = L.map(s => C.fromHex(s.target));
  let X = 0, Y = 0; L.forEach((s, i) => { const a = s.c.a * (P.mir ? -1 : 1), d = (T[i].h - a) * Math.PI / 180; X += Math.cos(d); Y += Math.sin(d) });
  P.shift = ((Math.atan2(Y, X) * 180 / Math.PI) % 360 + 360) % 360;
  [P.sg, P.sb] = regress(L.map(s => s.sum.s0), T.map(t => t.s), P.sg, .1, 1.5);
  [P.lg, P.lb] = regress(L.map(s => s.sum.l0), T.map(t => t.l), P.lg, 0, 1);
  commit();
};
$('reset').onclick = () => { P = { ...C.DEF }; commit() };
const DOBHINT = $('dobmsg').textContent;
$('dob').oninput = e => { const v = e.target.value.replace(/\D/g, '').slice(0, 8);
  e.target.value = [v.slice(0, 2), v.slice(2, 4), v.slice(4)].filter(Boolean).join('/') };
$('dob').onkeydown = e => { if (e.key === 'Enter') $('gen').click() };
addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = document.activeElement.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || document.activeElement.isContentEditable) return;
  if (e.key.toLowerCase() === 'y') { e.preventDefault(); C.toggleYearMode(); $('yr').checked = C.yearMode(); $('dob').placeholder = C.yearMode() ? 'dd/mm/yyyy' : 'dd/mm (year ignored)'; C.toast('Include year ' + (C.yearMode() ? 'on' : 'off')) }
  else if (e.key === '[') { e.preventDefault(); C.stepBirthday(-1) }
  else if (e.key === ']') { e.preventDefault(); C.stepBirthday(1) }
});
$('gen').onclick = () => { const iso = C.parseDMY($('dob').value);
  if (!iso) { $('dobmsg').textContent = C.yearMode() ? 'Enter a real date as dd/mm/yyyy.' : 'Enter a real day as dd/mm.'; return }
  $('dobmsg').textContent = DOBHINT; P = C.bdayUse(iso); commit(); C.toast('Seed from ' + $('dob').value) };
C.onSeed = p => { P = p; commit() };
$('universal').onclick = () => { P = C.universal(); C.seedSave(P, 'Universal'); commit(); C.toast('Universal seed in use') };
$('save-seed').onclick = () => { const label = prompt('Label this seed'); if (label !== null) { C.seedSave(P, label); C.toast('Seed saved') } };
$('copy').onclick = () => C.copy($('code').value).then(() => C.toast('Link copied'));
$('dl').onclick = () => $('qr').toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'seed-' + C.enc(P) + '.png'; a.click() });
$('apply').onclick = () => { const m = $('imp').value.match(/c=([\d.]+)/), p = C.dec(m ? m[1] : $('imp').value);
  if (p) { P = p; commit(); $('imp').value = '' } else $('imp').placeholder = 'Invalid code' };
$('qr').title = 'Scan to open with this seed';
const FIND = $('foundmsg').textContent, setDob = () => $('dob').placeholder = C.yearMode() ? 'dd/mm/yyyy' : 'dd/mm (year ignored)';
$('yr').checked = C.yearMode(); setDob();
$('yr').onchange = e => { C.setYearMode(e.target.checked); setDob(); $('found').innerHTML = ''; $('foundmsg').textContent = FIND; draw() };
$('find').onclick = () => { $('foundmsg').textContent = 'Searching…'; $('found').innerHTML = '';
  C.nearDates(P, C.yearMode(), L => { $('foundmsg').textContent = L[0].pct >= 99 ? 'Exact match first, then the next closest.' : 'No exact date. Closest first:';
    $('found').innerHTML = L.map(x => `<li><i style="background:${C.hex(C.color({ hx: 1, hy: 0, s0: .5, l0: .5 }, C.fromDate(x.d)))}"></i><span>${C.fmtD(x.d)}</span><span>${x.pct}%</span><button class="btn-reset" data-d="${x.d}">Use</button></li>`).join('') }) };
$('found').onclick = e => { const d = e.target.dataset.d; if (d) { P = C.bdayUse(d); commit(); C.toast('Using ' + C.fmtD(d)) } };
draw();
