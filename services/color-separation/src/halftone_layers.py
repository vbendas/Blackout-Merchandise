"""
Halftone Layers Integration

Applies halftone processing to each separation layer.
Integrates with existing halftone_processor from mockup-generator.
"""

import sys
from pathlib import Path
from typing import List, Dict, Optional
from dataclasses import dataclass
import json

import numpy as np
from PIL import Image


sys.path.insert(0, str(Path(__file__).parent.parent.parent / "mockup-generator" / "src"))

try:
    from halftone_processor import HalftoneProcessor
    HALFTONE_AVAILABLE = True
except ImportError:
    HALFTONE_AVAILABLE = False


@dataclass
class LayerHalftoneSettings:
    """Settings for halftoning a specific layer."""
    layer_index: int
    color_name: str
    lpi: int = 55
    dot_shape: str = "round"
    angle: float = 7.5
    method: str = "circular"


class HalftoneLayerProcessor:
    """
    Applies halftone processing to separation layers.
    
    Features:
    - Per-color LPI settings (finer for light colors)
    - Multiple dot shapes (round, square, elliptical)
    - Angle variation per layer (CMYK-style)
    - Dual resolution output (72 DPI web + 300 DPI print)
    """
    
    DEFAULT_LPI_BY_COLOR = {
        "white": 45,
        "yellow": 50,
        "orange": 55,
        "red": 55,
        "pink": 55,
        "purple": 55,
        "blue": 60,
        "green": 60,
        "brown": 55,
        "metallic": 50,
        "fluorescent": 45,
        "neutral": 55,
        "black": 65,
    }
    
    DEFAULT_ANGLES = [7.5, 37.5, 67.5, 82.5, 52.5, 22.5, 57.5, 77.5]
    
    def __init__(
        self,
        default_lpi: int = 55,
        default_method: str = "circular",
        output_resolutions: List[int] = None,
        color_matcher=None
    ):
        """
        Initialize the halftone processor.
        
        Args:
            default_lpi: Default lines per inch
            default_method: Default halftone method
            output_resolutions: List of output DPI values
            color_matcher: Optional color matcher for auto-LPI
        """
        self.default_lpi = default_lpi
        self.default_method = default_method
        self.output_resolutions = output_resolutions or [72, 300]
        self.color_matcher = color_matcher
        
        if HALFTONE_AVAILABLE:
            self.halftone_processor = HalftoneProcessor()
        else:
            self.halftone_processor = None
            print("Warning: HalftoneProcessor not available, using fallback")
    
    def get_lpi_for_color(self, color_category: str) -> int:
        """Get optimal LPI for a color category."""
        return self.DEFAULT_LPI_BY_COLOR.get(
            color_category.lower(), 
            self.default_lpi
        )
    
    def get_angle_for_layer(self, layer_index: int) -> float:
        """Get halftone angle for a layer (CMYK-style variation)."""
        return self.DEFAULT_ANGLES[layer_index % len(self.DEFAULT_ANGLES)]
    
    def get_settings_for_layer(
        self,
        layer_index: int,
        color_category: str = "neutral"
    ) -> LayerHalftoneSettings:
        """Get halftone settings for a layer."""
        return LayerHalftoneSettings(
            layer_index=layer_index,
            color_name=color_category,
            lpi=self.get_lpi_for_color(color_category),
            angle=self.get_angle_for_layer(layer_index),
            method=self.default_method
        )
    
    def apply_halftone_to_layer(
        self,
        layer_path: str,
        settings: LayerHalftoneSettings,
        output_dir: str,
        output_resolutions: List[int] = None
    ) -> Dict:
        """
        Apply halftone processing to a single layer.
        
        Args:
            layer_path: Path to grayscale layer
            settings: Halftone settings
            output_dir: Output directory
            output_resolutions: DPI values to output
            
        Returns:
            Dictionary with output paths
        """
        if output_resolutions is None:
            output_resolutions = self.output_resolutions
        
        layer_img = Image.open(layer_path)
        layer_array = np.array(layer_img)
        
        outputs = {}
        
        for dpi in output_resolutions:
            if self.halftone_processor:
                if dpi <= 72:
                    lpi = max(30, settings.lpi - 15)
                    method = "circular"
                else:
                    lpi = settings.lpi
                    method = settings.method
                
                halftone_result = self.halftone_processor.process_for_resolution(
                    layer_img,
                    dpi,
                    method
                )
            else:
                halftone_result = self._fallback_halftone(layer_array, dpi)
            
            dpi_dir = output_dir / f"dpi_{dpi}"
            dpi_dir.mkdir(parents=True, exist_ok=True)
            
            filename = f"halftone_layer_{settings.layer_index + 1:02d}_{dpi}dpi.png"
            output_path = dpi_dir / filename
            
            halftone_result.save(output_path)
            
            outputs[f"dpi_{dpi}"] = {
                "path": str(output_path),
                "filename": filename,
                "dpi": dpi,
                "lpi": settings.lpi if dpi > 72 else max(30, settings.lpi - 15)
            }
        
        return outputs
    
    def _fallback_halftone(self, layer_array: np.ndarray, target_dpi: int) -> Image.Image:
        """Fallback simple halftone if processor unavailable."""
        if target_dpi <= 72:
            scale = 4
        else:
            scale = 2
        
        h, w = layer_array.shape
        new_h, new_w = h // scale, w // scale
        
        small = Image.fromarray(layer_array).resize(
            (new_w, new_h), 
            Image.Resampling.NEAREST
        )
        
        result = small.resize((w, h), Image.Resampling.NEAREST)
        
        return result
    
    def process_all_layers(
        self,
        layers: List[Dict],
        output_dir: str,
        color_categories: List[str] = None
    ) -> Dict:
        """
        Process all layers with halftone.
        
        Args:
            layers: List of layer dictionaries from layer_separator
            output_dir: Output directory
            color_categories: List of color categories (optional)
            
        Returns:
            Dictionary with all processed layers
        """
        output_path = Path(output_dir)
        
        results = {
            "layers": [],
            "total_layers": 0,
            "output_directory": str(output_path)
        }
        
        if color_categories is None:
            color_categories = ["neutral"] * len(layers)
        
        for i, layer in enumerate(layers):
            if layer.get("layer") == "garment":
                continue
            
            layer_path = layer.get("path")
            if not layer_path or not Path(layer_path).exists():
                continue
            
            category = color_categories[i] if i < len(color_categories) else "neutral"
            settings = self.get_settings_for_layer(i, category)
            
            print(f"Processing layer {i + 1}: {layer.get('filename')} ({category})")
            
            outputs = self.apply_halftone_to_layer(
                layer_path,
                settings,
                output_path
            )
            
            results["layers"].append({
                "layer": i + 1,
                "original_filename": layer.get("filename"),
                "halftone_outputs": outputs,
                "settings": {
                    "lpi": settings.lpi,
                    "angle": settings.angle,
                    "dot_shape": settings.dot_shape,
                    "method": settings.method
                }
            })
            
            results["total_layers"] += 1
        
        metadata_path = output_path / "halftone_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(results, f, indent=2)
        
        results["metadata_path"] = str(metadata_path)
        
        return results


def main():
    """Test the halftone layer processor."""
    print("Halftone Layer Processor - Test")
    print("=" * 60)
    
    processor = HalftoneLayerProcessor(
        default_lpi=55,
        output_resolutions=[72, 300]
    )
    
    print("HalftoneLayerProcessor initialized")
    print(f"  - Halftone available: {HALFTONE_AVAILABLE}")
    print(f"  - Default LPI: {processor.default_lpi}")
    print(f"  - Output resolutions: {processor.output_resolutions}")
    
    print("\nDefault LPI by color:")
    for color, lpi in processor.DEFAULT_LPI_BY_COLOR.items():
        print(f"  {color}: {lpi} LPI")
    
    print("\nDefault angles:")
    for i, angle in enumerate(processor.DEFAULT_ANGLES):
        print(f"  Layer {i + 1}: {angle}°")


if __name__ == "__main__":
    main()
