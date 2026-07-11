# Implementation Plan: Print Pipeline — Spot vs. Process Mode, White Base, Choke, Trapping & Print Method LPI

> **Status**: Approved for execution
> **Date**: May 14, 2026
> **Branch**: feat/crowdfunding-demo
> **Test Design**: `/Users/victorbendas/Documents/GitHub/Merch-From/Assets/test_design.png`

---

## Overview

**Goal**: Complete the production pipeline for both screen-print (spot color) and DTG/DTF (CMYK process) workflows for the crowdfunding video.

### Two Distinct Pipelines

| Feature | DTG / DTF (Process Mode) | Screen Print (Spot Mode) |
|--------|--------------------------|--------------------------|
| **Color model** | CMYK process | Spot colors (1–8) |
| **Separation** | Stay in CMYK; no spot reduction | K-means → Pantone mapping |
| **Halftones** | ✅ Yes, 30 LPI | ✅ Yes, 45–65 LPI |
| **White base** | From image luminance / opacity | Union of spot masks + choke |
| **Choke** | ❌ Not needed | ✅ 2px (colors overprint) |
| **Trapping** | ❌ Not needed (process) | ✅ 1px between adjacent spots |
| **Pantone** | ❌ Not needed | ✅ Recipes + mixing |

**What's Working Today:**
- K-means color clustering (1-8 colors) ✅
- Pantone mapping with CIEDE2000 + Magna recipes ✅
- Garment color filtering (dark/light detection) ✅
- Grayscale layer separation with registration marks ✅
- Halftone generation with moiré angles ✅
- FastAPI service (port 8001) with Next.js proxy ✅

**What's Missing (This Plan):**
- White base layer generation with method-aware source (image vs. masks)
- White base choke (screen-only, shrink 2px so colors overprint, no halo)
- Color trapping (screen-only, 1px overlap between adjacent colors)
- **Print method aware LPI** (DTG/DTF = 30 LPI, Screen = 55 LPI)

---

## Task Breakdown

### T1 — White Base Layer Generator [SUBAGENT] [Group A] (M) ~1.5h

**Files**: `services/color-separation/src/white_base.py` (new), `services/color-separation/tests/test_white_base.py` (new)

- **T1.1**: `generate_white_base_spot(masks)` — union of all color masks via `np.logical_or.reduce()` for **screen print**
- **T1.2**: `generate_white_base_process(image, garment_rgb)` — from image luminance / opacity for **DTG/DTF**
- **T1.3**: `generate_white_base_with_choke(mask, px=2)` — OpenCV erosion with 2px elliptical kernel at 300 DPI (**screen-only**)
- **T1.4**: `needs_white_base(garment_color)` — luminance < 0.18 = dark garment
- **T1.5**: Unit test with synthetic image (red circle on black background)

**[CRITICAL]**: Choke applied BEFORE halftone. Choke is **screen-only** — DTG/DTF white base stays unchoked. White base = Layer 0.
**[ARCH]**: Two generation paths because spot-color white base is derived from separated masks; process white base is derived from the original image dark areas / alpha channel.

---

### T2 — Print Method Configuration [MAIN] [Group B] (S) ~0.25h

**Files**: `services/color-separation/src/spot_color_separator.py`, `services/color-separation/src/halftone_layers.py`

- **T2.1**: Add `PrintMethod` enum (`DTG = "dtg"`, `SCREEN = "screen"`, `DTF = "dtf"`)
- **T2.2**: Add `print_method: PrintMethod = PrintMethod.SCREEN` to `SeparationConfig`
- **T2.3**: Modify `HalftoneLayerProcessor.get_lpi_for_color()`:
  ```python
  if print_method == PrintMethod.DTG:
      return int(base_lpi * 0.55)  # ~30 LPI
  return base_lpi
  ```
- **T2.4**: Update `DEFAULT_LPI_BY_COLOR` to scale correctly:
  | Print Method | White | Color | Black |
  |-------------|-------|-------|-------|
  | **DTG/DTF** | 30 | 30 | 30 |
  | **Screen** | 45 | 55 | 65 |

**[ARCH]**: Halftones apply to **all** print methods. DTG/DTF RIPs use halftone screening to control ink density, simulate gradients, and manage white base opacity. Screen printing uses traditional per-color LPI. DTG and DTF share the same LPI profile.

---

### T3 — Integrate White Base into Pipeline Orchestrator [MAIN] [Group B] (M) ~1.5h

**Files**: `services/color-separation/src/spot_color_separator.py`

- **T3.1**: Import `WhiteBaseGenerator`
- **T3.2**: Add `color_mode: str` (`"spot"` | `"process"`) to pipeline entrypoint
- **T3.3**: After garment filter (step 3), check `needs_white_base(garment_rgb)`
- **T3.4**: **Spot mode (screen)**:
  - Generate raw white base from union of spot masks
  - Apply choke 2px → save as `layer_00_white_base.png`
  - Run K-means + Pantone mapping + trapping
- **T3.5**: **Process mode (DTG/DTF)**:
  - Generate white base from image luminance / opacity (no choke)
  - Stay in CMYK; skip K-means, Pantone, and trapping
  - Halftone all layers including white base at 30 LPI
- **T3.6**: Add `white_base_layer: Dict | None` to `SeparationResult` with `choke_px`, `original_area`, `choked_area`, `color_mode`
- **T3.7**: Pass `print_method` to `HalftoneLayerProcessor` for correct LPI
- **T3.8**: Ensure white base processed first (layer index 0)

**[GOTCHA]**: Light garment → skip white base entirely. Do not create empty layer.
**[GOTCHA]**: DTG/DTF must NOT run spot-color separation (K-means) or trapping — these are screen-print-only operations.

---

### T4 — Color Trapping (Screen-Only) [SUBAGENT] [Group C] (M) ~1.5h

**Files**: `services/color-separation/src/layer_separator.py`

- **T4.1**: Add `trap_layers()` method — dilate adjacent masks by 1px where they touch
- **T4.2**: Smart trapping: skip garment reveal areas, skip white base
- **T4.3**: Add `trap_radius_px: int = 1` to `SeparationConfig`
- **T4.4**: Gate trapping to `color_mode == "spot"` only — skip entirely for DTG/DTF process mode
- **T4.5**: Unit test with two touching rectangles

**[GOTCHA]**: Over-trapping > 2px causes visible color bleeding. Keep at 1px default.
**[ARCH]**: Trapping is **screen-print only**. DTG/DTF prints continuous CMYK tones where adjacent colors blend naturally — no physical screens to misregister, so trapping is unnecessary and would cause color muddying.

---

### T5 — FastAPI Endpoint Updates [MAIN] [Group D] (S) ~1h

**Files**: `services/color-separation/main.py`

- **T5.1**: Add `white_base_layer` to `/api/v1/separate` response
- **T5.2**: New params:
  - `color_mode: str = "spot"` (`"spot"` | `"process"`) — determines pipeline path
  - `print_method: str = "screen"` (`"dtg"` | `"screen"` | `"dtf"`) — determines LPI + white base source
  - `choke_px: int = 2` (ignored when `color_mode == "process"`)
  - `trap_px: int = 1` (ignored when `color_mode == "process"`)
  - `skip_white_base: bool = False`
- **T5.3**: Pass params to `SpotColorSeparator`; route to correct pipeline based on `color_mode`
- **T5.4**: `curl` tests with `test_design.png`:
  ```bash
  # Screen print (spot mode)
  curl -X POST http://localhost:8001/api/v1/separate \
    -F "image=@Assets/test_design.png" \
    -F "garment_color=#1A1A1A" \
    -F "color_mode=spot" \
    -F "print_method=screen" \
    -F "choke_px=2"

  # DTG (process mode)
  curl -X POST http://localhost:8001/api/v1/separate \
    -F "image=@Assets/test_design.png" \
    -F "garment_color=#1A1A1A" \
    -F "color_mode=process" \
    -F "print_method=dtg"
  ```

---

### T6 — Frontend Display Update [SUBAGENT] [Group D] (S) ~0.5h

**Files**: `app/src/lib/color-separation/types.ts`, `client.ts`, `ColorSeparator.tsx`

- **T6.1**: Add `white_base_layer?: SeparationLayer` and `color_mode: string` to `SeparationResponse`
- **T6.2**: Add `color_mode` + `print_method` to client options
- **T6.3**: Render white base as first layer with choke info (spot only) + print method badge
- **T6.4**: Spot mode: show layer breakdown + Pantone chips + trapping indicators
- **T6.5**: Process mode: show CMYK composite preview + white base overlay (no layer breakdown)

---

### T7 — End-to-End Testing [MAIN] [Group E] (M) ~1.5h

**Test file**: `/Users/victorbendas/Documents/GitHub/Merch-From/Assets/test_design.png`

**Spot Mode (Screen Print) Tests:**
- **T7.1**: Dark garment + Screen (`#1A1A1A`, 55 LPI, `color_mode=spot`): white base from masks, choked 2px, halftoned, trapping applied
- **T7.2**: Light garment + Screen (`#FFFFFF`, `color_mode=spot`): no white base, direct print, 55 LPI colors, trapping applied

**Process Mode (DTG/DTF) Tests:**
- **T7.3**: Dark garment + DTG (`#1A1A1A`, 30 LPI, `color_mode=process`): white base from image, **no choke**, halftoned, **no trapping**
- **T7.4**: Dark garment + DTF (`#1A1A1A`, 30 LPI, `color_mode=process`): same as DTG
- **T7.5**: Light garment + DTG (`#FFFFFF`, `color_mode=process`): no white base, CMYK halftones at 30 LPI

**Verification:**
- **T7.6**: Verify trapping overlap visible in masks **only for spot mode**
- **T7.7**: Verify FastAPI JSON includes `color_mode`, `print_method`, and `white_base_layer`
- **T7.8**: `npm run build` + `bun build` pass

---

### T8 — Video Demo Prep [MAIN] [Group F] (S) ~0.5h

**Files**: `Documentation/04-Crowdfunding-Landing/print-pipeline-demos/`

- **T8.1**: Run pipeline on `test_design.png` in **both modes**:
  - Spot + Screen (55 LPI): show layer breakdown, Pantone chips, trapping, choked white base
  - Process + DTG (30 LPI): show CMYK composite, white base overlay (no choke), bigger halftones
- **T8.2**: Capture screenshots: raw design → composite preview → mode-specific layer breakdown
- **T8.3**: Save outputs + document demo flow highlighting the two pipeline paths

---

## Parallelization Map

```
Group A (parallel):
  └─ T1: White Base Generator

Group B (after A):
  ├─ T2: Print Method Config
  └─ T3: Pipeline Integration

Group C (after B):
  └─ T4: Color Trapping

Group D (after C):
  ├─ T5: FastAPI Updates
  └─ T6: Frontend Update

Group E (after D):
  └─ T7: End-to-End Testing

Group F (after E):
  └─ T8: Video Demo Prep
```

---

## Time Estimate

| Task | Estimate | Cumulative |
|------|----------|------------|
| T1 | 1.5h | 1.5h |
| T2 | 0.25h | 1.75h |
| T3 | 1.5h | 3.25h |
| T4 | 1.5h | 4.75h |
| T5 | 1.0h | 5.75h |
| T6 | 0.5h | 6.25h |
| T7 | 1.5h | 7.75h |
| T8 | 0.5h | 8.25h |

**Total: ~8.25 hours**

---

## Key Decisions

| Decision | Value | Rationale |
|----------|-------|-----------|
| **Color mode** | `"spot"` / `"process"` | `"spot"` = K-means + Pantone + choke + trapping. `"process"` = CMYK + halftones only |
| Choke amount | 2px at 300 DPI | Industry standard for screen printing underbase. **Screen-only** |
| Trapping radius | 1px | Prevents gaps without visible color bleed. **Screen-only** |
| DTG/DTF LPI | 30 LPI | Bigger halftones for digital printer dot gain / RIP screening |
| Screen LPI | 55 LPI (color), 45 (white), 65 (black) | Traditional screen printing standards |
| White base source | Spot = union of masks; Process = image luminance | Spot needs choked underbase; DTG/DTF needs image-derived white base |
| White base layer name | `layer_00_white_base.png` | Consistent naming, Layer 0 = first printed |
| Print method default | `screen` | Backward compatible with existing API calls |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Trapping takes too long | T4 is lower priority than T1-T3. Skip if time runs out. Only affects screen mode. |
| OpenCV erosion breaks edges | Use `cv2.MORPH_ELLIPSE` kernel. Fallback to manual pixel shrink. Screen-only. |
| DTG/DTF accidentally runs spot separation | Gate K-means + Pantone behind `color_mode == "spot"`. Process mode skips entirely. |
| Frontend type mismatch | Make `white_base_layer` optional. Old responses won't break. |
| Service won't start | Verify `scipy` and `opencv-python` in requirements.txt |
| DTG vs Screen confusion | Clear `color_mode` + `print_method` separation. DTG/DTF = process mode + shared LPI. |

---

## Acceptance Criteria

### Spot Mode (Screen Print)
- [ ] Upload design + dark garment + `color_mode=spot` → API returns white base layer (choked 2px) + spot color layers with trapping
- [ ] Upload design + light garment + `color_mode=spot` → API returns spot color layers only (no white base), trapping applied
- [ ] Spot layers include Pantone mapping + Magna recipes
- [ ] Trapping overlap visible between adjacent spot color masks

### Process Mode (DTG/DTF)
- [ ] Upload design + dark garment + `color_mode=process` + `print_method=dtg` → API returns white base layer (from image, **no choke**) + CMYK composite at 30 LPI
- [ ] Upload design + light garment + `color_mode=process` → API returns CMYK composite only (no white base), 30 LPI
- [ ] Process mode **does NOT** run K-means, Pantone mapping, or trapping

### Shared
- [ ] Composite preview shows correct result for both dark and light garments in both modes
- [ ] FastAPI `/api/v1/separate` returns `color_mode`, `print_method`, and `white_base_layer` in response
- [ ] Frontend `ColorSeparator` displays white base layer when present, shows mode badge (Spot/Process)
- [ ] DTG/DTF mode produces 30 LPI halftones; Screen mode produces 55 LPI
- [ ] Both `/app` and `/mainpage` build successfully

---

*Plan created: May 14, 2026*
*Revised: May 14, 2026 — added `color_mode` split (spot vs. process) to clarify DTG/DTF CMYK workflow vs. screen-print spot-color workflow*
*Ready for execution*
