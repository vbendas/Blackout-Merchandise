"""
Preview Compositor
Combines halftoned layers into a final composite preview image
"""

from typing import List, Tuple

import numpy as np
from PIL import Image

from color_separator import SeparatedLayer


class PreviewCompositor:
    """
    Composites multiple halftoned color layers into a final preview image.
    """

    def composite_preview(
        self,
        halftoned_layers: List[Tuple[SeparatedLayer, np.ndarray]],
        preview_size: int = 800,
        background_color: str = "#FFFFFF",
    ) -> Image.Image:
        """
        Composite multiple halftoned layers into a single preview image.

        Args:
            halftoned_layers: List of (SeparatedLayer, halftoned_mask) tuples
            preview_size: Output size (width and height)
            background_color: Background color as hex string

        Returns:
            PIL Image in RGBA mode
        """
        if not halftoned_layers:
            # Return blank image if no layers
            return Image.new("RGBA", (preview_size, preview_size), background_color)

        # Get dimensions from first layer
        height, width = halftoned_layers[0][1].shape

        # Create RGBA canvas
        # Start with background color
        bg_rgb = self._hex_to_rgb(background_color)
        composite = np.full((height, width, 4), (*bg_rgb, 255), dtype=np.uint8)

        # Composite each layer (light to dark)
        for layer, halftoned in halftoned_layers:
            # Convert hex color to RGB
            rgb = self._hex_to_rgb(layer.color_hex)

            # Create RGBA layer
            layer_rgba = np.zeros((height, width, 4), dtype=np.uint8)
            layer_rgba[halftoned > 0] = (*rgb, 255)

            # Alpha composite
            composite = self._alpha_composite(composite, layer_rgba)

        # Convert to PIL Image
        composite_pil = Image.fromarray(composite, "RGBA")

        # Resize to preview size while maintaining aspect ratio
        aspect_ratio = width / height
        if aspect_ratio > 1:
            new_width = preview_size
            new_height = int(preview_size / aspect_ratio)
        else:
            new_height = preview_size
            new_width = int(preview_size * aspect_ratio)

        composite_pil = composite_pil.resize(
            (new_width, new_height), Image.Resampling.LANCZOS
        )

        return composite_pil

    def numpy_to_pil(self, array: np.ndarray) -> Image.Image:
        """Convert numpy array to PIL Image"""
        return Image.fromarray(array)

    def _hex_to_rgb(self, hex_color: str) -> Tuple[int, int, int]:
        """Convert hex color to RGB tuple"""
        hex_color = hex_color.lstrip("#")
        return (
            int(hex_color[0:2], 16),
            int(hex_color[2:4], 16),
            int(hex_color[4:6], 16),
        )

    def _alpha_composite(
        self, background: np.ndarray, foreground: np.ndarray
    ) -> np.ndarray:
        """
        Alpha composite foreground over background.
        Both should be RGBA numpy arrays.
        """
        # Normalize alpha to 0-1
        bg_alpha = background[:, :, 3] / 255.0
        fg_alpha = foreground[:, :, 3] / 255.0

        # Calculate resulting alpha
        out_alpha = fg_alpha + bg_alpha * (1 - fg_alpha)

        # Avoid division by zero
        out_alpha = np.where(out_alpha == 0, 1, out_alpha)

        # Composite each channel
        out_rgb = np.zeros_like(background[:, :, :3], dtype=np.float32)
        for i in range(3):
            out_rgb[:, :, i] = (
                foreground[:, :, i] * fg_alpha
                + background[:, :, i] * bg_alpha * (1 - fg_alpha)
            ) / out_alpha

        # Combine RGB with alpha
        result = np.zeros_like(background)
        result[:, :, :3] = out_rgb.astype(np.uint8)
        result[:, :, 3] = (out_alpha * 255).astype(np.uint8)

        return result
