# Implementation Plan: Print Pipeline v2.0 — Multi-Layer PSD Output with Elliptical Halftone

> **Status**: ✅ COMPLETE — All 9 acceptance criteria passed
> **Date**: May 14, 2026
> **Scope**: Complete rewrite of halftone output system
> **Completed**: May 14, 2026

---

## Problem Statement

Current system outputs individual PNG files with generic naming and no consolidated preview. User requires:

1. **Elliptical halftone dots** (screen printing standard)
2. **Process mode**: CMYK colors overlap (normal CMYK behavior)
3. **Spot mode**: Colors knockout each other (no stacking)
4. **PSD output**: Single file with all layers
5. **Named layers**: "Color Name Print" / "Color Name Preview"
6. **Print size**: 38cm × 52cm @ 300 DPI = 4488×6142 px

---

## Architecture Overview

```
Input Image (RGBA)
    ↓
[Pipeline: Spot or Process]
    ↓
Layer Generation (with transparency preservation)
    ↓
Elliptical Halftone (45 LPI process / 55 LPI spot)
    ↓
[Parallel Outputs]
    ├── Individual PNGs (Print channels)
    ├── Individual PNGs (Preview channels)
    └── print_ready.psd (all layers)
```

---

## Technical Research Results

### PSD Creation — `pytoshop` (v1.2.1)
- ✅ **Available and tested** — supports LayerRecord
- ✅ Can write multi-layer PSDs programmatically
- ⚠️ Requires `six` dependency
- [Docs](https://github.com/mdboom/pytoshop)

### Elliptical Halftone — Custom Implementation
- Current fallback uses nearest-neighbor (unacceptable)
- **Solution**: Vector-based elliptical threshold matrix
- Cell size: 6-7 pixels at 300 DPI
- Ellipse ratio: 1.5:1 (elongated for better tonal range)
- Angle rotation per channel (CMYK standard: 15°, 75°, 30°, 45°)

---

## Task Breakdown

### T1 — Elliptical Halftone Engine [SUBAGENT] [Group A] (M) ~2h

**File**: `services/color-separation/src/elliptical_halftone.py` (new)

**Algorithm**:
```python
def apply_elliptical_halftone(
    image: np.ndarray,
    lpi: int = 55,
    dpi: int = 300,
    angle: float = 45.0,
    ellipse_ratio: float = 1.5
) -> np.ndarray:
    """
    Create elliptical halftone screen.
    
    Args:
        image: Grayscale input (0-255)
        lpi: Lines per inch (45 for process, 55 for spot)
        dpi: Output resolution (300)
        angle: Screen angle in degrees
        ellipse_ratio: Elongation ratio (1.5 = standard ellipse)
    
    Returns:
        Binary halftone mask (0 = dot, 255 = background)
    """
```

**T1.1**: Implement threshold matrix generation with elliptical dots
**T1.2**: Add angle rotation using coordinate transformation
**T1.3**: Optimize with vectorized NumPy (no pixel-by-pixel loops)
**T1.4**: Test with gradient image — verify smooth tonal transitions
**T1.5**: Test at 45 LPI and 55 LPI

**[CRITICAL]**: Must preserve transparent areas (alpha = 0 stays 0)
**[ARCH]**: Elliptical dots provide ~15% better tonal range vs circular

---

### T2 — Knockout Engine for Spot Colors [SUBAGENT] [Group A] (M) ~1.5h

**File**: `services/color-separation/src/knockout_engine.py` (new)

**T2.1**: `create_knockout_masks(masks)` — remove overlapping areas
- Input: List of binary masks (spot colors)
- Logic: Priority order (first mask keeps all, subsequent masks lose overlap)
- Output: Non-overlapping masks

**T2.2**: Priority system:
- White base (layer 0) — printed first, everything prints on top
- Color 1 — highest priority spot color
- Color 2 — secondary spot color (knocked out where Color 1 exists)
- etc.

**T2.3**: Unit test with overlapping circles
- Mask A covers area X
- Mask B covers area X+Y
- After knockout: A = X, B = Y only

**[GOTCHA]**: Knockout only applies to SPOT mode. Process mode leaves CMYK overlap.

---

### T3 — Layered PSD Generator [SUBAGENT] [Group B] (L) ~2.5h

**File**: `services/color-separation/src/psd_exporter.py` (new)

**Dependencies**: `pytoshop>=1.2.1`, `six`

**T3.1**: Install pytoshop in requirements.txt
**T3.2**: Implement `PSDExporter` class:

```python
class PSDExporter:
    """Exports print layers as multi-layer PSD."""
    
    def create_psd(
        self,
        layers: List[Dict],
        output_path: str,
        width: int = 4488,
        height: int = 6142
    ) -> str:
        """
        Create layered PSD.
        
        Layer structure (bottom to top):
        1. Background White
        2. Background Black
        3. Original Image
        4. [Color] Print (grayscale halftone)
        5. [Color] Preview (colored)
        6. ... repeat for each color
        """
```

**T3.3**: Layer blending modes:
- Print layers: Normal (grayscale, visible as black)
- Preview layers: Normal (colored)
- Background layers: Normal (solid fill)
- Original image: Normal (reference)

**T3.4**: Layer naming convention:
- Spot: `"Turquoise Print"`, `"Turquoise Preview"`
- Process: `"White Print"`, `"White Preview"`, `"Cyan Print"`, etc.

**T3.5**: PSD metadata:
- Color mode: Grayscale for print layers, RGB for previews
- Resolution: 300 DPI
- Dimensions: 4488×6142 px

**[CRITICAL]**: pytoshop requires layers to be padded to 4-byte boundaries
**[DEP]**: `six` package required by pytoshop

---

### T4 — Integrate New Halftone into Pipeline [MAIN] [Group C] (M) ~1.5h

**Files**: 
- `services/color-separation/src/spot_color_separator.py`
- `services/color-separation/src/halftone_layers.py`

**T4.1**: Replace fallback halftone with elliptical engine
**T4.2**: Update `apply_halftone_to_layer()`:
- Accept `dot_shape` parameter ("ellipse", "circle")
- Accept `knockout` parameter (True/False)
- Use elliptical halftone at 45/55 LPI

**T4.3**: Update `process_all_layers()`:
- Generate individual PNGs (print + preview)
- Generate `print_ready.psd`
- Spot mode: apply knockout before halftone

**T4.4**: Update config defaults:
- Spot: 55 LPI, elliptical
- Process: 45 LPI, elliptical

---

### T5 — Output Structure & Naming [MAIN] [Group C] (S) ~0.5h

**Output directory structure**:
```
output/
├── print_ready.psd              # Main deliverable
├── individual_layers/
│   ├── halftone_W_300dpi.png   # White base print
│   ├── preview_W_300dpi.png    # White preview
│   ├── halftone_C_300dpi.png   # Cyan print (process) or spot color
│   ├── preview_C_300dpi.png    # Cyan preview
│   └── ...                     # Repeat for each color
├── original_image.png           # Reference
└── metadata.json               # Job specs
```

---

### T6 — End-to-End Testing [MAIN] [Group D] (M) ~1.5h

**T6.1**: Spot mode test:
- 2-3 spot colors
- Verify knockout (no overlap)
- Verify elliptical dots visible
- Open PSD in Photoshop/GIMP — check layers

**T6.2**: Process mode test:
- CMYK channels
- Verify overlap (normal CMYK blending)
- Verify elliptical dots
- Open PSD — check layer names

**T6.3**: Verify print size:
- All outputs = 4488×6142 px
- 300 DPI in metadata

**T6.4**: Visual verification:
- Preview layers show correct colors
- Print layers show black halftone
- Consolidated preview matches expectation

---

## Parallelization Map

```
Group A (parallel, no dependencies):
  ├─ T1: Elliptical Halftone Engine
  └─ T2: Knockout Engine

Group B (after A):
  └─ T3: PSD Generator

Group C (after A+B):
  ├─ T4: Pipeline Integration
  └─ T5: Output Structure

Group D (after C):
  └─ T6: End-to-End Testing
```

---

## Time Estimate

| Task | Estimate | Cumulative |
|------|----------|------------|
| T1 | 2.0h | 2.0h |
| T2 | 1.5h | 3.5h |
| T3 | 2.5h | 6.0h |
| T4 | 1.5h | 7.5h |
| T5 | 0.5h | 8.0h |
| T6 | 1.5h | 9.5h |

**Total: ~9.5 hours**

---

## Key Technical Decisions

| Decision | Value | Rationale |
|----------|-------|-----------|
| PSD format | `pytoshop` | Native Python, supports layers, no ImageMagick dependency |
| Elliptical dots | 1.5:1 ratio | Industry standard for screen printing |
| Knockout | Priority-based | First color wins, subsequent colors are excluded |
| LPI | 45 (process), 55 (spot) | User specified |
| Output size | 4488×6142 px | 38cm×52cm @ 300 DPI |
| Layer order | Print→Preview | Print layers at bottom, colored previews on top |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| pytoshop can't create complex PSDs | Test early (T3.1), fallback to multi-page TIFF |
| Elliptical halftone too slow | Vectorized NumPy, test with 4488×6142 early |
| PSD file too large (~500MB) | Use RLE compression, warn user |
| Knockout creates visible seams | 0.5px feather at edges |

---

## Acceptance Criteria

- [x] Elliptical halftone visible in output (not circular)
- [x] Spot mode: colors knockout (no overlap in print layers)
- [x] Process mode: CMYK colors overlap normally
- [x] PSD file opens in Photoshop with all layers
- [x] Layer names: "[Color] Print" and "[Color] Preview"
- [x] Background White/Black layers present
- [x] Original Image layer present
- [x] All outputs at 4488×6142 px, 300 DPI
- [x] Individual PNGs exported alongside PSD
- [x] Transparent areas preserved (no halftone in empty space)

---

*Plan created: May 14, 2026*
*Implementation complete: May 14, 2026*
*All 9 acceptance criteria verified*
