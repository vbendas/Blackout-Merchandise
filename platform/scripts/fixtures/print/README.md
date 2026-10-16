# Print fixtures

Test art for the print engine, the pack and the checks (Documentation/Dev/Print-Prep-Plan.md sections 4 and 5). Every generated file is drawn here, with no photos or third-party artwork.

Regenerate the drawn files from `platform/`:

```bash
npx tsx scripts/fixtures/print/make-fixtures.ts
```

The script is offline and deterministic. `test_design.png` is a copy of `Assets/test_design.png`, not generated. The lettering uses the Arial Black system font (macOS); the committed PNGs are the reference.

Sizes are pixels as stored. Sized fixtures carry 300 ppi metadata, so 1 mm is 11.8 px. The capsule samples have no size of their own: they are 2000 px square and print at 280 mm wide unless a test says otherwise (0.14 mm per px).

The four 28 cm fixtures at the end of the table (Phase 2: index and simulated process) are 3307 px wide, which is 280 mm at 300 ppi. Transparent fixtures are anti-aliased at their edges. Pixels at very low alpha (under about 8) can carry colours far from the shape's colour, so colour counts should ignore them.

| File | Size | Colours | What it tests |
|---|---|---|---|
| `test_design.png` | 1080 × 1296 px (1.8 MB), 72 ppi metadata | Orchid pink (about `#F38DDB`) and deep purple (about `#3E0C5F`), transparent areas | The real art behind the approved mock engine run, with transparent areas. Its main colours name as orchid pink and deep purple, like the approved mock's `#ED90DC` and `#3E0E61`. |
| `flat-logo-3c.png` | 3000 × 2000 px (116 KB), 300 ppi, transparent | 3 flats: navy `#1C2B3A`, mustard `#E0A526`, brick `#B5402A` | Spot separation with three plates, palette matching, and an underbase on dark garments. The navy ring is a true hole in the art. |
| `lettering-1c.png` | 2400 × 1000 px (38 KB), 300 ppi, transparent | 1 colour `#1A1A1A` (Arial Black, "LOUD / NIGHT") | A single plate with real counters (holes in O, D and G). Also the one-colour path, with no halftones. |
| `gradient-photo.png` | 2400 × 2400 px (1.1 MB), 300 ppi, opaque | Continuous tone: many colours, soft shapes, no hard edges | Continuous tone with many colours. It should need index or simulated process (`needsManual`), not spot separation, and its plates are screened at 55 lpi. Opaque, so there is no transparency to handle. |
| `fine-lines.png` | 3307 × 1724 px (32 KB), 300 ppi (280 × 146 mm), transparent | Black `#000000` | Lines 0.10, 0.15, 0.20, 0.25, 0.30, 0.40 and 0.50 mm wide, top row to bottom, each row horizontal and vertical. Lines under the recipe's `minLineMm` (0.3 mm) should raise the thin-line warning. 0.30 mm sits on the threshold, and 0.40 and 0.50 mm should not warn. |
| `tints-2c.png` | 2400 × 1600 px (39 KB), 300 ppi, transparent | 2 inks: teal `#0E5A6B`, vermilion `#E8572A`; plus each ink at a 50% flat tint (`#87ADB5`, `#F4AB95`) and at 50% opacity | Two inks plus 50% tints, both as colours and as transparency. Checks that a tint becomes its own colour, and that partial alpha is handled. |
| `american-traditional.png` | 2000 × 2000 px (67 KB) | 4 flats: red `#C8102E`, green `#1E7B4A`, yellow `#F5C518`, black `#141414` | The four-colour capsule look, with thick black outlines that must stay one plate. |
| `blackletter.png` | 2000 × 2000 px (79 KB) | 1 colour `#111111` | High contrast: a thick arch with a thin 16 px inner frame, a diamond and spires. The thin frame is 2.2 mm at 280 mm, so it should not warn. |
| `woodcut.png` | 2000 × 2000 px (37 KB) | 1 colour `#111111` | Carved bars, a mountain and 14 px hatching: a one-plate look with many narrow gaps. |
| `death-metal-logo.png` | 2000 × 2000 px (53 KB) | 1 colour `#111111` | Sharp spikes and blades with fine tips: the feature cleanup (minFeature) and sharp-corner handling. |
| `riso-2-colour.png` | 2000 × 2000 px (61 KB) | 2 flats: fluorescent pink `#FF48B0`, riso blue `#0078BF` | The two-colour capsule look. The shapes never overlap, so there is no overprint and exactly two plates. |
| `photocopy-zine.png` | 2000 × 2000 px (81 KB) | 1 colour `#111111` | Torn, jagged edges (26 px) and an even-odd hole in the top block. Tests holes in a single plate and knockout. |
| `line-tattoo.png` | 2000 × 2000 px (332 KB) | 1 colour `#111111` | One continuous 4 px stroke, no fills. At 280 mm it is 0.56 mm (no warning); at 100 mm it is 0.20 mm (should warn). |
| `halftone.png` | 2000 × 2000 px (243 KB) | 2 flats: yellow `#FFD21F` disc, black `#111111` dots | Dots that are already screened. The 64 px pitch is about 9 mm at 280 mm, a coarse pop-art pattern. Checks that the engine keeps pre-made dots and does not screen them again. |
| `many-colours-flat.png` | 3307 × 2480 px (118 KB), 300 ppi, transparent, 280 × 210 mm | 12 flats, one per shape: red `#E4262C`, orange `#F7941D`, yellow `#FFD400`, lime `#9ACD32`, green `#00843D`, teal `#009A9A`, sky `#4FC3F7`, blue `#1F3FBF`, black `#151515`, purple `#A855F7`, pink `#FF5FA2`, brown `#6B3A1E` | Index separation with 12 colours. Twelve bold shapes on a 4 × 3 grid, with no overlaps and no gradients. Exactly 12 opaque colours. The closest pair, blue and purple, is about 33 apart in CIE76 dE. |
| `smooth-gradients.png` | 3307 × 3307 px (3.3 MB), 300 ppi, opaque | Continuous tone: a violet-to-yellow sweep (`#2A0A5E` to `#FFD84D`), a teal field, a blue field and a soft warm glow. About 89,000 distinct colours. | The simulated-process target: large smooth multi-hue gradients and a soft radial glow, with no hard edges. Opaque, so there is no transparency to handle. |
| `painted-shading.png` | 3307 × 3307 px (706 KB), 300 ppi, transparent | 3 hues, each shaded from a light highlight to a deep shadow: coral, ochre and teal, plus dark outlines `#120708` | A stylised painted orb: three concentric blobs with smooth light-to-dark shading and one dark outline each. This is the art that should go to simulated process on dark garments. |
| `low-chroma-tonal.png` | 3307 × 3307 px (262 KB), 300 ppi, transparent | 2 inks: neutral greys (black ink in tints, 210 levels) and one muted sage `#6E8577` (chroma about 12, in tints) | Simulated process at a low ink count. A grey moon, a sage hill and a grey hill, all opaque smooth gradients, with no halftone and no alpha ramp. |
