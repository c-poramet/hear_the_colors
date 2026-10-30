# Color Seed

*See music, hear colour.* Color Seed turns any song into a colour, a fingerprint glyph and a shareable card. Everything runs in your browser; audio is never uploaded.

---

## How to use it (60 seconds)

**Play page (`index.html`)**

1. Press **Load audio** (or drag a file onto the page). Wait for the analysis bar to finish.
2. Press **Space** to play. The wheel (or HSL bars) shows the song's *running* colour: the colour of everything heard so far. The timeline strip below shows how that colour evolves; the bright part is what has played.
3. **Click** the timeline to seek. **Drag** across it to cut out a section and see that section's own colour in the *Cut* panel (click it to copy the hex). Tick *Loop the cut* to repeat it.
4. Every song you analyse is added to **History** with a fingerprint glyph and its colour. Click a row to copy its hex, click the glyph to open the **share card**.
5. In the share card, switch items on or off (cover, title, colour, length, fingerprint, stats, seed code, branding) and watch the preview update. *Minimal* keeps just cover, title and colour. Download the PNG or share it.

**Keys:** `Space` play/pause, `←` `→` seek 5 s, `↑` `↓` volume, `M` mute, `Esc` clears the cut.

**Calibrate page (`calibrate.html`)**

The same song can look different to different people, so the mapping is tunable. The five knobs (hue shift, mirror, saturation gain/base, lightness gain/base) are your **seed**.

- *By hand:* drag the knobs.
- *By example:* load a few songs, select one, click the wheel where you *feel* its colour belongs (the hollow ring), repeat for a few songs, then press **Fit seed to targets**.
- *From a birthday:* type `dd/mm/yyyy` and press Generate. The same date always gives the same seed.

**Seeds and sharing.** The header shows `SEED 1.xxx.x.xx.xxx.xx.xxx`. Copy the link or QR on the Calibrate page to give someone your exact mapping, or paste a code/link into *Import*. The **BIRTHDAY** tag in the header opens your birthday history: label dates, sort them (recent use, date, label) and switch between them. If the current seed came from a birthday, its label appears in the tag.

**Privacy.** Audio is decoded and analysed locally. Only small summaries (colour numbers, fingerprint, a 192 px cover thumbnail) are kept in your browser's `localStorage`.

**Files:** `index.html` + `play.js` (player), `calibrate.html` + `app.js` (calibration), `core.js` (all maths), `card.js` (share card), `style.css`.

---

# How everything is computed

Notation: $\operatorname{clamp}(x,a,b)=\min(b,\max(a,x))$; $\operatorname{frac}(x)=x-\lfloor x\rfloor$; angles are in degrees unless stated.

## 1. Framing and spectrum

The decoded audio (sample rate $f_s$) is averaged over channels to mono, $x[t]$. It is cut into frames of $N=4096$ samples with hop $H=2048$ (50 % overlap):

$$n=\max\!\Big(1,\ \Big\lfloor \tfrac{L-N}{H}\Big\rfloor+1\Big),\qquad \Delta t=\tfrac{H}{f_s}\ \text{seconds per frame}$$

with $L$ the number of samples. Frame $i$ is multiplied by a Hann window $w[j]=\tfrac12-\tfrac12\cos\frac{2\pi j}{N}$ and transformed with a radix-2 FFT, giving $X_i[k]$. Bin $k$ has frequency $f_k=k f_s/N$, and magnitude $m_k=|X_i[k]|$.

Three frequency bands are used:

| Band | Bins | Used for |
|---|---|---|
| full | $40\ \text{Hz}\le f_k\le 8000\ \text{Hz}$ (and $k\le N/2-1$) | brightness, onsets |
| pitch | $55\ \text{Hz}\le f_k\le 2000\ \text{Hz}$ | hue |

**Silence.** A frame is silent if its RMS is below $0.003$: $\sqrt{\tfrac1N\sum_j x[j]^2}<0.003$. Silent frames are excluded from every average below.

## 2. Hue source: the circle-of-fifths direction

For each pitch-band bin the nearest equal-tempered pitch class is

$$\mathrm{pc}(k)=\Big(\operatorname{round}\big(69+12\log_2\tfrac{f_k}{440}\big)\bmod 12\Big)\in\{0,\dots,11\}\quad(0=\mathrm C)$$

Each pitch class is placed on the **circle of fifths** at angle $\theta_{\mathrm{pc}}=30^\circ\cdot(7\,\mathrm{pc}\bmod 12)$, so harmonically close keys are angularly close. With weights $q_k=\sqrt{m_k}$ (square-root compression so a few loud partials don't dominate):

$$X_i=\sum_{k}q_k\cos\theta_{\mathrm{pc}(k)},\qquad Y_i=\sum_{k}q_k\sin\theta_{\mathrm{pc}(k)}$$

The frame's harmonic direction is the unit vector $(h_x,h_y)_i=(X_i,Y_i)/\lVert(X_i,Y_i)\rVert$. Only the direction is kept; the resultant length (how "tonal" the frame is) is discarded.

## 3. Brightness source

The log-frequency spectral centroid of the full band is

$$\bar\phi_i=\frac{\sum_k m_k\log_2 f_k}{\sum_k m_k}$$

and is mapped to $[0,1]$ over the range 40 Hz–8 kHz, with a deliberate offset so typical music spans the scale:

$$\ell_i=\operatorname{clamp}\!\left(\frac{\dfrac{\bar\phi_i-\log_2 40}{\log_2 8000-\log_2 40}-0.35}{0.45},\ 0,\ 1\right)$$

($\ell_i=0.5$ if $\sum m_k=0$.) A song's lightness source is the mean of $\ell_i$ over non-silent frames, $\bar\ell$.

## 4. Onsets ("hits per second") and the saturation source

Spectral flux uses log-compressed magnitudes $v_k=\ln(1+m_k)$ and only counts increases:

$$F_i=\sum_{k}\max\!\big(0,\ v_{k,i}-v_{k,i-1}\big)$$

Flux is normalised by its maximum, $\hat F_i=F_i/\max_j F_j$. Let $\mu_i$ be the mean of $\hat F$ over frames $i-10\dots i+10$ (clipped at the song edges). Frame $i$ is an **onset** iff it is non-silent, is a local maximum, and clearly above its neighbourhood:

$$\hat F_i>1.5\,\mu_i+0.05,\qquad \hat F_i\ge\hat F_{i-1},\qquad \hat F_i>\hat F_{i+1}$$

For any section of frames $[a,b)$ the onset rate is $r=\dfrac{\#\text{onsets in }[a,b)}{(b-a)\,\Delta t}$ (hits/s) and the saturation source is a saturating transform of it:

$$s_0=1-e^{-r/5}\in[0,1),\qquad\text{so}\quad r=-5\ln(1-s_0)$$

(5 hits/s gives $s_0\approx0.63$.)

## 5. Averages over any section in O(1)

Prefix sums over non-silent frames store $\sum h_x,\ \sum h_y,\ \sum\ell$, the count of non-silent frames, and the onset count. For a section $[a,b)$ with $c$ non-silent frames:

$$\bar h_x=\tfrac1c\sum h_x,\quad \bar h_y=\tfrac1c\sum h_y,\quad l_0=\tfrac1c\sum\ell,\quad s_0\text{ as above}$$

This is why the timeline, the cut tool and the running colour are instant: any slice is two array lookups per quantity.

## 6. From numbers to a colour (the seed)

A **seed** is $(\sigma,\ \epsilon,\ g_s,\ b_s,\ g_l,\ b_l)$ = (hue shift, mirror flag, saturation gain, saturation base, lightness gain, lightness base). Defaults: $(0,0,0.75,0.15,0.40,0.30)$.

With $a=\operatorname{atan2}(\bar h_y,\bar h_x)$ in degrees:

$$H=\Big((-1)^{\epsilon}\,a+\sigma\Big)\bmod 360,\qquad S=\operatorname{clamp}(b_s+g_s s_0,\,0,\,1),\qquad L=\operatorname{clamp}(b_l+g_l l_0,\,0.05,\,0.95)$$

and $(H,S,L)$ is standard HSL → RGB → hex. So: the **direction** of the average harmonic vector is the hue, the **busyness** is saturation, and the **brightness** is lightness. Mirror flips the direction in which keys travel around the wheel.

**Seed code.** Six integers joined by dots: `1.` + `round(σ) mod 360` . `ε` . `round(100 g_s)` . `round(100 b_s)+100` . `round(100 g_l)` . `round(100 b_l)+100`. Decoding divides back and clamps to $g_s\in[0,1.5]$, $b_s,b_l\in[-1,1]$, $g_l\in[0,1]$. Precision is therefore 1° and 0.01.

## 7. Calibration fit ("Fit seed to targets")

Given songs $j=1..m$ with measured angle $a_j$ (negated if mirrored) and saturation/lightness sources $s_{0j},l_{0j}$, and target colours with hue $\tau_j$, saturation $T^s_j$, lightness $T^l_j$:

**Hue shift** is the *circular mean* of the residuals $d_j=\tau_j-(\pm a_j)$, which minimises the summed squared chord distance on the circle:

$$\sigma=\operatorname{atan2}\!\Big(\sum_j\sin d_j,\ \sum_j\cos d_j\Big)\bmod 360$$

**Saturation and lightness** are ordinary least squares lines $y=g\,x+b$. With $\bar x,\bar y$ the means and $V=\sum_j(x_j-\bar x)^2$:

$$g=\operatorname{clamp}\!\Big(\frac{\sum_j(x_j-\bar x)(y_j-\bar y)}{V},\ g_{\min},\ g_{\max}\Big),\qquad b=\bar y-g\,\bar x$$

($x=s_0$ or $l_0$, $y$ = target $S$ or $L$; bounds $[0.1,1.5]$ for saturation and $[0,1]$ for lightness.) If there is a single target or the spread is too small ($V/m\le0.005$), the gain is left unchanged and only the base is refitted: $b=\bar y-g\bar x$. The mirror flag is never changed by the fit.

## 8. Birthday seeds

For a date $D$ let $n$ be its day number since 1970-01-01 (UTC). Each seed component is a **Weyl sequence** $u_\alpha(n)=\operatorname{frac}(n\alpha)$ with a fixed irrational-like step $\alpha$; for an irrational $\alpha$ these values are equidistributed in $[0,1)$ and consecutive days differ by exactly $\alpha \bmod 1$ in every coordinate, so neighbouring dates land far apart (e.g. the hue shift moves by $360\times0.85667\approx308.4^\circ\equiv-51.6^\circ$ per day).

| Seed field | Formula | $\alpha$ |
|---|---|---|
| hue shift $\sigma$ | $360\,u_{\alpha_1}$ | 0.8566748838545029 |
| saturation gain | $0.40+0.60\,u_{\alpha_2}$ | 0.7338918566271260 |
| saturation base | $0.30\,u_{\alpha_3}$ | 0.6287067210378087 |
| lightness gain | $0.25+0.35\,u_{\alpha_4}$ | 0.5385972572236101 |
| lightness base | $0.12+0.28\,u_{\alpha_5}$ | 0.4614027427763898 |
| mirror | $u_{\alpha_6}>0.5$ | 0.3819660112501051 |

The result is passed through the seed code (so it is rounded to 1° / 0.01). Same date ⇒ same seed, always. The number of distinct codes reachable is about $360\cdot2\cdot61\cdot31\cdot36\cdot29\approx1.4\times10^{9}$, so for the 47 thousand dates in 1900–2030 collisions are rare but possible; the birthday popover lists every date that gives the current code.

## 9. Fingerprint (64-bit, similarity-preserving)

A 44-number feature vector $\mathbf v$ summarises a song:

- **Chroma histogram (12):** per non-silent frame, the pitch-class weights $q$ are normalised to sum 1 and accumulated; with total $\Gamma_p$ over frames, $v_p=12\big(\Gamma_p/\sum\Gamma-\tfrac1{12}\big)$ (deviation from a flat histogram).
- **Brightness contour (16):** the song is cut into 16 equal segments; $L_q$ = mean $\ell$ of the segment's non-silent frames; $v=3(L_q-\bar L)$.
- **Busyness contour (16):** $R_q=1-e^{-r_q/5}$ with $r_q$ the segment's onset rate; $v=3(R_q-\bar R)$.

Bit $b$ ($b=1..64$) is $\operatorname{sign}(\mathbf w_b\cdot\mathbf v)>0$, where the 64 vectors $\mathbf w_b\in[-1,1]^{44}$ come from a fixed-seed PRNG (Mulberry32, seed 20260101), so the same audio yields the same fingerprint on every device. This is **random-hyperplane hashing**: the probability that a bit differs between two songs is approximately $\theta/\pi$, with $\theta$ the angle between their feature vectors, so similar songs differ in few bits. The 64 bits are shown as 16 hex digits.

**Similarity** $=1-\dfrac{\text{Hamming}(\mathrm{fp}_1,\mathrm{fp}_2)}{64}$. A newly analysed song is reported as "resembles …" above 80 %, and it replaces an existing history entry if the fingerprints are identical, or the names match with similarity above 90 %.

**Glyph.** 64 ticks around a ring, one per bit (long and opaque for 1, short and faint for 0), with an inner polygon whose 16 vertices have radius $c\,(0.12+0.4(0.35L_q+0.65R_q))$.

## 10. What you see while playing

- **Running colour:** at time $t$, frame index $i=\lfloor t/\Delta t\rfloor$ and the colour of section $[0,i)$ (§5–6). The displayed colour eases toward it with $\kappa=1-e^{-\delta/280\,\text{ms}}$ per animation step $\delta$; hue moves along the shorter arc.
- **Timeline strip:** pixel column $x$ of $w$ shows the colour of $[0,\lfloor (x+1)n/w\rfloor)$, i.e. the running colour at that point in the song.
- **Cut panel:** colour of $[a,b)$; deltas are $\Delta H=((H_{cut}-H_{all}+540)\bmod 360)-180$, and $\Delta S,\Delta L$ in percentage points.
- **Spectrum bars:** a 1024-point analyser, 56 log-spaced bars with edges $e_i=\max\!\big(e_{i-1}+1,\ \operatorname{round}(2\,(184)^{i/56})\big)$ over bins 2…368; height target $(m/255)^{1.25}(1+0.55\,i/56)$, rising with factor 0.55 and falling with 0.14 per frame; peak caps fall 0.007 per frame. Volume is applied with a squared taper, $\text{gain}=v^2$.
- **Share card stats:** HUE/SAT/LIGHT are $H,S,L$ of the song's overall colour; HITS/S is $r=-5\ln(1-s_0)$.

## Known limits

The harmonic direction is a statistical summary of pitch content, not key detection; noisy or atonal music gives a weakly defined hue (the vector length, which would measure this, is intentionally not used). Onset detection is a simple flux peak-picker. Fingerprints are stable for the same audio decode but can shift slightly between different encodings of the same song.
