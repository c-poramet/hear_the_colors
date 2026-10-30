const $ = id => document.getElementById(id);
const P = C.fromHash() || C.load(), au = $('au'), st = $('strip'), sg = st.getContext('2d');
document.querySelectorAll('nav a').forEach(a => a.href += location.hash);
let fr = null;

$('file').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  fr = null; au.pause(); au.src = URL.createObjectURL(f);
  try { $('status').textContent = 'Decoding…'; const buf = await C.decode(f);
    fr = await C.analyze(buf, p => $('status').textContent = `Analysing… ${Math.round(p * 100)}%`);
    $('status').textContent = f.name + ' ready. Press play.';
    const c = C.color(C.sum(fr), P); $('fsw').style.background = C.css(c);
    $('ft').textContent = 'Whole song: ' + C.hex(c) + ` (h ${c.h.toFixed(0)}° s ${(c.s * 100).toFixed(0)}% l ${(c.l * 100).toFixed(0)}%)`;
  } catch (err) { $('status').textContent = 'Could not read that file.' }
};
st.onclick = e => { if (fr && au.duration) au.currentTime = e.offsetX / st.clientWidth * au.duration };

function frame() {
  requestAnimationFrame(frame);
  if (!fr) return;
  const idx = Math.min(fr.n, Math.floor(au.currentTime / fr.dt)), s = C.sum(fr, 0, Math.max(1, idx)), c = C.color(s, P);
  document.body.style.setProperty('--c', C.css(c)); $('now').style.background = C.css(c);
  $('read').textContent = `hue ${c.h.toFixed(0)}°  sat ${(c.s * 100).toFixed(0)}%  light ${(c.l * 100).toFixed(0)}%\n${s.rate.toFixed(1)} hits/s · brightness ${s.l0.toFixed(2)}`;
  const trail = [], step = Math.max(1, Math.floor(1 / fr.dt));
  for (let j = step; j <= idx; j += step) { const k = C.color(C.sum(fr, 0, j), P); trail.push([k.h, k.s]) }
  trail.push([c.h, c.s]);
  C.wheel($('wheel'), [{ h: c.h, s: c.s, color: C.css(c), trail }]);
  const W = st.width, H = st.height; sg.clearRect(0, 0, W, H);
  for (let x = 0; x < W; x++) { const j = Math.max(1, Math.floor((x + 1) / W * fr.n)); sg.globalAlpha = j <= idx ? 1 : .25;
    sg.fillStyle = C.css(C.color(C.sum(fr, 0, j), P)); sg.fillRect(x, 0, 1, H) }
  sg.globalAlpha = 1; sg.fillStyle = '#fff'; sg.fillRect(idx / fr.n * W, 0, 2, H);
}
frame();
