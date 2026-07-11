"""
White Base Layer Generator

Handles white base (underbase) generation for both spot-color (screen print) 
and process-color (DTG/DTF) workflows.

Screen Print (Spot Mode):
- White base = union of all spot color masks
- Choke applied (2px default) so colors overprint white, preventing halo
- Processed BEFORE halftone

DTG/DTF (Process Mode):
- White base = derived from original image luminance / alpha
- NO choke — white base stays full size
- RIP handles ink density; we provide the halftone mask
"""

import numpy as np
from PIL import Image
from typing import List, Tuple, Optional
import colorsys


class WhiteBaseGenerator:
    """Generates white base layers for different print methods."""
    
    def __init__(self, dpi: int = 300):
        """
        Initialize the white base generator.
        
        Args:
            dpi: Target resolution (default 300 for print)
        """
        self.dpi = dpi
    
    def needs_white_base(self, garment_color: str) -> bool:
        """
        Determine if white base is needed based on garment darkness.
        
        Args:
            garment_color: Hex color string (e.g., '#1A1A1A' or '#FFFFFF')
            
        Returns:
            True if garment is dark enough to need white base
        """
        rgb = self._hex_to_rgb(garment_color)
        luminance = self._calculate_luminance(rgb)
        return luminance < 0.18
    
    def generate_white_base_spot(
        self,
        color_masks: List[np.ndarray]
    ) -> np.ndarray:
        """
        Generate white base for spot-color (screen print) workflow.
        
        White base = union of all spot color masks so every printed
        area has a white underbase to make colors pop on dark garments.
        
        Args:
            color_masks: List of binary masks (255 = color present) for each spot color
            
        Returns:
            Binary mask representing the union of all color areas
        """
        if not color_masks:
            return np.zeros((0, 0), dtype=np.uint8)
        
        # Convert to boolean for logical OR
        bool_masks = [(m > 127).astype(bool) for m in color_masks]
        
        # Union of all masks
        union = np.logical_or.reduce(bool_masks)
        
        return (union * 255).astype(np.uint8)
    
    def generate_white_base_process(
        self,
        image: np.ndarray,
        alpha_threshold: int = 10,
        luminance_threshold: float = 0.85
    ) -> np.ndarray:
        """
        Generate white base for process-color (DTG/DTF) workflow.
        
        White base is derived from image regions that need it:
        - Dark/opaque areas in the image that would print on dark garment
        - Areas where luminance is below threshold (needs white underbase)
        
        Args:
            image: RGBA or RGB image array (H x W x [3|4])
            alpha_threshold: Minimum alpha value to consider pixel printable
            luminance_threshold: Maximum luminance that triggers white base
            
        Returns:
            Grayscale mask (0-255) where higher = more white base needed
        """
        h, w = image.shape[:2]
        
        # Extract RGB and alpha
        if image.shape[2] == 4:
            rgb = image[:, :, :3]
            alpha = image[:, :, 3]
        else:
            rgb = image
            alpha = np.ones((h, w), dtype=np.uint8) * 255
        
        # Pixels that are actually printable (not transparent)
        printable = alpha > alpha_threshold
        
        # Calculate luminance for each pixel
        luminance = self._calculate_luminance_per_pixel(rgb)
        
        # White base needed where:
        # 1. Pixel is printable (alpha > threshold)
        # 2. AND pixel is dark enough (luminance < threshold)
        needs_white = printable & (luminance < luminance_threshold)
        
        # Convert to grayscale mask (0-255)
        white_base = np.zeros((h, w), dtype=np.uint8)
        white_base[needs_white] = 255
        
        return white_base
    
    def generate_white_base_with_choke(
        self,
        mask: np.ndarray,
        choke_px: int = 2
    ) -> np.ndarray:
        """
        Apply choke (erosion) to white base mask for screen printing.
        
        Choke shrinks the white base slightly so spot colors overprint
        the edges, preventing white halo around printed areas.
        
        Args:
            mask: Binary white base mask (255 = white base area)
            choke_px: Number of pixels to shrink (default 2 at 300 DPI)
            
        Returns:
            Choked binary mask
        """
        try:
            import cv2
            
            # Use elliptical kernel for smooth edges
            kernel = cv2.getStructuringElement(
                cv2.MORPH_ELLIPSE,
                (choke_px * 2 + 1, choke_px * 2 + 1)
            )
            
            # Erode = shrink the mask
            choked = cv2.erode(mask, kernel, iterations=1)
            
            return choked
            
        except ImportError:
            # Fallback: manual pixel shrink via scipy
            from scipy import ndimage
            
            mask_bool = (mask > 127).astype(bool)
            
            # Distance transform + threshold = erosion
            distance = ndimage.distance_transform_edt(mask_bool)
            choked = distance > choke_px
            
            return (choked * 255).astype(np.uint8)
    
    def apply_white_base_choke(
        self,
        white_base: np.ndarray,
        choke_px: int = 2,
        color_mode: str = "spot"
    ) -> Tuple[np.ndarray, dict]:
        """
        Apply choke to white base if in spot mode.
        
        Args:
            white_base: Raw white base mask
            choke_px: Choke amount in pixels
            color_mode: 'spot' (screen) or 'process' (dtg/dtf)
            
        Returns:
            Tuple of (processed_mask, metadata_dict)
        """
        if color_mode == "process":
            # DTG/DTF: no choke
            return white_base, {
                "choke_applied": False,
                "choke_px": 0,
                "original_area": int(np.sum(white_base > 127)),
                "choked_area": int(np.sum(white_base > 127))
            }
        
        # Spot mode: apply choke
        original_area = int(np.sum(white_base > 127))
        choked = self.generate_white_base_with_choke(white_base, choke_px)
        choked_area = int(np.sum(choked > 127))
        
        return choked, {
            "choke_applied": True,
            "choke_px": choke_px,
            "original_area": original_area,
            "choked_area": choked_area,
            "area_reduction": round((original_area - choked_area) / max(original_area, 1) * 100, 2)
        }
    
    def _hex_to_rgb(self, hex_color: str) -> Tuple[int, int, int]:
        """Convert hex color to RGB tuple."""
        hex_color = hex_color.lstrip('#')
        if len(hex_color) == 3:
            hex_color = ''.join([c*2 for c in hex_color])
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    
    def _calculate_luminance(self, rgb: Tuple[int, int, int]) -> float:
        """Calculate relative luminance of an RGB color."""
        r, g, b = [x / 255.0 for x in rgb]
        # ITU-R BT.709 coefficients
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
    
    def _calculate_luminance_per_pixel(self, rgb_array: np.ndarray) -> np.ndarray:
        """Calculate luminance for each pixel in an RGB array."""
        r = rgb_array[:, :, 0] / 255.0
        g = rgb_array[:, :, 1] / 255.0
        b = rgb_array[:, :, 2] / 255.0
        return 0.2126 * r + 0.7152 * g + 0.0722 * b


def create_synthetic_test_image(
    size: Tuple[int, int] = (300, 300),
    shape: str = "circle"
) -> np.ndarray:
    """
    Create a synthetic test image for white base testing.
    
    Args:
        size: Image dimensions (width, height)
        shape: Shape to draw ('circle', 'rectangle', 'star')
        
    Returns:
        RGBA image array
    """
    from PIL import Image, ImageDraw
    
    img = Image.new('RGBA', size, (0, 0, 0, 255))  # Black background
    draw = ImageDraw.Draw(img)
    
    cx, cy = size[0] // 2, size[1] // 2
    radius = min(size) // 3
    
    if shape == "circle":
        # Red circle on black background
        draw.ellipse(
            [cx - radius, cy - radius, cx + radius, cy + radius],
            fill=(255, 0, 0, 255)
        )
    elif shape == "rectangle":
        draw.rectangle(
            [cx - radius, cy - radius, cx + radius, cy + radius],
            fill=(255, 0, 0, 255)
        )
    elif shape == "star":
        from math import cos, sin, pi
        points = []
        for i in range(10):
            angle = pi / 2 + i * pi / 5
            r = radius if i % 2 == 0 else radius // 2
            points.append((cx + r * cos(angle), cy - r * sin(angle)))
        draw.polygon(points, fill=(255, 0, 0, 255))
    
    return np.array(img)


def main():
    """Test the white base generator."""
    print("White Base Generator - Test")
    print("=" * 60)
    
    generator = WhiteBaseGenerator(dpi=300)
    
    # Test 1: Needs white base detection
    print("\n[1/3] Testing garment luminance detection...")
    test_colors = [
        ("#1A1A1A", True, "Very dark (needs white base)"),
        ("#333333", True, "Dark gray (needs white base)"),
        ("#808080", False, "Medium gray (no white base)"),
        ("#FFFFFF", False, "White (no white base)"),
        ("#FF0000", False, "Red garment (no white base)"),
    ]
    
    for hex_color, expected, description in test_colors:
        result = generator.needs_white_base(hex_color)
        status = "PASS" if result == expected else "FAIL"
        print(f"  {status}: {hex_color} -> {result} ({description})")
    
    # Test 2: Spot mode white base
    print("\n[2/3] Testing spot-color white base generation...")
    
    # Create two overlapping color masks
    mask1 = np.zeros((100, 100), dtype=np.uint8)
    mask1[20:60, 20:60] = 255  # Red square
    
    mask2 = np.zeros((100, 100), dtype=np.uint8)
    mask2[40:80, 40:80] = 255  # Blue square (overlaps with red)
    
    white_base = generator.generate_white_base_spot([mask1, mask2])
    
    # Union should cover both squares
    union_area = np.sum(white_base > 127)
    print(f"  Union area: {union_area} pixels")
    print(f"  Expected: ~3600 (two 40x40 squares with 20x20 overlap)")
    
    # Test choke
    choked = generator.generate_white_base_with_choke(white_base, choke_px=2)
    choked_area = np.sum(choked > 127)
    print(f"  Choked area: {choked_area} pixels")
    print(f"  Area reduction: {((union_area - choked_area) / union_area * 100):.1f}%")
    
    # Test 3: Process mode white base
    print("\n[3/3] Testing process-color (DTG/DTF) white base generation...")
    
    test_img = create_synthetic_test_image((200, 200), "circle")
    process_wb = generator.generate_white_base_process(test_img)
    
    # Should only have white base where the red circle is (dark on black background)
    # Since red circle is bright, luminance is high, so minimal white base on black bg
    # But if we put it on a dark garment, the red circle needs white base
    wb_area = np.sum(process_wb > 127)
    print(f"  Process white base area: {wb_area} pixels")
    print(f"  Image size: {test_img.shape}")
    
    # Test with transparent image
    transparent_img = np.zeros((100, 100, 4), dtype=np.uint8)
    transparent_img[25:75, 25:75] = [100, 100, 100, 255]  # Dark gray square, opaque
    
    process_wb2 = generator.generate_white_base_process(transparent_img)
    wb_area2 = np.sum(process_wb2 > 127)
    print(f"  Transparent image white base area: {wb_area2} pixels (expected ~2500)")
    
    print("\n" + "=" * 60)
    print("White Base Generator tests complete!")


if __name__ == "__main__":
    main()
