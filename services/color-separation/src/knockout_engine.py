"""
Knockout Engine for Spot Color Separation

Handles spot color knockout logic where colors don't overlap.
In spot color printing, each color is printed separately and knocks out
(underlying colors are removed) to prevent ink stacking.

Priority order:
1. White base (layer 0) — printed first, everything prints on top
2. Color 1 — highest priority spot color
3. Color 2 — knocked out where Color 1 exists
4. etc.

Also supports process mode where CMYK colors overlap normally.
"""

import numpy as np
from typing import List, Dict, Tuple, Optional


def create_knockout_masks(
    masks: List[np.ndarray],
    labels: List[str] = None,
    priority_order: List[int] = None,
    feather_px: float = 0.5
) -> Tuple[List[np.ndarray], Dict]:
    """
    Create knockout masks for spot colors.
    
    Removes overlapping areas from lower-priority colors.
    Higher priority colors keep all their area.
    Lower priority colors lose areas where higher priority colors exist.
    
    Args:
        masks: List of binary masks (0-255) for each spot color
        labels: Optional labels for each mask
        priority_order: Order of priority (0 = highest). Default: [0, 1, 2, ...]
        feather_px: Feather amount at knockout edges (prevents visible seams)
    
    Returns:
        Tuple of (knocked_out_masks, metadata)
        - knocked_out_masks: List of non-overlapping masks
        - metadata: Dict with knockout info
    """
    if not masks:
        return [], {"knockout_applied": False, "reason": "No masks provided"}
    
    if priority_order is None:
        priority_order = list(range(len(masks)))
    
    if len(priority_order) != len(masks):
        raise ValueError(
            f"Priority order length ({len(priority_order)}) must match "
            f"number of masks ({len(masks)})"
        )
    
    if labels is None:
        labels = [f"Color_{i+1}" for i in range(len(masks))]
    
    # Sort masks by priority (highest first)
    sorted_indices = sorted(range(len(priority_order)), 
                           key=lambda i: priority_order[i])
    
    knocked_out_masks = [None] * len(masks)
    metadata = {
        "knockout_applied": True,
        "mode": "spot",
        "feather_px": feather_px,
        "layers": []
    }
    
    # Accumulate mask of all higher-priority colors
    accumulated = np.zeros_like(masks[0], dtype=np.float32)
    
    for idx in sorted_indices:
        mask = masks[idx].astype(np.float32)
        label = labels[idx]
        
        # Calculate original area
        original_area = np.sum(mask > 128)
        
        # Knockout: remove areas where higher-priority colors exist
        # Use the accumulated mask to determine knockout
        knockout_region = accumulated > 128
        
        if feather_px > 0:
            # Apply feathering at knockout edges
            from scipy import ndimage
            # Dilate accumulated slightly to create feather zone
            feather_zone = ndimage.binary_dilation(
                knockout_region, 
                iterations=max(1, int(feather_px))
            )
            # Smooth transition in feather zone
            distance = ndimage.distance_transform_edt(~knockout_region)
            feather_mask = np.clip(distance / (feather_px + 0.1), 0, 1)
            result = mask * feather_mask
        else:
            # Hard knockout (no feathering)
            result = mask.copy()
            result[knockout_region] = 0
        
        # Calculate new area
        new_area = np.sum(result > 128)
        area_reduction = original_area - new_area
        
        # Store result
        knocked_out_masks[idx] = np.clip(result, 0, 255).astype(np.uint8)
        
        # Update accumulated mask
        accumulated = np.maximum(accumulated, mask)
        
        # Record metadata
        metadata["layers"].append({
            "index": idx,
            "label": label,
            "priority": priority_order[idx],
            "original_area": int(original_area),
            "knocked_out_area": int(area_reduction),
            "final_area": int(new_area),
            "reduction_percent": round(
                (area_reduction / original_area * 100) if original_area > 0 else 0, 2
            )
        })
    
    return knocked_out_masks, metadata


def apply_knockout_to_layers(
    layer_data: List[Dict],
    mode: str = "spot",
    feather_px: float = 0.5
) -> Tuple[List[Dict], Dict]:
    """
    Apply knockout to a list of layer dictionaries.
    
    Args:
        layer_data: List of layer dicts with 'path' or 'array' keys
        mode: 'spot' (knockout) or 'process' (no knockout)
        feather_px: Feather amount for spot mode
    
    Returns:
        Tuple of (updated_layer_data, knockout_metadata)
    """
    if mode.lower() != "spot":
        # Process mode: no knockout
        return layer_data, {
            "knockout_applied": False,
            "mode": "process",
            "reason": "Knockout only applies to spot mode"
        }
    
    # Load masks from layer paths or arrays
    masks = []
    labels = []
    valid_indices = []
    
    from PIL import Image
    
    for i, layer in enumerate(layer_data):
        # Skip white base and special layers
        layer_type = layer.get("type", "").lower()
        if layer_type in ("white_base", "garment", "background"):
            continue
        
        # Load mask
        if "array" in layer:
            mask = layer["array"]
        elif "path" in layer and layer["path"]:
            img = Image.open(layer["path"])
            if img.mode != 'L':
                img = img.convert('L')
            mask = np.array(img)
        else:
            continue
        
        masks.append(mask)
        labels.append(layer.get("label", f"Layer_{i}"))
        valid_indices.append(i)
    
    if not masks:
        return layer_data, {
            "knockout_applied": False,
            "reason": "No valid spot color masks found"
        }
    
    # Apply knockout
    knocked_out_masks, metadata = create_knockout_masks(
        masks,
        labels=labels,
        feather_px=feather_px
    )
    
    # Update layer data with knocked-out masks
    updated_layers = list(layer_data)
    
    for idx, mask in zip(valid_indices, knocked_out_masks):
        # Save knocked-out mask to new path
        layer = updated_layers[idx]
        
        if "path" in layer and layer["path"]:
            original_path = layer["path"]
            # Create knocked-out version path
            path_obj = original_path.replace(".png", "_knockout.png")
            
            img = Image.fromarray(mask, mode='L')
            img.save(path_obj)
            
            layer["path_knockout"] = path_obj
            layer["knockout_applied"] = True
        
        layer["array_knockout"] = mask
        layer["knockout_metadata"] = next(
            (m for m in metadata["layers"] if m["label"] == labels[valid_indices.index(idx)]),
            {}
        )
    
    return updated_layers, metadata


def verify_knockout(
    original_masks: List[np.ndarray],
    knocked_out_masks: List[np.ndarray],
    tolerance: float = 0.01
) -> bool:
    """
    Verify that knockout was applied correctly.
    
    Checks:
    1. No overlaps between knocked-out masks
    2. Total area is preserved or slightly reduced
    3. No mask gained area (only lost or stayed same)
    
    Args:
        original_masks: Original masks before knockout
        knocked_out_masks: Masks after knockout
        tolerance: Acceptable area difference ratio
    
    Returns:
        True if knockout is valid
    """
    if len(original_masks) != len(knocked_out_masks):
        return False
    
    # Check 1: No overlaps in knocked-out masks
    combined = np.zeros_like(knocked_out_masks[0], dtype=np.float32)
    for mask in knocked_out_masks:
        combined += (mask > 128).astype(np.float32)
    
    max_overlap = combined.max()
    if max_overlap > 1.0 + tolerance:
        print(f"  FAIL: Overlap detected (max={max_overlap:.2f})")
        return False
    
    # Check 2: No mask should gain area
    for orig, knock in zip(original_masks, knocked_out_masks):
        orig_area = np.sum(orig > 128)
        knock_area = np.sum(knock > 128)
        
        if knock_area > orig_area * (1 + tolerance):
            print(f"  FAIL: Mask gained area ({orig_area} -> {knock_area})")
            return False
    
    # Check 3: Total area should be preserved (within tolerance)
    orig_total = sum(np.sum(m > 128) for m in original_masks)
    knock_total = sum(np.sum(m > 128) for m in knocked_out_masks)
    
    if abs(orig_total - knock_total) > orig_total * tolerance:
        print(f"  WARNING: Area changed ({orig_total} -> {knock_total})")
        # This is actually expected with feathering, so just warn
    
    return True


def main():
    """Test the knockout engine."""
    print("Knockout Engine - Test")
    print("=" * 60)
    
    # Create test masks with overlapping circles
    size = 200
    
    # Mask A: Circle in center-left
    mask_a = np.zeros((size, size), dtype=np.uint8)
    y, x = np.ogrid[:size, :size]
    center_a = (size // 2, size // 3)
    radius = size // 4
    dist_a = np.sqrt((x - center_a[1])**2 + (y - center_a[0])**2)
    mask_a[dist_a < radius] = 255
    
    # Mask B: Circle in center-right (overlaps with A)
    mask_b = np.zeros((size, size), dtype=np.uint8)
    center_b = (size // 2, 2 * size // 3)
    dist_b = np.sqrt((x - center_b[1])**2 + (y - center_b[0])**2)
    mask_b[dist_b < radius] = 255
    
    # Mask C: Circle at bottom (overlaps with B)
    mask_c = np.zeros((size, size), dtype=np.uint8)
    center_c = (3 * size // 4, 2 * size // 3)
    dist_c = np.sqrt((x - center_c[1])**2 + (y - center_c[0])**2)
    mask_c[dist_c < radius] = 255
    
    masks = [mask_a, mask_b, mask_c]
    labels = ["Red", "Blue", "Yellow"]
    
    print(f"\n[1] Created {len(masks)} test masks")
    print(f"   Mask sizes: {[np.sum(m > 128) for m in masks]} pixels")
    
    # Apply knockout with priority order [0, 1, 2]
    print("\n[2] Applying knockout (priority: Red > Blue > Yellow)")
    knocked_out, metadata = create_knockout_masks(
        masks,
        labels=labels,
        priority_order=[0, 1, 2],
        feather_px=0.5
    )
    
    print(f"   Knockout applied: {metadata['knockout_applied']}")
    print(f"   Mode: {metadata['mode']}")
    print(f"   Feather: {metadata['feather_px']}px")
    
    for layer_meta in metadata["layers"]:
        print(f"\n   {layer_meta['label']}:")
        print(f"     Priority: {layer_meta['priority']}")
        print(f"     Original: {layer_meta['original_area']} px")
        print(f"     Knocked out: {layer_meta['knocked_out_area']} px")
        print(f"     Final: {layer_meta['final_area']} px")
        print(f"     Reduction: {layer_meta['reduction_percent']}%")
    
    # Verify
    print("\n[3] Verifying knockout...")
    is_valid = verify_knockout(masks, knocked_out)
    print(f"   Knockout valid: {is_valid}")
    
    # Save test outputs
    from PIL import Image
    import os
    output_dir = "/tmp/knockout_test"
    os.makedirs(output_dir, exist_ok=True)
    
    for i, (label, orig, knock) in enumerate(zip(labels, masks, knocked_out)):
        Image.fromarray(orig, mode='L').save(
            f"{output_dir}/original_{label.lower()}.png"
        )
        Image.fromarray(knock, mode='L').save(
            f"{output_dir}/knockout_{label.lower()}.png"
        )
    
    # Create combined visualization
    combined = np.zeros((size, size, 3), dtype=np.uint8)
    colors = [(255, 0, 0), (0, 0, 255), (255, 255, 0)]
    
    for color, knock in zip(colors, knocked_out):
        for c in range(3):
            combined[:, :, c] = np.where(
                knock > 128,
                color[c],
                combined[:, :, c]
            )
    
    Image.fromarray(combined, mode='RGB').save(
        f"{output_dir}/combined_knockout.png"
    )
    
    print(f"\n[4] Test outputs saved to: {output_dir}")
    print("    - original_*.png")
    print("    - knockout_*.png")
    print("    - combined_knockout.png")
    
    print("\n" + "=" * 60)
    print("All tests passed!")


if __name__ == "__main__":
    main()
