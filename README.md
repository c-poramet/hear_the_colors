# Hear & See

See music, hear colour. Load a song and Hear & See turns its musical structure into a colour. The current model uses the song's pitch-class distribution for **hue**, onset-timing regularity for **saturation**, and brightness variation over time for **lightness**. Everything runs in your browser; audio never leaves your device.

## Audio-to-colour logic

The current audio model is always enabled; there is no LEGACY/NEW switch.

### Hue: pitch-class distribution

The analyzer divides the audible pitch content into the 12 chromatic pitch classes: C, C-sharp, D, D-sharp, E, F, F-sharp, G, G-sharp, A, A-sharp and B. Octaves are combined, so the same note in different octaves contributes to the same bin.

For each analysis frame, spectral energy in the pitch range from approximately 55 Hz to 2,000 Hz is assigned to its pitch class. The accumulated 12-bin distribution is converted into a circular mean using the circle-of-fifths ordering. This gives the hue a relationship to the song's tonal centre while still accounting for more than one prominent note. A song with several strong pitch areas can therefore land between them instead of being reduced to one detected key.

### Saturation: rhythmic regularity

The analyzer detects transient-like onset peaks from changes in the spectrum. It measures the time between consecutive detected onsets and calculates:

`regularity = clamp(1 - standard deviation(intervals) / mean interval, 0, 1)`

Evenly spaced onsets produce a higher regularity value and therefore a more saturated colour. Irregular timing, sparse onset information, or too few detected intervals produces a lower value and therefore a less saturated colour. This describes timing consistency, not simply the number of hits per second.

### Lightness: brightness contrast over time

Each frame receives a spectral-brightness value based on the distribution of energy up to approximately 8,000 Hz. The model calculates the duration-weighted standard deviation of those values over the song and scales it into the `[0, 1]` range:

`contrast = clamp(2.5 × brightness standard deviation, 0, 1)`

Songs whose timbre changes substantially over time receive a higher lightness input. Songs with a more uniform brightness profile receive a lower one. This measures temporal contrast rather than treating one average brightness as the complete description of the song.

### Time weighting and partial playback

Analysis frames are weighted by their duration. Longer portions of a song contribute proportionally more to its summary than shorter portions. The same feature summaries are used for a selected Cut range, so a partial section can produce its own colour.

The five calibration knobs then transform these normalized feature values into the final HSL colour:

- **Hue shift** rotates the pitch-derived hue.
- **Mirror hue direction** reverses the hue direction.
- **Saturation gain/base** scales and offsets rhythmic regularity.
- **Lightness gain/base** scales and offsets brightness contrast.

Older history records that do not contain the new pitch, regularity, or contrast fields retain their stored summary values. Newly analyzed songs and newly imported records with the richer fields use this current model.

## Pages

**Play** (`index.html`)
- Drop or load a song. The colour builds as it plays, shown as a colour wheel (with the path it has travelled) or as HSL bars. The wheel/HSL toggle and the **Cut** toggle sit on the visualiser; HSL is the default and the Cut panel is hidden until switched on.
- **Cut**: drag across the timeline to get the colour of just that piece. Without Cut, dragging simply seeks.
- **History** is a picture-first card view with five full-width tabs:
  - *Songs*: the legacy row view is the default, with an optional colour-tinted card view. The selected song includes cover or fingerprint, colour with its hex, key dial, rhythm and brightness meters, copy / palette / share card / remove. Palette generation includes complementary, analogous, triadic, split-complementary, tetradic and monochromatic schemes, uses the active birthday seed, and lets you drag palette kinds into a saved order.
    Each song card or row also has **Calibrate**, which fits the active seed to that song in place without leaving the Play page.
  - *Compare*: all recent songs on a wheel or as HSL bars, plus a similarity matrix with thumbnails on both axes. The matrix can show only one triangle or switch to two song selectors; compare it using any combination of hue, saturation and lightness, with **All** enabling all three. Its colours are normalized against the loaded comparisons, so the strongest pair is the strongest visible match. The selected pair includes key dials and thumbnail-backed hue, saturation and lightness bars.
  - *Birthdays*: pick a song, then see its colour under each saved birthday as a card. Click a card to show or hide it in the wheel and colour strip; **Use** switches to that birthday.
  - *Analysis*: switch between Solo and Compare modes. Choose analyzed songs with thumbnail-backed pickers and compare how their pitch-class distributions produce hue, how onset timing produces saturation, how brightness contrast produces lightness, and how those inputs become each final HSL colour.
  - *Groups*: view all analyzed songs grouped by pitch-derived hue, onset regularity, or brightness contrast. The group dimension and number of ranges are adjustable and saved locally.
  Every hex code is shown with a swatch of its colour.
- **History sharing**: use **Export** in the History header to download the analyzed song history as a versioned JSON file. Share that file with another Hear & See user, who can use **Import** to merge the analyzed songs, metadata, trajectories and available cover art into their own history. Duplicate songs are skipped and imports are limited to the normal 60-song history size.
- **Share card**: toggles are grouped (Header, Song, Visuals). Optional audio metadata and the saved birthdate can be included. Fingerprint style: *Ring*, *HSL bars* or *Wheel path*; HSL bars can include the overtime path or remain as bare bars. Songs loaded before this version have no recorded movement; load them again to enable the two path styles.

**Calibrate** (`calibrate.html`)
- Load songs and set target colours by clicking the wheel, using the colour picker, or typing a hex code (`#c97f50` or `#c85`) and **Fit seed to targets**, or tune the five knobs by hand.
- **Seed from date**: same day, same seed. By default the **year is ignored**: the 366 calendar days get evenly spaced hue shifts (never more than 1° apart) and the other knobs follow a low-discrepancy sequence, so neighbouring days differ as much as possible and every day has its own seed. Switch on **Include year** to give every full date its own seed (dates since 1970, matching earlier versions).
- **Dates for this seed**: ranks the dates whose seed gives the closest colours to the current knobs (exact matches first) and shows a match percentage. Respects the Include year switch.
- **Share**: copy a link or QR code that carries the seed (`#c=1.…`).
- **Universal seed and saved seeds**: use the Universal seed to return to the shared default calibration independent of a birthday. Save any current seed with a label, then reuse or remove it from the birthday/seed popover. Saved seeds are kept locally in the browser alongside saved birthdays.
  The editable seed field accepts the encoded form `1.shift.mirror.saturation-gain.saturation-base.lightness-gain.lightness-base`; apply a valid code to change the active seed directly.

## Seeds and birthdays
A seed is six numbers (hue shift, mirror, saturation gain/base, lightness gain/base) shown as `SEED 1.…`. The BIRTHDAY tag in the header lists dates that produce the current seed and your saved birthdays. Changing *Include year* re-derives the seed of the birthday in use. Year-less dates are stored as `0000-MM-DD`.

## Files
`core.js` analysis, colour, seeds, birthdays · `play.js` Play page · `app.js` Calibrate page · `card.js` share card · `style.css` · `index.html` · `calibrate.html`

## Run it
Serve the folder with any static server (`python3 -m http.server`) and open `index.html`. Fonts and the QR/tag libraries load from CDNs.

## Storage
`localStorage` keys under `colorseed.*` hold the seed, history (with a 40-point colour path per song), birthdays, card options, view toggles and the year setting.
