"""
Color Separation Module
Uses k-means clustering for color separation (placeholder for future U-Net model)
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Optional, Tuple

import cv2
import numpy as np
from sklearn.cluster import KMeans

from pantone_lookup import find_nearest_pantone


@dataclass
class SeparatedLayer:
    """Represents a separated color layer"""

    color_hex: str
    color_name: str
    pantone: str
    mask: np.ndarray  # Binary mask (0 or 255)


class ColorSeparator(ABC):
    """Abstract base class for color separation algorithms"""

    @abstractmethod
    def separate(
        self,
        image: np.ndarray,
        max_colors: int,
        target_colors: Optional[List[str]] = None,
    ) -> List[SeparatedLayer]:
        """
        Separate image into distinct color layers.

        Args:
            image: Input image in BGR format (OpenCV default)
            max_colors: Maximum number of colors to separate
            target_colors: Optional list of target hex colors to match

        Returns:
            List of SeparatedLayer objects
        """
        pass


class KMeansColorSeparator(ColorSeparator):
    """
    K-means clustering based color separation.
    This is a placeholder implementation. Will be replaced by U-Net model.
    """

    def separate(
        self,
        image: np.ndarray,
        max_colors: int,
        target_colors: Optional[List[str]] = None,
    ) -> List[SeparatedLayer]:
        """
        Separate colors using k-means clustering in LAB color space.
        """
        # Convert to LAB color space for better perceptual clustering
        lab_image = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)

        # Reshape for clustering
        pixels = lab_image.reshape((-1, 3))
        pixels = np.float32(pixels)

        # Determine number of clusters
        # Use min of max_colors and unique color count, but at least 2
        unique_colors = len(np.unique(pixels, axis=0))
        n_clusters = min(max_colors, max(2, unique_colors // 1000))

        # K-means clustering
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = kmeans.fit_predict(pixels)

        # Reshape labels back to image shape
        labels = labels.reshape(image.shape[:2])

        # Create separated layers
        layers = []

        for i in range(n_clusters):
            # Create binary mask for this cluster
            mask = (labels == i).astype(np.uint8) * 255

            # Get cluster center color
            center_lab = kmeans.cluster_centers_[i]

            # Convert LAB to RGB for hex conversion
            center_rgb = self._lab_to_rgb(center_lab)

            # Find nearest Pantone color
            pantone_info = find_nearest_pantone(center_lab)

            # Create layer
            layer = SeparatedLayer(
                color_hex=pantone_info["hex"],
                color_name=pantone_info["name"],
                pantone=pantone_info["pantone_code"],
                mask=mask,
            )

            layers.append(layer)

        # Sort by color (light to dark for better compositing)
        layers.sort(key=lambda x: self._hex_to_luminance(x.color_hex))

        return layers

    def _lab_to_rgb(self, lab: np.ndarray) -> Tuple[int, int, int]:
        """Convert LAB color to RGB"""
        lab_uint8 = np.uint8([[lab]])
        rgb = cv2.cvtColor(lab_uint8, cv2.COLOR_LAB2RGB)
        return tuple(rgb[0][0])

    def _hex_to_luminance(self, hex_color: str) -> float:
        """Calculate luminance from hex color for sorting"""
        hex_color = hex_color.lstrip("#")
        r = int(hex_color[0:2], 16) / 255.0
        g = int(hex_color[2:4], 16) / 255.0
        b = int(hex_color[4:6], 16) / 255.0

        # Perceptual luminance formula
        return 0.299 * r + 0.587 * g + 0.114 * b


class UNetColorSeparator(ColorSeparator):
    """
    Future: Attention U-Net based color separation.

    Expected model input: RGB image tensor [B, 3, H, W]
    Expected model output: Per-channel probability maps [B, K, H, W]
    where K = number of ink colors

    Model path: configured via UNET_MODEL_PATH env var
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model = None
        self.model_path = model_path

        if model_path:
            self._load_model()

    def _load_model(self):
        """Load the trained U-Net model"""
        # TODO: Implement model loading when U-Net is trained
        raise NotImplementedError(
            "U-Net model loading not yet implemented. "
            "Awaiting trained model from Expert's dataset. "
            "Use KMeansColorSeparator for now."
        )

    def separate(
        self,
        image: np.ndarray,
        max_colors: int,
        target_colors: Optional[List[str]] = None,
    ) -> List[SeparatedLayer]:
        """Separate colors using U-Net model"""
        raise NotImplementedError(
            "U-Net separator requires trained model. Use KMeansColorSeparator for now."
        )
