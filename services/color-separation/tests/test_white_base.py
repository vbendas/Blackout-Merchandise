"""
Unit tests for White Base Layer Generator.

Tests cover:
- Garment luminance detection (dark vs. light)
- Spot-color white base generation (union of masks)
- Process-color white base generation (from image luminance)
- Choke application (erosion for screen print)
- Edge cases (empty masks, transparent images)
"""

import pytest
import numpy as np
from PIL import Image, ImageDraw
from src.white_base import WhiteBaseGenerator, create_synthetic_test_image


class TestWhiteBaseGenerator:
    """Test suite for WhiteBaseGenerator."""
    
    @pytest.fixture
    def generator(self):
        """Create a WhiteBaseGenerator instance."""
        return WhiteBaseGenerator(dpi=300)
    
    # ------------------------------------------------------------------
    # Test: needs_white_base
    # ------------------------------------------------------------------
    
    def test_dark_garment_needs_white_base(self, generator):
        """Dark garments should need white base."""
        assert generator.needs_white_base("#1A1A1A") is True
        assert generator.needs_white_base("#000000") is True
        assert generator.needs_white_base("#2D2D2D") is True
    
    def test_medium_garment_no_white_base(self, generator):
        """Medium gray garments should not need white base."""
        assert generator.needs_white_base("#808080") is False
    
    def test_light_garment_no_white_base(self, generator):
        """Light/white garments should not need white base."""
        assert generator.needs_white_base("#FFFFFF") is False
        assert generator.needs_white_base("#F0F0F0") is False
        assert generator.needs_white_base("#FF0000") is False  # Red
    
    def test_short_hex_format(self, generator):
        """Handle 3-character hex codes."""
        assert generator.needs_white_base("#000") is True
        assert generator.needs_white_base("#FFF") is False
    
    # ------------------------------------------------------------------
    # Test: generate_white_base_spot
    # ------------------------------------------------------------------
    
    def test_union_of_two_non_overlapping_masks(self, generator):
        """Union of two separate masks should cover both areas."""
        mask1 = np.zeros((100, 100), dtype=np.uint8)
        mask1[10:40, 10:40] = 255  # Top-left square
        
        mask2 = np.zeros((100, 100), dtype=np.uint8)
        mask2[60:90, 60:90] = 255  # Bottom-right square
        
        result = generator.generate_white_base_spot([mask1, mask2])
        
        # Both squares should be in the union
        assert result[25, 25] == 255
        assert result[75, 75] == 255
        # Center should be empty
        assert result[50, 50] == 0
    
    def test_union_of_overlapping_masks(self, generator):
        """Overlapping masks should not double-count."""
        mask1 = np.zeros((100, 100), dtype=np.uint8)
        mask1[20:60, 20:60] = 255  # 40x40 square
        
        mask2 = np.zeros((100, 100), dtype=np.uint8)
        mask2[40:80, 40:80] = 255  # 40x40 square overlapping by 20x20
        
        result = generator.generate_white_base_spot([mask1, mask2])
        
        # Union area = 1600 + 1600 - 400 = 2800
        union_area = np.sum(result > 127)
        assert union_area == 2800
    
    def test_empty_masks_list(self, generator):
        """Empty mask list should return empty array."""
        result = generator.generate_white_base_spot([])
        assert result.shape == (0, 0)
    
    def test_single_mask(self, generator):
        """Single mask should return identical mask."""
        mask = np.zeros((50, 50), dtype=np.uint8)
        mask[10:40, 10:40] = 255
        
        result = generator.generate_white_base_spot([mask])
        
        assert np.array_equal(result, mask)
    
    def test_partial_intensity_masks(self, generator):
        """Masks with values below 127 should be treated as absent."""
        mask1 = np.zeros((50, 50), dtype=np.uint8)
        mask1[10:40, 10:40] = 100  # Below threshold
        
        mask2 = np.zeros((50, 50), dtype=np.uint8)
        mask2[10:40, 10:40] = 200  # Above threshold
        
        result = generator.generate_white_base_spot([mask1, mask2])
        
        # Only mask2 should contribute, normalized to 255
        expected = np.zeros((50, 50), dtype=np.uint8)
        expected[10:40, 10:40] = 255
        assert np.array_equal(result, expected)
    
    # ------------------------------------------------------------------
    # Test: generate_white_base_with_choke
    # ------------------------------------------------------------------
    
    def test_choke_shrinks_mask(self, generator):
        """Choke should shrink the mask."""
        mask = np.zeros((100, 100), dtype=np.uint8)
        mask[20:80, 20:80] = 255  # 60x60 square
        
        original_area = np.sum(mask > 127)
        choked = generator.generate_white_base_with_choke(mask, choke_px=2)
        choked_area = np.sum(choked > 127)
        
        # Choked area should be smaller
        assert choked_area < original_area
        # But not empty
        assert choked_area > 0
    
    def test_choke_zero_pixels(self, generator):
        """Zero choke should not change mask."""
        mask = np.zeros((50, 50), dtype=np.uint8)
        mask[10:40, 10:40] = 255
        
        choked = generator.generate_white_base_with_choke(mask, choke_px=0)
        
        assert np.array_equal(choked, mask)
    
    def test_choke_on_small_mask(self, generator):
        """Choke on very small mask should not vanish entirely."""
        mask = np.zeros((20, 20), dtype=np.uint8)
        mask[5:15, 5:15] = 255  # 10x10 square
        
        choked = generator.generate_white_base_with_choke(mask, choke_px=2)
        
        # Should still have some area (10x10 minus 2px border = 6x6)
        assert np.sum(choked > 127) == 36
    
    def test_choke_creates_smooth_edges(self, generator):
        """Choke with elliptical kernel should produce smooth edges."""
        mask = np.zeros((100, 100), dtype=np.uint8)
        # Create circle
        import cv2
        cv2.circle(mask, (50, 50), 30, 255, -1)
        
        choked = generator.generate_white_base_with_choke(mask, choke_px=2)
        
        # Choked circle should still be roughly circular
        # Check that it's symmetric
        assert np.sum(choked[:, :50]) == pytest.approx(np.sum(choked[:, 50:]), rel=0.05)
    
    # ------------------------------------------------------------------
    # Test: generate_white_base_process
    # ------------------------------------------------------------------
    
    def test_process_mode_detects_dark_areas(self, generator):
        """DTG white base should target dark/opaque image areas."""
        # Create image: dark gray square on transparent background
        img = np.zeros((100, 100, 4), dtype=np.uint8)
        img[25:75, 25:75] = [50, 50, 50, 255]  # Dark gray, opaque
        
        result = generator.generate_white_base_process(img)
        
        # Should have white base where dark gray square is
        assert np.sum(result > 127) == 2500  # 50x50
    
    def test_process_mode_ignores_transparent(self, generator):
        """DTG white base should ignore fully transparent pixels."""
        img = np.zeros((100, 100, 4), dtype=np.uint8)
        # All transparent (alpha=0)
        
        result = generator.generate_white_base_process(img)
        
        # Should be empty
        assert np.sum(result > 127) == 0
    
    def test_process_mode_ignores_bright_areas(self, generator):
        """DTG white base should not target bright areas."""
        # Bright white square on transparent
        img = np.zeros((100, 100, 4), dtype=np.uint8)
        img[25:75, 25:75] = [255, 255, 255, 255]  # White, opaque
        
        result = generator.generate_white_base_process(img)
        
        # White areas don't need white base
        assert np.sum(result > 127) == 0
    
    def test_process_mode_rgb_input(self, generator):
        """Should handle RGB input (no alpha channel)."""
        # RGB image: dark area
        img = np.zeros((50, 50, 3), dtype=np.uint8)
        img[10:40, 10:40] = [50, 50, 50]  # Dark gray
        
        result = generator.generate_white_base_process(img)
        
        # All pixels are "opaque" in RGB, dark ones need white base
        # But since background is also dark (black), everything gets white base
        assert np.sum(result > 127) > 0
    
    def test_process_mode_empty_image(self, generator):
        """Empty image should return empty mask."""
        img = np.zeros((10, 10, 4), dtype=np.uint8)
        
        result = generator.generate_white_base_process(img)
        
        assert np.sum(result > 127) == 0
    
    # ------------------------------------------------------------------
    # Test: apply_white_base_choke
    # ------------------------------------------------------------------
    
    def test_spot_mode_applies_choke(self, generator):
        """Spot mode should apply choke and return metadata."""
        mask = np.zeros((100, 100), dtype=np.uint8)
        mask[20:80, 20:80] = 255
        
        result, meta = generator.apply_white_base_choke(
            mask, choke_px=2, color_mode="spot"
        )
        
        assert meta["choke_applied"] is True
        assert meta["choke_px"] == 2
        assert meta["original_area"] == 3600
        assert meta["choked_area"] < 3600
        assert "area_reduction" in meta
    
    def test_process_mode_skips_choke(self, generator):
        """Process mode should skip choke."""
        mask = np.zeros((100, 100), dtype=np.uint8)
        mask[20:80, 20:80] = 255
        
        result, meta = generator.apply_white_base_choke(
            mask, choke_px=2, color_mode="process"
        )
        
        assert meta["choke_applied"] is False
        assert meta["choke_px"] == 0
        assert np.array_equal(result, mask)
    
    # ------------------------------------------------------------------
    # Test: Helper methods
    # ------------------------------------------------------------------
    
    def test_hex_to_rgb(self, generator):
        """Hex to RGB conversion."""
        assert generator._hex_to_rgb("#FF0000") == (255, 0, 0)
        assert generator._hex_to_rgb("#00FF00") == (0, 255, 0)
        assert generator._hex_to_rgb("#0000FF") == (0, 0, 255)
        assert generator._hex_to_rgb("#123456") == (18, 52, 86)
    
    def test_calculate_luminance(self, generator):
        """Luminance calculation."""
        # Black = 0
        assert generator._calculate_luminance((0, 0, 0)) == 0.0
        # White = 1
        assert generator._calculate_luminance((255, 255, 255)) == 1.0
        # Red
        lum_red = generator._calculate_luminance((255, 0, 0))
        assert 0.2 < lum_red < 0.3  # ~0.2126
    
    def test_luminance_per_pixel(self, generator):
        """Per-pixel luminance for arrays."""
        rgb = np.array([
            [[255, 0, 0], [0, 255, 0]],
            [[0, 0, 255], [255, 255, 255]]
        ], dtype=np.uint8)
        
        lum = generator._calculate_luminance_per_pixel(rgb)
        
        assert lum.shape == (2, 2)
        assert lum[0, 0] == pytest.approx(0.2126, abs=0.01)
        assert lum[1, 1] == pytest.approx(1.0, abs=0.01)


class TestSyntheticImageCreation:
    """Test synthetic image helper."""
    
    def test_create_circle_image(self):
        """Circle test image should have red circle on black."""
        img = create_synthetic_test_image((100, 100), "circle")
        
        assert img.shape == (100, 100, 4)
        # Center should be red
        assert img[50, 50, 0] == 255  # R
        assert img[50, 50, 1] == 0    # G
        assert img[50, 50, 2] == 0    # B
        # Corner should be black
        assert img[10, 10, 0] == 0
    
    def test_create_rectangle_image(self):
        """Rectangle test image should have red rectangle."""
        img = create_synthetic_test_image((100, 100), "rectangle")
        
        assert img.shape == (100, 100, 4)
        # Center should be red
        assert img[50, 50, 0] == 255
    
    def test_create_star_image(self):
        """Star test image should have red star."""
        img = create_synthetic_test_image((100, 100), "star")
        
        assert img.shape == (100, 100, 4)
        # Center should be red
        assert img[50, 50, 0] == 255


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
