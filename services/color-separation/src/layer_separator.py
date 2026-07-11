"""
Layer Separation

Creates grayscale separation masks for each color cluster.
"""

import numpy as np
from PIL import Image, ImageDraw
from typing import List, Dict, Tuple, Optional
from pathlib import Path
import json

from src.color_clustering import ColorCluster
from src.garment_filter import FilteredColor, FilterAction


class LayerSeparator:
    """
    Creates separation layers (grayscale masks) for each color.
    
    Features:
    - Grayscale mask generation per color cluster
    - Edge refinement for clean boundaries
    - Registration marks for screen alignment
    - Multiple output formats (PNG, TIFF)
    """
    
    def __init__(
        self,
        edge_refinement: bool = True,
        edge_threshold: int = 30,
        add_registration_marks: bool = True,
        mark_size: int = 20,
        mark_color: int = 0
    ):
        """
        Initialize the layer separator.
        
        Args:
            edge_refinement: Apply edge cleanup to masks
            edge_threshold: Threshold for edge detection
            add_registration_marks: Add registration marks to layers
            mark_size: Size of registration marks in pixels
            mark_color: Color value for marks (0=black, 255=white)
        """
        self.edge_refinement = edge_refinement
        self.edge_threshold = edge_threshold
        self.add_registration_marks = add_registration_marks
        self.mark_size = mark_size
        self.mark_color = mark_color
    
    def load_image(self, image_path: str) -> np.ndarray:
        """Load image as numpy array."""
        img = Image.open(image_path)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        return np.array(img)
    
    def color_distance(
        self, 
        rgb1: Tuple[int, int, int], 
        rgb2: Tuple[int, int, int]
    ) -> float:
        """Calculate Euclidean distance between two RGB colors."""
        return np.sqrt(sum((a - b) ** 2 for a, b in zip(rgb1, rgb2)))
    
    def create_color_mask(
        self,
        image: np.ndarray,
        target_color: Tuple[int, int, int],
        tolerance: int = 50
    ) -> np.ndarray:
        """
        Create binary mask for a specific color.
        
        Args:
            image: RGB image array
            target_color: Target RGB color
            tolerance: Color matching tolerance
            
        Returns:
            Binary mask (255 = match, 0 = no match)
        """
        pixels_2d = image.reshape(-1, 3)
        
        distances = np.sqrt(
            np.sum((pixels_2d - np.array(target_color)) ** 2, axis=1)
        )
        
        mask_flat = (distances <= tolerance).astype(np.uint8) * 255
        
        return mask_flat.reshape(image.shape[:2])
    
    def refine_edges(self, mask: np.ndarray) -> np.ndarray:
        """
        Refine mask edges using morphological operations.
        
        Args:
            mask: Binary mask
            
        Returns:
            Refined mask
        """
        from scipy import ndimage
        
        mask_float = mask.astype(float) / 255.0
        
        opened = ndimage.binary_opening(mask_float, iterations=1)
        closed = ndimage.binary_closing(opened, iterations=1)
        
        refined = ndimage.binary_fill_holes(closed)
        
        return (refined * 255).astype(np.uint8)
    
    def add_registration_marks_layer(
        self,
        mask: np.ndarray,
        layer_index: int,
        total_layers: int
    ) -> np.ndarray:
        """
        Add registration marks to the layer.
        
        Args:
            mask: Binary mask
            layer_index: Current layer index (0-based)
            total_layers: Total number of layers
            
        Returns:
            Mask with registration marks
        """
        img = Image.fromarray(mask)
        draw = ImageDraw.Draw(img)
        
        h, w = mask.shape
        
        mark_positions = [
            (10, 10),
            (w - self.mark_size - 10, 10),
            (10, h - self.mark_size - 10),
            (w - self.mark_size - 10, h - self.mark_size - 10),
        ]
        
        circle_positions = [
            (10 + self.mark_size // 2, 10 + self.mark_size // 2),
            (w - self.mark_size // 2 - 10, 10 + self.mark_size // 2),
            (10 + self.mark_size // 2, h - self.mark_size // 2 - 10),
            (w - self.mark_size // 2 - 10, h - self.mark_size // 2 - 10),
        ]
        
        for i, pos in enumerate(mark_positions):
            color = 255 if (i == layer_index) else self.mark_color
            draw.rectangle(
                [pos[0], pos[1], pos[0] + self.mark_size, pos[1] + self.mark_size],
                outline=color,
                width=2
            )
        
        for i, pos in enumerate(circle_positions):
            color = 255 if (i == layer_index) else self.mark_color
            radius = 4 if (i == layer_index) else 2
            draw.ellipse(
                [pos[0] - radius, pos[1] - radius, pos[0] + radius, pos[1] + radius],
                fill=color
            )
        
        if total_layers > 1:
            layer_num_pos = (w // 2 - 10, h - self.mark_size - 25)
            draw.text(layer_num_pos, f"L{layer_index + 1}", fill=255)
        
        return np.array(img)
    
    def create_layer_for_cluster(
        self,
        image: np.ndarray,
        cluster: ColorCluster,
        tolerance: int = 50
    ) -> np.ndarray:
        """
        Create separation layer for a single color cluster.
        
        Args:
            image: Original RGB image
            cluster: ColorCluster object
            tolerance: Color matching tolerance
            
        Returns:
            Grayscale mask
        """
        mask = self.create_color_mask(
            image, 
            cluster.rgb, 
            tolerance
        )
        
        if self.edge_refinement:
            mask = self.refine_edges(mask)
        
        return mask
    
    def create_all_layers(
        self,
        image_path: str,
        filtered_colors: List[FilteredColor],
        output_dir: str,
        output_format: str = "png"
    ) -> Dict:
        """
        Create separation layers for all filtered colors.
        
        Args:
            image_path: Path to original design image
            filtered_colors: List of FilteredColor objects
            output_dir: Directory to save layers
            output_format: Output format (png, tiff, jpg)
            
        Returns:
            Dictionary with layer paths and metadata
        """
        image = self.load_image(image_path)
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        kept_colors = [
            fc for fc in filtered_colors 
            if fc.action == FilterAction.KEEP
        ]
        
        layers = []
        
        for i, fc in enumerate(kept_colors):
            mask = self.create_layer_for_cluster(
                image,
                fc.original_cluster,
                tolerance=50
            )
            
            if self.add_registration_marks:
                mask = self.add_registration_marks_layer(
                    mask,
                    i,
                    len(kept_colors)
                )
            
            layer_filename = f"layer_{i+1:02d}_{fc.hex.replace('#', '')}.png"
            layer_path = output_path / layer_filename
            
            layer_img = Image.fromarray(mask, mode='L')
            layer_img.save(layer_path)
            
            layers.append({
                "layer": i + 1,
                "filename": layer_filename,
                "path": str(layer_path),
                "original_color": fc.hex,
                "rgb": fc.rgb,
                "coverage": fc.coverage,
                "pantone_mapping": None
            })
        
        if any(fc.action == FilterAction.GARMENT_REVEAL for fc in filtered_colors):
            garment_mask = np.zeros(image.shape[:2], dtype=np.uint8)
            
            for fc in filtered_colors:
                if fc.action == FilterAction.GARMENT_REVEAL:
                    color_mask = self.create_color_mask(
                        image,
                        fc.original_cluster.rgb,
                        tolerance=50
                    )
                    garment_mask = np.maximum(garment_mask, color_mask)
            
            garment_filename = "layer_garment_reveal.png"
            garment_path = output_path / garment_filename
            
            garment_img = Image.fromarray(garment_mask, mode='L')
            garment_img.save(garment_path)
            
            layers.append({
                "layer": "garment",
                "filename": garment_filename,
                "path": str(garment_path),
                "type": "garment_reveal",
                "description": "Show garment color instead of printing"
            })
        
        preview_path = output_path / "combined_preview.png"
        self.create_combined_preview(image, layers, output_path, preview_path)
        
        return {
            "layers": layers,
            "total_layers": len([l for l in layers if l.get("layer") != "garment"]),
            "output_directory": str(output_path),
            "preview_path": str(preview_path)
        }
    
    def create_combined_preview(
        self,
        original_image: np.ndarray,
        layers: List[Dict],
        output_dir: Path,
        preview_path: Path
    ) -> None:
        """
        Create a combined preview showing all separations.
        
        Args:
            original_image: Original RGB image
            layers: List of layer dictionaries
            output_dir: Output directory
            preview_path: Path to save preview
        """
        n_layers = len([l for l in layers if l.get("layer") != "garment"])
        
        if n_layers == 0:
            return
        
        cols = min(n_layers, 4)
        rows = (n_layers + cols - 1) // cols
        
        thumb_w = 200
        thumb_h = 200
        
        from PIL import Image as PILImage
        
        original_thumb = PILImage.fromarray(original_image).resize((thumb_w, thumb_h))
        
        preview = PILImage.new('RGB', (thumb_w * (cols + 1), thumb_h * rows), 'white')
        
        preview.paste(original_thumb, (0, 0))
        
        for i, layer_info in enumerate(layers):
            if layer_info.get("layer") == "garment":
                continue
            
            layer_path = Path(layer_info["path"])
            if layer_path.exists():
                layer_img = PILImage.open(layer_path).resize((thumb_w, thumb_h))
                layer_rgb = PILImage.merge('RGB', [layer_img, layer_img, layer_img])
                
                col = (i + 1) % cols
                row = (i + 1) // cols
                preview.paste(layer_rgb, (col * thumb_w, row * thumb_h))
        
        preview.save(preview_path)
    
    def trap_layers(
        self,
        masks: List[np.ndarray],
        trap_radius_px: int = 1,
        skip_indices: Optional[List[int]] = None
    ) -> List[np.ndarray]:
        """
        Apply color trapping between adjacent color masks.
        
        Traps (dilates) adjacent masks by trap_radius_px where they touch
        to prevent white gaps due to screen misregistration.
        
        Args:
            masks: List of binary masks (255 = color present)
            trap_radius_px: Number of pixels to dilate (default 1)
            skip_indices: List of layer indices to skip (e.g., white base)
            
        Returns:
            List of trapped masks
        """
        if trap_radius_px <= 0:
            return masks
        
        skip_indices = set(skip_indices or [])
        trapped_masks = [m.copy() for m in masks]
        
        try:
            from scipy import ndimage
            
            for i in range(len(masks)):
                if i in skip_indices:
                    continue
                
                # Dilate this mask
                mask_bool = (masks[i] > 127).astype(bool)
                dilated = ndimage.binary_dilation(
                    mask_bool,
                    iterations=trap_radius_px
                )
                
                # Subtract areas that are clearly other colors (not just touching)
                for j in range(len(masks)):
                    if i == j or j in skip_indices:
                        continue
                    
                    other_mask = (masks[j] > 127).astype(bool)
                    # Don't trap into areas where another color is strong
                    # Only trap where colors actually touch (boundary)
                    dilated = dilated & (mask_bool | other_mask)
                
                trapped_masks[i] = (dilated * 255).astype(np.uint8)
            
            return trapped_masks
            
        except ImportError:
            print("Warning: scipy not available, skipping trapping")
            return masks
    
    def apply_trapping_to_layers(
        self,
        layers: List[Dict],
        trap_radius_px: int = 1,
        skip_white_base: bool = True
    ) -> List[Dict]:
        """
        Apply trapping to separation layers and re-save them.
        
        Args:
            layers: List of layer dictionaries from create_all_layers
            trap_radius_px: Trapping radius
            skip_white_base: Skip layer 0 if it's white base
            
        Returns:
            Updated layer list
        """
        from PIL import Image as PILImage
        
        # Build a parallel list of masks matching layer indices
        masks = []
        skip_indices = set()
        
        for i, layer in enumerate(layers):
            if layer.get("type") == "garment_reveal":
                skip_indices.add(i)
                masks.append(np.zeros((100, 100), dtype=np.uint8))  # dummy
                continue
            if skip_white_base and layer.get("type") == "white_base":
                skip_indices.add(i)
                masks.append(np.zeros((100, 100), dtype=np.uint8))  # dummy
                continue
            
            layer_path = Path(layer["path"])
            if layer_path.exists():
                mask = np.array(PILImage.open(layer_path))
                masks.append(mask)
            else:
                skip_indices.add(i)
                masks.append(np.zeros((100, 100), dtype=np.uint8))  # dummy
        
        # Apply trapping
        trapped = self.trap_layers(masks, trap_radius_px, list(skip_indices))
        
        # Save trapped masks back to their original paths
        for i, layer in enumerate(layers):
            if i in skip_indices:
                continue
            
            layer_path = Path(layer["path"])
            PILImage.fromarray(trapped[i], mode='L').save(layer_path)
        
        return layers


def main():
    """Test the layer separator."""
    print("Layer Separator - Test")
    print("=" * 60)
    
    separator = LayerSeparator(
        edge_refinement=True,
        add_registration_marks=True
    )
    
    print("LayerSeparator initialized successfully.")
    print(f"  - Edge refinement: {separator.edge_refinement}")
    print(f"  - Registration marks: {separator.add_registration_marks}")
    print("\nUsage:")
    print("  from src.layer_separator import LayerSeparator")
    print("  separator = LayerSeparator()")
    print("  result = separator.create_all_layers(")
    print("      image_path='design.png',")
    print("      filtered_colors=filtered_colors,")
    print("      output_dir='./separations/'")
    print("  )")


if __name__ == "__main__":
    main()
