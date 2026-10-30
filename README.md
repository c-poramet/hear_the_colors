# Color Seed

See music, hear colour. Load a song and Color Seed turns it into a colour: **hue** is where the song sits on the circle of fifths (its key area), **saturation** is rhythmic density (hits per second), **lightness** is the brightness of its timbre. Everything runs in your browser; audio never leaves your device.

## Pages

**Play** (`index.html`)
- Drop or load a song. The colour builds as it plays, shown as a colour wheel (with the path it has travelled) or as HSL bars. The wheel/HSL toggle and the **Cut** toggle sit on the visualiser; HSL is the default and the Cut panel is hidden until switched on.
- **Cut**: drag across the timeline to get the colour of just that piece. Without Cut, dragging simply seeks.
- **History** is a picture-first card view with three full-width tabs:
  - *Songs*: the legacy row view is the default, with an optional colour-tinted card view. The selected song includes cover or fingerprint, colour with its hex, key dial, rhythm and brightness meters, copy / share card / remove.
  - *Compare*: all recent songs on a wheel or as HSL bars, plus a similarity matrix with thumbnails on both axes. The matrix can show only one triangle or switch to two song selectors; compare it using any combination of hue, saturation and lightness, with **All** enabling all three. Its colours are normalized against the loaded comparisons, so the strongest pair is the strongest visible match. The selected pair includes key dials and thumbnail-backed hue, saturation and lightness bars.
  - *Birthdays*: pick a song, then see its colour under each saved birthday as a card. Click a card to show or hide it in the wheel and colour strip; **Use** switches to that birthday.
  Every hex code is shown with a swatch of its colour.
- **Share card**: toggles are grouped (Header, Song, Visuals). Optional audio metadata and the saved birthdate can be included. Fingerprint style: *Ring*, *HSL bars* or *Wheel path*; HSL bars can include the overtime path or remain as bare bars. Songs loaded before this version have no recorded movement; load them again to enable the two path styles.

**Calibrate** (`calibrate.html`)
- Load songs and set target colours by clicking the wheel, using the colour picker, or typing a hex code (`#c97f50` or `#c85`) and **Fit seed to targets**, or tune the five knobs by hand.
- **Seed from date**: same day, same seed. By default the **year is ignored**: the 366 calendar days get evenly spaced hue shifts (never more than 1° apart) and the other knobs follow a low-discrepancy sequence, so neighbouring days differ as much as possible and every day has its own seed. Switch on **Include year** to give every full date its own seed (dates since 1970, matching earlier versions).
- **Dates for this seed**: ranks the dates whose seed gives the closest colours to the current knobs (exact matches first) and shows a match percentage. Respects the Include year switch.
- **Share**: copy a link or QR code that carries the seed (`#c=1.…`).

## Seeds and birthdays
A seed is six numbers (hue shift, mirror, saturation gain/base, lightness gain/base) shown as `SEED 1.…`. The BIRTHDAY tag in the header lists dates that produce the current seed and your saved birthdays. Changing *Include year* re-derives the seed of the birthday in use. Year-less dates are stored as `0000-MM-DD`.

## Files
`core.js` analysis, colour, seeds, birthdays · `play.js` Play page · `app.js` Calibrate page · `card.js` share card · `style.css` · `index.html` · `calibrate.html`

## Run it
Serve the folder with any static server (`python3 -m http.server`) and open `index.html`. Fonts and the QR/tag libraries load from CDNs.

## Storage
`localStorage` keys under `colorseed.*` hold the seed, history (with a 40-point colour path per song), birthdays, card options, view toggles and the year setting.
