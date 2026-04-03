"""
Halftone Processing Engine

Converts designs to halftone dot patterns for authentic screen print appearance.
Uses ordered dithering and error diffusion algorithms.
"""

import numpy as np
from PIL import Image
from typing import Tuple, Optional
import cv2


class HalftoneProcessor:
    """
    Processes images to create halftone effects
    
    Supports multiple algorithms:
    - Ordered dithering (Bayer matrix)
    - Error diffusion (Floyd-Steinberg)
    - Circular dot patterns
    """
    
    def __init__(self, lpi: float = 55, angle: float = 15):
        """
        Initialize halftone processor
        
        Args:
            lpi: Lines per inch (dot density)
            angle: Screen angle in degrees
        """
        self.lpi = lpi
        self.angle = angle
        self._bayer_matrix = self._create_bayer_matrix(4)
    
    def _create_bayer_matrix(self, size: int = 4) -> np.ndarray:
        """
        Create Bayer dithering matrix
        
        Args:
            size: Matrix size (2, 4, 8)
        
        Returns:
            Bayer matrix normalized to 0-1 range
        """
        if size == 2:
            matrix = np.array([[0, 2],
                              [3, 1]])
        elif size == 4:
            matrix = np.array([[0, 8, 2, 10],
                              [12, 4, 14, 6],
                              [3, 11, 1, 9],
                              [15, 7, 13, 5]])
        elif size == 8:
            # Generate 8x8 Bayer matrix
            matrix = np.zeros((8, 8), dtype=int)
            for i in range(8):
                for j in range(8):
                    matrix[i, j] = self._bayer_value(i, j, 3)
        else:
            raise ValueError(f"Unsupported Bayer matrix size: {size}")
        
        # Normalize to 0-1 range
        return matrix / (size * size - 1)
    
    def _bayer_value(self, x: int, y: int, n: int) -> int:
        """Calculate Bayer matrix value at position"""
        value = 0
        for i in range(n):
            value |= (((x >> i) & 1) ^ ((y >> i) & 1)) << (2 * i)
            value |= (((x >> i) & 1) & ((y >> i) & 1)) << (2 * i + 1)
        return value
    
    def ordered_dithering(
        self,
        image: Image.Image,
        dot_size: int = 4
    ) -> Image.Image:
        """
        Apply ordered dithering (Bayer matrix)
        
        Args:
            image: Input grayscale image
            dot_size: Size of Bayer matrix (2, 4, 8)
        
        Returns:
            Halftoned binary image
        """
        # Convert to grayscale numpy array
        img_array = np.array(image.convert('L'))
        height, width = img_array.shape
        
        # Normalize to 0-1
        img_normalized = img_array / 255.0
        
        # Create Bayer matrix
        bayer = self._create_bayer_matrix(dot_size)
        
        # Tile Bayer matrix to image size
        bayer_tiled = np.tile(bayer, (height // dot_size + 1, width // dot_size + 1))
        bayer_tiled = bayer_tiled[:height, :width]
        
        # Apply dithering
        result = (img_normalized > bayer_tiled).astype(np.uint8) * 255
        
        return Image.fromarray(result, mode='L')
    
    def floyd_steinberg(
        self,
        image: Image.Image
    ) -> Image.Image:
        """
        Apply Floyd-Steinberg error diffusion
        
        Creates smoother gradients than ordered dithering
        
        Args:
            image: Input grayscale image
        
        Returns:
            Halftoned binary image
        """
        # Convert to float array
        img_array = np.array(image.convert('L')).astype(float) / 255.0
        height, width = img_array.shape
        
        # Error diffusion
        for y in range(height):
            for x in range(width):
                old_pixel = img_array[y, x]
                new_pixel = 1.0 if old_pixel > 0.5 else 0.0
                img_array[y, x] = new_pixel
                
                error = old_pixel - new_pixel
                
                # Distribute error to neighboring pixels
                if x + 1 < width:
                    img_array[y, x + 1] += error * 7 / 16
                if y + 1 < height:
                    if x > 0:
                        img_array[y + 1, x - 1] += error * 3 / 16
                    img_array[y + 1, x] += error * 5 / 16
                    if x + 1 < width:
                        img_array[y + 1, x + 1] += error * 1 / 16
        
        # Convert back to 0-255
        result = (img_array * 255).astype(np.uint8)
        
        return Image.fromarray(result, mode='L')
    
    def circular_halftone(
        self,
        image: Image.Image,
        dot_frequency: int = 8
    ) -> Image.Image:
        """
        Create circular dot halftone pattern
        
        Simulates traditional screen printing dots
        
        Args:
            image: Input grayscale image
            dot_frequency: Distance between dot centers
        
        Returns:
            Halftoned image with circular dots
        """
        img_array = np.array(image.convert('L'))
        height, width = img_array.shape
        
        # Create output image
        result = np.zeros((height, width), dtype=np.uint8)
        
        # Generate dots
        for y in range(0, height, dot_frequency):
            for x in range(0, width, dot_frequency):
                # Get average intensity in this cell
                y_end = min(y + dot_frequency, height)
                x_end = min(x + dot_frequency, width)
                cell = img_array[y:y_end, x:x_end]
                intensity = np.mean(cell) / 255.0
                
                # Calculate dot radius based on intensity
                # Darker = larger dot
                max_radius = dot_frequency // 2 - 1
                radius = int(max_radius * (1 - intensity))
                
                if radius > 0:
                    center_x = x + dot_frequency // 2
                    center_y = y + dot_frequency // 2
                    
                    # Draw circle
                    cv2.circle(result, (center_x, center_y), radius, 255, -1)
        
        return Image.fromarray(result, mode='L')
    
    def process(
        self,
        image: Image.Image,
        method: str = "ordered",
        **kwargs
    ) -> Image.Image:
        """
        Process image with specified halftone method
        
        Args:
            image: Input image
            method: Halftone method (ordered, floyd_steinberg, circular)
            **kwargs: Method-specific parameters
        
        Returns:
            Halftoned image
        """
        if method == "ordered":
            dot_size = kwargs.get("dot_size", 4)
            return self.ordered_dithering(image, dot_size)
        elif method == "floyd_steinberg":
            return self.floyd_steinberg(image)
        elif method == "circular":
            dot_frequency = kwargs.get("dot_frequency", 8)
            return self.circular_halftone(image, dot_frequency)
        else:
            raise ValueError(f"Unknown halftone method: {method}")
    
    def process_for_resolution(
        self,
        image: Image.Image,
        target_dpi: int,
        method: str = "ordered"
    ) -> Image.Image:
        """
        Process image optimized for specific output resolution
        
        Adjusts LPI based on target DPI for optimal dot visibility
        
        Args:
            image: Input image
            target_dpi: Target output DPI (72 for web, 300 for print)
            method: Halftone method
        
        Returns:
            Halftoned image optimized for target resolution
        """
        # Adjust LPI based on target DPI
        # Web (72 DPI): Coarser dots, more visible
        # Print (300 DPI): Finer dots, smoother appearance
        if target_dpi <= 72:
            self.lpi = 45  # Coarse for web
            dot_size = 6
        elif target_dpi <= 150:
            self.lpi = 65  # Medium
            dot_size = 4
        else:
            self.lpi = 85  # Fine for print
            dot_size = 2
        
        if method == "ordered":
            return self.ordered_dithering(image, dot_size)
        elif method == "circular":
            dot_frequency = max(4, int(72 / self.lpi * 8))
            return self.circular_halftone(image, dot_frequency)
        else:
            return self.process(image, method)
    
    def process_rgb(
        self,
        image: Image.Image,
        method: str = "ordered",
        preserve_color: bool = False
    ) -> Image.Image:
        """
        Process RGB image to halftone
        
        Args:
            image: RGB input image
            method: Halftone method
            preserve_color: If True, apply halftone to each channel separately
        
        Returns:
            Halftoned RGB image
        """
        if preserve_color:
            # Process each channel separately
            r, g, b = image.split()
            
            r_halftone = self.process(r, method)
            g_halftone = self.process(g, method)
            b_halftone = self.process(b, method)
            
            return Image.merge('RGB', (r_halftone, g_halftone, b_halftone))
        else:
            # Convert to grayscale first
            gray = image.convert('L')
            halftone = self.process(gray, method)
            return halftone.convert('RGB')
    
    def create_dual_resolution(
        self,
        image: Image.Image,
        method: str = "ordered"
    ) -> Tuple[Image.Image, Image.Image]:
        """
        Create both high-res and web-res halftone versions
        
        Args:
            image: Input image
            method: Halftone method
        
        Returns:
            Tuple of (high_res, web_res) images
        """
        # Web resolution (72 DPI equivalent)
        web_res = self.process_for_resolution(image, 72, method)
        
        # Reset LPI for high-res
        original_lpi = self.lpi
        
        # High resolution (300 DPI equivalent)
        high_res = self.process_for_resolution(image, 300, method)
        
        # Restore original LPI
        self.lpi = original_lpi
        
        return high_res, web_res
