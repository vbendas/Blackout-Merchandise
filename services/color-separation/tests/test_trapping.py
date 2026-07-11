"""
Unit tests for Color Trapping (Screen-Only).

Tests cover:
- Trap between adjacent masks
- Skip white base layer
- Skip garment reveal layer
- No trapping when radius is 0
- No trapping in process mode (gated)
"""

import pytest
import numpy as np
from src.layer_separator import LayerSeparator


class TestColorTrapping:
    """Test suite for color trapping functionality."""
    
    @pytest.fixture
    def separator(self):
        """Create a LayerSeparator instance."""
        return LayerSeparator()
    
    def test_trap_two_touching_rectangles(self, separator):
        """Two touching rectangles should trap into each other."""
        # Two 20x20 squares touching at the edge
        mask1 = np.zeros((50, 50), dtype=np.uint8)
        mask1[10:30, 10:30] = 255  # Left square
        
        mask2 = np.zeros((50, 50), dtype=np.uint8)
        mask2[10:30, 30:50] = 255  # Right square (touches at x=30)
        
        trapped = separator.trap_layers([mask1, mask2], trap_radius_px=1)
        
        # After trapping, both should overlap at the boundary
        # Check that the boundary region has both colors
        assert trapped[0][20, 30] > 127  # mask1 trapped into mask2
        assert trapped[1][20, 29] > 127  # mask2 trapped into mask1
    
    def test_trap_skip_index(self, separator):
        """Skipped indices should not be trapped."""
        mask1 = np.zeros((50, 50), dtype=np.uint8)
        mask1[10:40, 10:40] = 255
        
        mask2 = np.zeros((50, 50), dtype=np.uint8)
        mask2[10:40, 20:50] = 255  # Overlaps with mask1
        
        # Skip index 0
        trapped = separator.trap_layers(
            [mask1, mask2], 
            trap_radius_px=1,
            skip_indices=[0]
        )
        
        # mask1 should be unchanged
        assert np.array_equal(trapped[0], mask1)
        # mask2 should be trapped
        assert not np.array_equal(trapped[1], mask2)
    
    def test_trap_zero_radius(self, separator):
        """Zero radius should return masks unchanged."""
        mask1 = np.zeros((50, 50), dtype=np.uint8)
        mask1[10:40, 10:40] = 255
        
        mask2 = np.zeros((50, 50), dtype=np.uint8)
        mask2[10:40, 30:50] = 255
        
        trapped = separator.trap_layers([mask1, mask2], trap_radius_px=0)
        
        assert np.array_equal(trapped[0], mask1)
        assert np.array_equal(trapped[1], mask2)
    
    def test_trap_no_touching(self, separator):
        """Non-touching masks should not affect each other."""
        mask1 = np.zeros((50, 50), dtype=np.uint8)
        mask1[5:15, 5:15] = 255  # Top-left
        
        mask2 = np.zeros((50, 50), dtype=np.uint8)
        mask2[35:45, 35:45] = 255  # Bottom-right (far away)
        
        trapped = separator.trap_layers([mask1, mask2], trap_radius_px=1)
        
        assert np.array_equal(trapped[0], mask1)
        assert np.array_equal(trapped[1], mask2)
    
    def test_trap_three_colors(self, separator):
        """Three colors should all trap appropriately."""
        mask1 = np.zeros((50, 50), dtype=np.uint8)
        mask1[10:30, 10:30] = 255
        
        mask2 = np.zeros((50, 50), dtype=np.uint8)
        mask2[10:30, 25:45] = 255  # Overlaps mask1 at x=25-30
        
        mask3 = np.zeros((50, 50), dtype=np.uint8)
        mask3[10:30, 40:50] = 255  # Overlaps mask2 at x=40-45
        
        trapped = separator.trap_layers([mask1, mask2, mask3], trap_radius_px=1)
        
        # mask1 and mask3 don't touch directly, shouldn't trap into each other
        assert not trapped[0][20, 42] > 127
        assert not trapped[2][20, 18] > 127
    
    def test_trap_area_increase(self, separator):
        """Trapping should increase mask area slightly."""
        mask = np.zeros((50, 50), dtype=np.uint8)
        mask[20:30, 20:30] = 255  # 10x10 square
        
        # Create adjacent mask
        mask2 = np.zeros((50, 50), dtype=np.uint8)
        mask2[20:30, 30:40] = 255  # Adjacent 10x10
        
        original_area = np.sum(mask > 127)
        trapped = separator.trap_layers([mask, mask2], trap_radius_px=1)
        trapped_area = np.sum(trapped[0] > 127)
        
        # Area should increase by ~10 pixels (the boundary)
        assert trapped_area > original_area
        assert trapped_area <= original_area + 20  # Reasonable increase


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
