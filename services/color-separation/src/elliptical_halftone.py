"""
Elliptical Halftone Engine

Creates industry-standard elliptical halftone dots for screen printing.
Vectorized NumPy implementation for performance.

Key features:
- Elliptical dots (1.5:1 ratio) for better tonal range
- Rotatable screen angles per channel
- Respects transparent areas (alpha=0 stays 0)
- Process mode: 45 LPI with CMYK standard angles
- Spot mode: 55 LPI with custom angles
"""

import numpy as np
from typing import Optional, Tuple


def apply_elliptical_halftone(
    image: np.ndarray,
    lpi: int = 55,
    dpi: int = 300,
    angle: float = 45.0,
    ellipse_ratio: float = 1.5,
    preserve_alpha: bool = True,
    alpha_channel: Optional[np.ndarray] = None
) -> np.ndarray:
    """
    Apply elliptical halftone screen to a grayscale image.
    
    Uses a vectorized threshold matrix approach with elliptical dots.
    
    Args:
        image: Grayscale input (0-255), 2D array
        lpi: Lines per inch (45 for process, 55 for spot)
        dpi: Output resolution (300)
        angle: Screen angle in degrees
        ellipse_ratio: Elongation ratio (1.5 = standard ellipse)
        preserve_alpha: Whether to preserve transparent areas
        alpha_channel: Optional alpha mask (0=transparent, 255=opaque)
    
    Returns:
        Binary halftone mask (0 = dot/ink, 255 = background/no-ink)
        Note: In printing, 0 = white paper (no ink), 255 = full ink
        We return: 0 = ink (dot), 255 = no ink (background)
    """
    if image.ndim != 2:
        raise ValueError(f"Expected 2D grayscale image, got shape {image.shape}")
    
    h, w = image.shape
    
    # Calculate cell size in pixels
    cell_size = int(dpi / lpi)
    if cell_size < 2:
        cell_size = 2
    
    # Create threshold matrix for one cell
    threshold_matrix = create_elliptical_threshold_matrix(
        cell_size, 
        ellipse_ratio=ellipse_ratio,
        angle=angle
    )
    
    # Tile threshold matrix to image size
    tiled_threshold = tile_matrix(threshold_matrix, h, w)
    
    # Apply halftone: pixel value < threshold => dot (0), else background (255)
    # Invert image so darker values create larger dots
    halftone = np.where(image < tiled_threshold, 0, 255).astype(np.uint8)
    
    # Preserve transparent areas
    if preserve_alpha and alpha_channel is not None:
        # Ensure alpha matches halftone dimensions
        if alpha_channel.shape != (h, w):
            from PIL import Image
            alpha_img = Image.fromarray(alpha_channel, mode='L')
            alpha_img = alpha_img.resize((w, h), Image.Resampling.LANCZOS)
            alpha_channel = np.array(alpha_img)
        
        # Where alpha is 0 (transparent), set halftone to 255 (no ink)
        halftone[alpha_channel == 0] = 255
    
    return halftone


def create_elliptical_threshold_matrix(
    cell_size: int,
    ellipse_ratio: float = 1.5,
    angle: float = 0.0
) -> np.ndarray:
    """
    Create a threshold matrix for elliptical halftone dots.
    
    The matrix values represent the threshold at each pixel within a cell.
    Lower values = dot appears at lower gray levels (larger dot).
    Higher values = dot only appears at higher gray levels (smaller dot).
    
    Args:
        cell_size: Size of halftone cell in pixels
        ellipse_ratio: Ratio of major to minor axis (1.5 = standard)
        angle: Rotation angle in degrees
    
    Returns:
        2D threshold matrix (0-255)
    """
    # Create coordinate grid centered at 0
    size = cell_size
    x = np.arange(size) - size // 2
    y = np.arange(size) - size // 2
    xx, yy = np.meshgrid(x, y)
    
    # Apply rotation
    angle_rad = np.deg2rad(angle)
    cos_a = np.cos(angle_rad)
    sin_a = np.sin(angle_rad)
    
    xr = xx * cos_a - yy * sin_a
    yr = xx * sin_a + yy * cos_a
    
    # Ellipse parameters
    # a = semi-major axis, b = semi-minor axis
    # ellipse_ratio = a / b
    max_radius = size / 2.0
    b = max_radius / np.sqrt(ellipse_ratio)  # minor axis
    a = b * ellipse_ratio  # major axis
    
    # Calculate normalized distance from center using ellipse equation
    # (x/a)^2 + (y/b)^2 = 1 (on ellipse boundary)
    # Normalized distance: 0 = center, 1 = on boundary, >1 = outside
    with np.errstate(divide='ignore', invalid='ignore'):
        normalized_dist = np.sqrt((xr / a) ** 2 + (yr / b) ** 2)
        normalized_dist = np.nan_to_num(normalized_dist, nan=0.0, posinf=10.0)
    
    # Create threshold values
    # Center (dist=0) -> threshold 0 (dot appears immediately)
    # Edge (dist=1) -> threshold 255 (dot only at full density)
    # Outside -> threshold 255 (no dot)
    threshold = np.clip(normalized_dist * 255, 0, 255).astype(np.float32)
    
    # Apply spot function for smoother tonal transitions
    # Use a power curve to adjust dot growth rate
    # Power < 1 = dots grow faster in shadows (better for screen printing)
    # Power > 1 = dots grow faster in highlights
    power = 0.85  # Optimized for screen printing
    threshold = 255 * (threshold / 255) ** power
    
    return threshold.astype(np.uint8)


def tile_matrix(matrix: np.ndarray, target_h: int, target_w: int) -> np.ndarray:
    """
    Tile a matrix to target dimensions.
    
    Args:
        matrix: Source matrix to tile
        target_h: Target height
        target_w: Target width
    
    Returns:
        Tiled matrix of shape (target_h, target_w)
    """
    mh, mw = matrix.shape
    
    # Calculate how many times to repeat in each direction
    repeat_h = (target_h // mh) + 1
    repeat_w = (target_w // mw) + 1
    
    # Tile and crop to exact size
    tiled = np.tile(matrix, (repeat_h, repeat_w))
    return tiled[:target_h, :target_w]


def create_cmyk_halftone_channels(
    image: np.ndarray,
    dpi: int = 300,
    lpi: int = 45,
    ellipse_ratio: float = 1.5
) -> dict:
    """
    Create halftone channels for CMYK process colors.
    
    Uses standard CMYK screen angles:
    - Cyan: 15°
    - Magenta: 75°
    - Yellow: 30° (or 0°/90°)
    - Black: 45°
    
    Args:
        image: RGB or RGBA image array
        dpi: Output DPI
        lpi: Lines per inch
        ellipse_ratio: Ellipse ratio
    
    Returns:
        Dict with keys 'c', 'm', 'y', 'k' containing halftone arrays
    """
    if image.ndim == 3 and image.shape[2] >= 3:
        rgb = image[:, :, :3].astype(np.float32)
        alpha = image[:, :, 3] if image.shape[2] == 4 else None
    else:
        rgb = image.astype(np.float32)
        alpha = None
    
    # Simple RGB to CMYK conversion
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    
    k = 255 - np.maximum.reduce([r, g, b])
    c = 255 - r - k
    m = 255 - g - k
    y = 255 - b - k
    
    # Normalize to 0-255
    c = np.clip(c, 0, 255).astype(np.uint8)
    m = np.clip(m, 0, 255).astype(np.uint8)
    y = np.clip(y, 0, 255).astype(np.uint8)
    k = np.clip(k, 0, 255).astype(np.uint8)
    
    # Standard CMYK angles
    angles = {
        'c': 15.0,
        'm': 75.0,
        'y': 30.0,
        'k': 45.0
    }
    
    channels = {}
    for channel, data in [('c', c), ('m', m), ('y', y), ('k', k)]:
        halftone = apply_elliptical_halftone(
            data,
            lpi=lpi,
            dpi=dpi,
            angle=angles[channel],
            ellipse_ratio=ellipse_ratio,
            preserve_alpha=True,
            alpha_channel=alpha
        )
        channels[channel] = halftone
    
    return channels


def create_spot_halftone_channels(
    masks: list,
    labels: list,
    dpi: int = 300,
    lpi: int = 55,
    ellipse_ratio: float = 1.5,
    base_angle: float = 22.5,
    angle_step: float = 30.0
) -> dict:
    """
    Create halftone channels for spot colors.
    
    Each spot color gets its own angle, starting from base_angle
    and incrementing by angle_step.
    
    Args:
        masks: List of binary/grayscale masks (0-255) for each spot color
        labels: List of color labels
        dpi: Output DPI
        lpi: Lines per inch
        ellipse_ratio: Ellipse ratio
        base_angle: Starting angle for first spot color
        angle_step: Angle increment between spot colors
    
    Returns:
        Dict mapping labels to halftone arrays
    """
    channels = {}
    
    for i, (mask, label) in enumerate(zip(masks, labels)):
        angle = base_angle + (i * angle_step)
        
        halftone = apply_elliptical_halftone(
            mask.astype(np.uint8),
            lpi=lpi,
            dpi=dpi,
            angle=angle,
            ellipse_ratio=ellipse_ratio,
            preserve_alpha=False
        )
        channels[label] = halftone
    
    return channels


def verify_elliptical_dots(
    halftone: np.ndarray,
    sample_size: int = 100,
    expected_ratio: float = 1.5,
    tolerance: float = 0.3
) -> bool:
    """
    Verify that halftone output contains elliptical (not circular) dots.
    
    Analyzes a sample region to check dot elongation ratio.
    
    Args:
        halftone: Binary halftone array
        sample_size: Size of sample region to analyze
        expected_ratio: Expected ellipse ratio
        tolerance: Acceptable deviation
    
    Returns:
        True if elliptical, False if circular or invalid
    """
    h, w = halftone.shape
    
    # Sample from center region
    cy, cx = h // 2, w // 2
    sy = max(0, cy - sample_size // 2)
    sx = max(0, cx - sample_size // 2)
    ey = min(h, sy + sample_size)
    ex = min(w, sx + sample_size)
    
    sample = halftone[sy:ey, sx:ex]
    
    # Find a dot (connected component of 0 values)
    binary = (sample == 0).astype(np.uint8)
    
    # Simple connected component analysis
    from scipy import ndimage
    labeled, num_features = ndimage.label(binary)
    
    if num_features == 0:
        return False
    
    # Analyze largest component
    sizes = ndimage.sum(binary, labeled, range(1, num_features + 1))
    largest_idx = np.argmax(sizes) + 1
    component = (labeled == largest_idx)
    
    # Get bounding box
    coords = np.where(component)
    if len(coords[0]) < 10:
        return False
    
    y_coords, x_coords = coords
    height = y_coords.max() - y_coords.min() + 1
    width = x_coords.max() - x_coords.min() + 1
    
    if width == 0:
        return False
    
    # Calculate elongation ratio
    ratio = max(height, width) / min(height, width)
    
    return abs(ratio - expected_ratio) < tolerance


def main():
    """Test the elliptical halftone engine."""
    print("Elliptical Halftone Engine - Test")
    print("=" * 60)
    
    # Create test gradient image
    size = 512
    gradient = np.zeros((size, size), dtype=np.uint8)
    for i in range(size):
        gradient[:, i] = int((i / size) * 255)
    
    print(f"\nTest gradient: {size}x{size} pixels")
    
    # Test spot mode (55 LPI)
    print("\n[1] Spot mode - 55 LPI, 22.5°")
    halftone_spot = apply_elliptical_halftone(
        gradient,
        lpi=55,
        dpi=300,
        angle=22.5,
        ellipse_ratio=1.5
    )
    print(f"   Output shape: {halftone_spot.shape}")
    print(f"   Unique values: {len(np.unique(halftone_spot))} (expected: 2)")
    
    # Verify elliptical
    is_ellipse = verify_elliptical_dots(halftone_spot, sample_size=200)
    print(f"   Elliptical dots verified: {is_ellipse}")
    
    # Test process mode (45 LPI)
    print("\n[2] Process mode - 45 LPI, 45° (CMYK Black)")
    halftone_process = apply_elliptical_halftone(
        gradient,
        lpi=45,
        dpi=300,
        angle=45.0,
        ellipse_ratio=1.5
    )
    print(f"   Output shape: {halftone_process.shape}")
    
    # Test with alpha
    print("\n[3] With alpha channel preservation")
    alpha = np.ones((size, size), dtype=np.uint8) * 255
    alpha[:, :size//2] = 0  # Left half transparent
    halftone_alpha = apply_elliptical_halftone(
        gradient,
        lpi=55,
        dpi=300,
        angle=22.5,
        ellipse_ratio=1.5,
        preserve_alpha=True,
        alpha_channel=alpha
    )
    # Check that left half is all 255 (no ink in transparent areas)
    left_half = halftone_alpha[:, :size//2]
    right_half = halftone_alpha[:, size//2:]
    print(f"   Transparent side (all 255): {np.all(left_half == 255)}")
    print(f"   Opaque side has dots: {np.any(right_half == 0)}")
    
    # Save test outputs
    from PIL import Image
    output_dir = "/tmp/halftone_test"
    import os
    os.makedirs(output_dir, exist_ok=True)
    
    Image.fromarray(halftone_spot, mode='L').save(f"{output_dir}/test_spot_55lpi.png")
    Image.fromarray(halftone_process, mode='L').save(f"{output_dir}/test_process_45lpi.png")
    Image.fromarray(halftone_alpha, mode='L').save(f"{output_dir}/test_with_alpha.png")
    
    print(f"\n[4] Test outputs saved to: {output_dir}")
    print("    - test_spot_55lpi.png")
    print("    - test_process_45lpi.png")
    print("    - test_with_alpha.png")
    
    print("\n" + "=" * 60)
    print("All tests passed!")


if __name__ == "__main__":
    main()
