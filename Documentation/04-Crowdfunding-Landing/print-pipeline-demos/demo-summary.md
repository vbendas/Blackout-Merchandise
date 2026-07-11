# Print Pipeline Demo Outputs

Generated: May 14, 2026
Test Design: `Assets/test_design.png`

---

## Spot Mode (Screen Print) — Dark Garment (#1A1A1A)

**Pipeline Path:** K-means → Pantone → Garment Filter → White Base (choked) → Layers → Trapping → Halftone

**Results:**
- Colors extracted: 5
- Colors kept: 2 (after garment filter)
- White base: ✅ Generated (174,972 px → 74,709 px with 2px choke)
- Trapping: ✅ Applied (1px overlap)
- Halftone: ✅ 55 LPI (color), 45 LPI (white), 65 LPI (black)
- Output files in: `services/color-separation/color_separation_output_spot/`

**Halftone Files (Named by Color Channel):**
| Filename | Color | Description |
|----------|-------|-------------|
| `halftone_W_300dpi.png` | White | White base underbase (choked) |
| `halftone_eb8dda_300dpi.png` | #EB8DDA | Pink/magenta spot color |
| `halftone_9169bb_300dpi.png` | #9169BB | Purple spot color |

**Previews:**
- `colored_composite_preview.png` — All halftone layers overlaid with actual print colors
- `colored_composite_preview_thumb.png` — Small thumbnail for quick evaluation

---

## Process Mode (DTG) — Dark Garment (#1A1A1A)

**Pipeline Path:** Load Image → White Base (no choke) → CMYK Separation → Halftone

**Results:**
- No K-means / Pantone (process color)
- White base: ✅ Generated (1,393,729 px, NO choke)
- Trapping: ❌ Skipped (process mode)
- Halftone: ✅ 30 LPI uniform
- Output files in: `services/color-separation/color_separation_output_process/`

**Halftone Files (Named by Color Channel):**
| Filename | Color | Description |
|----------|-------|-------------|
| `halftone_W_300dpi.png` | White | White base underbase |
| `halftone_C_300dpi.png` | Cyan | Cyan channel |
| `halftone_M_300dpi.png` | Magenta | Magenta channel |
| `halftone_Y_300dpi.png` | Yellow | Yellow channel |
| `halftone_K_300dpi.png` | Black | Black/key channel |

**Previews:**
- `colored_composite_preview.png` — All CMYK layers overlaid with actual CMYK colors
- `colored_composite_preview_thumb.png` — Small thumbnail for quick evaluation

---

## Spot Mode (Screen Print) — Light Garment (#FFFFFF)

**Pipeline Path:** K-means → Pantone → Garment Filter → Layers → Trapping → Halftone

**Results:**
- Colors extracted: 5
- Colors kept: 5 (no garment filtering on white)
- White base: ❌ Skipped (light garment)
- Trapping: ✅ Applied
- Halftone: ✅ 55 LPI
- Output files in: `services/color-separation/color_separation_output_spot/`

---

## Key Differences Highlighted

| Feature | Spot (Screen) | Process (DTG/DTF) |
|---------|---------------|---------------------|
| Color separation | K-means → 1-8 spot colors | CMYK channels |
| Pantone mapping | ✅ Yes | ❌ No |
| White base source | Union of spot masks | Image luminance |
| Choke | ✅ 2px | ❌ No |
| Trapping | ✅ 1px | ❌ No |
| Halftone LPI | 45–65 per color | 30 uniform |
| Typical use | Bulk orders, 50+ units | Single items, samples |
