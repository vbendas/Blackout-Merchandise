"""
Halftone Generator
Creates halftone dot patterns for screen printing simulation
"""

import math

import cv2
import numpy as np


class HalftoneGenerator:
    """
    Generates halftone patterns using mathematical dot placement.
    Uses moire-prevention angles for multi-color printing.
    """

    # Standard screen printing angles for moire prevention
    # These are the industry-standard angles for CMYK + additional colors
    HALFTONE_ANGLES = {
        0: 105.0,  # First color (Cyan position)
        1: 75.0,  # Second color (Magenta position)
        2: 90.0,  # Third color (Yellow position)
        3: 15.0,  # Fourth color (Black position)
        4: 45.0,  # Fifth color
        5: 0.0,  # Sixth color
        6: 30.0,  # Seventh color
        7: 60.0,  # Eighth color
    }

    def generate_halftone(
        self, mask: np.ndarray, lpi: int = 55, angle_index: int = 0, dpi: int = 300
    ) -> np.ndarray:
        """
        Generate halftone pattern from a binary mask.

        Args:
            mask: Binary mask (0 or 255) indicating where color should appear
            lpi: Lines per inch (dot frequency)
            angle_index: Index into HALFTONE_ANGLES for moire prevention
            dpi: Output resolution in dots per inch

        Returns:
            Binary halftoned image (0 or 255)
        """
        height, width = mask.shape

        # Calculate dot spacing in pixels
        dot_spacing = dpi / lpi

        # Get angle for this color
        angle = self.HALFTONE_ANGLES.get(angle_index % 8, 45.0)
        angle_rad = math.radians(angle)

        # Create output image
        halftone = np.zeros((height, width), dtype=np.uint8)

        # Calculate rotation matrix components
        cos_a = math.cos(angle_rad)
        sin_a = math.sin(angle_rad)

        # Generate halftone dots
        for y in range(height):
            for x in range(width):
                # Skip if mask is 0 (no color here)
                if mask[y, x] == 0:
                    continue

                # Rotate coordinates to align with halftone angle
                rx = x * cos_a + y * sin_a
                ry = -x * sin_a + y * cos_a

                # Calculate dot center position
                cx = round(rx / dot_spacing) * dot_spacing
                cy = round(ry / dot_spacing) * dot_spacing

                # Calculate distance from dot center
                dx = rx - cx
                dy = ry - cy
                distance = math.sqrt(dx * dx + dy * dy)

                # Dot radius varies with mask intensity (simplified: mask is binary)
                # For binary mask, use fixed dot size
                dot_radius = dot_spacing * 0.4  # 40% of spacing

                # Draw dot if within radius
                if distance <= dot_radius:
                    halftone[y, x] = 255

        return halftone

    def generate_halftone_fast(
        self, mask: np.ndarray, lpi: int = 55, angle_index: int = 0, dpi: int = 300
    ) -> np.ndarray:
        """
        Faster halftone generation using vectorized operations.
        """
        height, width = mask.shape
        dot_spacing = dpi / lpi
        angle = self.HALFTONE_ANGLES.get(angle_index % 8, 45.0)
        angle_rad = math.radians(angle)

        # Create coordinate grids
        y_coords, x_coords = np.mgrid[0:height, 0:width]

        # Rotate coordinates
        rx = x_coords * math.cos(angle_rad) + y_coords * math.sin(angle_rad)
        ry = -x_coords * math.sin(angle_rad) + y_coords * math.cos(angle_rad)

        # Calculate distance to nearest dot center
        cx = np.round(rx / dot_spacing) * dot_spacing
        cy = np.round(ry / dot_spacing) * dot_spacing
        distance = np.sqrt((rx - cx) ** 2 + (ry - cy) ** 2)

        # Create halftone pattern
        dot_radius = dot_spacing * 0.4
        halftone = np.where((distance <= dot_radius) & (mask > 0), 255, 0).astype(
            np.uint8
        )

        return halftone
