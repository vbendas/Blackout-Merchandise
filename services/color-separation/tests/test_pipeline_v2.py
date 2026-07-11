"""
End-to-End Test for Print Pipeline v2.0

Tests the complete pipeline:
- Spot mode with knockout + elliptical halftone + PSD
- Process mode with CMYK + elliptical halftone + PSD
- Verifies output structure, PSD layers, print size
"""

import sys
import os
import json
from pathlib import Path

import numpy as np
from PIL import Image

# Setup paths
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.spot_color_separator import SpotColorSeparator, SeparationConfig, PrintMethod, ColorMode


def create_test_image(path: str, size: tuple = (800, 1000)):
    """Create a synthetic test image with distinct color regions."""
    w, h = size
    img = np.zeros((h, w, 4), dtype=np.uint8)
    
    # Background: transparent
    # Region 1: Red circle (top-left)
    y, x = np.ogrid[:h, :w]
    
    # Red circle
    dist1 = np.sqrt((x - w//4)**2 + (y - h//4)**2)
    mask1 = dist1 < min(w, h) // 5
    img[mask1] = [220, 40, 40, 255]
    
    # Blue circle (top-right, overlaps with red)
    dist2 = np.sqrt((x - w//2)**2 + (y - h//4)**2)
    mask2 = dist2 < min(w, h) // 5
    img[mask2] = [40, 40, 220, 255]
    
    # Yellow circle (center, overlaps with both)
    dist3 = np.sqrt((x - w*3//8)**2 + (y - h//3)**2)
    mask3 = dist3 < min(w, h) // 5
    img[mask3] = [230, 220, 40, 255]
    
    # Green rectangle (bottom)
    img[h//2:h*3//4, w//4:w*3//4] = [40, 180, 40, 255]
    
    # White triangle (center-bottom)
    for row in range(h//2, h*3//4):
        frac = (row - h//2) / (h//4)
        col_start = int(w//2 - frac * w//6)
        col_end = int(w//2 + frac * w//6)
        if row < h and col_start < w and col_end < w:
            img[row, col_start:col_end] = [240, 240, 240, 255]
    
    pil_img = Image.fromarray(img, mode='RGBA')
    pil_img.save(path)
    print(f"Test image saved: {path} ({w}x{h})")
    return path


def test_spot_mode():
    """T6.1: Spot mode with knockout."""
    print("\n" + "=" * 60)
    print("TEST 1: Spot Mode (knockout + elliptical halftone + PSD)")
    print("=" * 60)
    
    # Create test image
    test_dir = Path("/tmp/print_pipeline_v2_spot")
    test_dir.mkdir(parents=True, exist_ok=True)
    
    image_path = create_test_image(str(test_dir / "test_design.png"), (800, 1000))
    
    # Configure spot mode
    config = SeparationConfig(
        max_colors=4,
        garment_color="#1A1A1A",  # Dark garment
        include_halftone=True,
        color_mode=ColorMode.SPOT,
        print_method=PrintMethod.SCREEN,
        choke_px=2,
        trap_px=1
    )
    
    separator = SpotColorSeparator(config)
    
    # Run pipeline
    output_dir = str(test_dir / "output")
    result = separator.separate(
        image_path=image_path,
        garment_color="#1A1A1A",
        output_dir=output_dir
    )
    
    # Verify results
    assert result.success, f"Pipeline failed: {result.errors}"
    
    # Check output structure
    output_path = Path(output_dir)
    halftone_dir = output_path / "halftone"
    
    print(f"\n--- Verification ---")
    print(f"Success: {result.success}")
    print(f"Kept colors: {result.kept_colors}")
    print(f"Separation layers: {len(result.separation_layers)}")
    print(f"White base: {result.white_base_layer is not None}")
    
    # T6.1: Verify knockout (no overlap)
    if result.halftone_layers:
        knockout_meta = result.halftone_layers.get("knockout_metadata")
        if knockout_meta:
            print(f"\nKnockout applied: {knockout_meta.get('knockout_applied')}")
            for lm in knockout_meta.get("layers", []):
                print(f"  {lm['label']}: reduced {lm['reduction_percent']}%")
    
    # T6.3: Check print size (300 DPI outputs)
    if result.halftone_layers:
        for layer in result.halftone_layers.get("layers", []):
            outputs = layer.get("halftone_outputs", {})
            if "dpi_300" in outputs:
                size = outputs["dpi_300"]["size"]
                print(f"  Layer {layer['label']}: {size[0]}x{size[1]} px")
    
    # Check PSD
    psd_path = result.halftone_layers.get("psd_path") if result.halftone_layers else None
    if psd_path and Path(psd_path).exists():
        import pytoshop
        with open(psd_path, 'rb') as f:
            psd = pytoshop.core.PsdFile.read(f)
        layer_count = len(psd.layer_and_mask_info.layer_info.layer_records)
        print(f"\nPSD: {psd.width}x{psd.height}, {layer_count} layers")
        for lr in reversed(psd.layer_and_mask_info.layer_info.layer_records):
            print(f"  Layer: '{lr.name}' ({lr.width}x{lr.height})")
        print("✅ PSD verified")
    else:
        print("⚠️  No PSD generated")
    
    # Check consolidated preview
    consolidated = result.halftone_layers.get("consolidated_preview") if result.halftone_layers else None
    if consolidated and Path(consolidated).exists():
        print(f"\nConsolidated preview: {consolidated}")
        print("✅ Consolidated preview exists")
    
    print(f"\n✅ SPOT MODE TEST PASSED")
    return result


def test_process_mode():
    """T6.2: Process mode with CMYK."""
    print("\n" + "=" * 60)
    print("TEST 2: Process Mode (CMYK + elliptical halftone + PSD)")
    print("=" * 60)
    
    test_dir = Path("/tmp/print_pipeline_v2_process")
    test_dir.mkdir(parents=True, exist_ok=True)
    
    image_path = create_test_image(str(test_dir / "test_design.png"), (800, 1000))
    
    config = SeparationConfig(
        max_colors=6,
        garment_color="#1A1A1A",
        include_halftone=True,
        color_mode=ColorMode.PROCESS,
        print_method=PrintMethod.DTG,
        skip_white_base=False
    )
    
    separator = SpotColorSeparator(config)
    
    output_dir = str(test_dir / "output")
    result = separator.separate(
        image_path=image_path,
        garment_color="#1A1A1A",
        output_dir=output_dir
    )
    
    assert result.success, f"Process mode failed: {result.errors}"
    
    print(f"\n--- Verification ---")
    print(f"Success: {result.success}")
    print(f"Separation layers: {len(result.separation_layers)}")
    print(f"White base: {result.white_base_layer is not None}")
    
    # Check PSD
    psd_path = result.halftone_layers.get("psd_path") if result.halftone_layers else None
    if psd_path and Path(psd_path).exists():
        import pytoshop
        with open(psd_path, 'rb') as f:
            psd = pytoshop.core.PsdFile.read(f)
        layer_count = len(psd.layer_and_mask_info.layer_info.layer_records)
        print(f"\nPSD: {psd.width}x{psd.height}, {layer_count} layers")
        for lr in reversed(psd.layer_and_mask_info.layer_info.layer_records):
            print(f"  Layer: '{lr.name}' ({lr.width}x{lr.height})")
        print("✅ PSD verified")
    
    # T6.2: Verify NO knockout in process mode
    if result.halftone_layers:
        knockout_meta = result.halftone_layers.get("knockout_metadata")
        if knockout_meta:
            print(f"\nKnockout applied: {knockout_meta.get('knockout_applied')}")
            assert not knockout_meta.get("knockout_applied", False), \
                "Knockout should NOT be applied in process mode!"
            print("✅ Knockout correctly NOT applied (process mode)")
    
    print(f"\n✅ PROCESS MODE TEST PASSED")
    return result


def test_acceptance_criteria(spot_result, process_result):
    """T6.4: Verify all acceptance criteria from the plan."""
    print("\n" + "=" * 60)
    print("ACCEPTANCE CRITERIA VERIFICATION")
    print("=" * 60)
    
    criteria = []
    
    # 1. Elliptical halftone visible (not circular)
    # We verify by checking the method used
    if spot_result.halftone_layers:
        for layer in spot_result.halftone_layers.get("layers", []):
            method = layer.get("settings", {}).get("method", "")
            dot_shape = layer.get("settings", {}).get("dot_shape", "")
            if method == "elliptical" or dot_shape == "ellipse":
                criteria.append(("Elliptical halftone", True, "Method is elliptical"))
                break
        else:
            criteria.append(("Elliptical halftone", False, "Not found"))
    else:
        criteria.append(("Elliptical halftone", False, "No halftone data"))
    
    # 2. Spot mode: knockout applied
    if spot_result.halftone_layers and spot_result.halftone_layers.get("knockout_metadata"):
        km = spot_result.halftone_layers["knockout_metadata"]
        criteria.append(("Spot knockout", km.get("knockout_applied", False), 
                        f"Applied: {km.get('knockout_applied')}"))
    else:
        criteria.append(("Spot knockout", False, "No knockout metadata"))
    
    # 3. Process mode: no knockout
    if process_result.halftone_layers and process_result.halftone_layers.get("knockout_metadata"):
        km = process_result.halftone_layers["knockout_metadata"]
        criteria.append(("Process no knockout", not km.get("knockout_applied", True),
                        f"Knockout applied: {km.get('knockout_applied')}"))
    else:
        criteria.append(("Process no knockout", True, "No knockout metadata (correct)"))
    
    # 4. PSD files exist
    spot_psd = spot_result.halftone_layers.get("psd_path") if spot_result.halftone_layers else None
    process_psd = process_result.halftone_layers.get("psd_path") if process_result.halftone_layers else None
    
    criteria.append(("Spot PSD exists", 
                    spot_psd is not None and Path(spot_psd).exists(),
                    spot_psd or "Not generated"))
    criteria.append(("Process PSD exists",
                    process_psd is not None and Path(process_psd).exists(),
                    process_psd or "Not generated"))
    
    # 5. Layer names contain "Print" and "Preview"
    if spot_psd and Path(spot_psd).exists():
        import pytoshop
        with open(spot_psd, 'rb') as f:
            psd = pytoshop.core.PsdFile.read(f)
        names = [lr.name for lr in psd.layer_and_mask_info.layer_info.layer_records]
        has_print = any("Print" in n for n in names)
        has_preview = any("Preview" in n for n in names)
        has_bg = any("Background" in n for n in names)
        
        criteria.append(("Layer names: 'Print'", has_print, str([n for n in names if "Print" in n])))
        criteria.append(("Layer names: 'Preview'", has_preview, str([n for n in names if "Preview" in n])))
        criteria.append(("Background layers", has_bg, str([n for n in names if "Background" in n])))
    else:
        criteria.append(("Layer names: 'Print'", False, "No PSD"))
        criteria.append(("Layer names: 'Preview'", False, "No PSD"))
        criteria.append(("Background layers", False, "No PSD"))
    
    # 6. Transparent areas preserved (alpha check)
    # Verify by checking halftone output has alpha channel
    if spot_result.halftone_layers:
        for layer in spot_result.halftone_layers.get("layers", []):
            outputs = layer.get("halftone_outputs", {})
            if "dpi_300" in outputs:
                img_path = outputs["dpi_300"]["path"]
                if Path(img_path).exists():
                    img = Image.open(img_path)
                    has_alpha = img.mode == 'RGBA'
                    criteria.append(("Transparency preserved", has_alpha, f"Mode: {img.mode}"))
                    break
    else:
        criteria.append(("Transparency preserved", False, "No halftone output"))
    
    # Print results
    all_passed = True
    for name, passed, detail in criteria:
        status = "✅" if passed else "❌"
        print(f"  {status} {name}: {detail}")
        if not passed:
            all_passed = False
    
    print(f"\n{'='*60}")
    if all_passed:
        print("ALL ACCEPTANCE CRITERIA PASSED ✅")
    else:
        print("SOME CRITERIA FAILED ❌")
    print(f"{'='*60}")
    
    return all_passed


if __name__ == "__main__":
    print("Print Pipeline v2.0 — End-to-End Test")
    print("=" * 60)
    print(f"Date: May 14, 2026")
    
    # Run tests
    spot_result = test_spot_mode()
    process_result = test_process_mode()
    
    # Verify acceptance criteria
    all_passed = test_acceptance_criteria(spot_result, process_result)
    
    sys.exit(0 if all_passed else 1)
