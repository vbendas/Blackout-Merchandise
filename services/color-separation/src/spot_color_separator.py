"""
Spot Color Separator - Main Orchestrator

Ties all components together:
1. Color Clustering (extract dominant colors)
2. Pantone Mapping (map to Pantone + Magna)
3. Garment Filtering (filter colors similar to garment)
4. Layer Separation (create separation masks)
5. Halftone Processing (apply halftone to each layer)
"""

import json
from pathlib import Path
from typing import List, Dict, Optional, Union
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum

import numpy as np

from src.color_clustering import ColorClusteringEngine, ColorCluster
from src.color_matching import ColorMatchingEngine
from src.garment_filter import GarmentColorFilter, FilteredColor
from src.layer_separator import LayerSeparator
from src.halftone_layers import HalftoneLayerProcessor
from src.white_base import WhiteBaseGenerator


class PrintMethod(str, Enum):
    """Supported print methods."""
    DTG = "dtg"
    SCREEN = "screen"
    DTF = "dtf"


class ColorMode(str, Enum):
    """Color separation mode."""
    SPOT = "spot"       # Spot colors for screen printing
    PROCESS = "process"  # CMYK process for DTG/DTF


@dataclass
class SeparationConfig:
    """Configuration for color separation."""
    max_colors: int = 8
    min_coverage_threshold: float = 0.02
    similarity_threshold: float = 35.0
    garment_color: Optional[str] = None
    exclude_fluorescent: bool = False
    include_halftone: bool = True
    output_resolutions: Union[List[int], None] = None
    color_mode: ColorMode = ColorMode.SPOT
    print_method: PrintMethod = PrintMethod.SCREEN
    choke_px: int = 2
    trap_px: int = 1
    skip_white_base: bool = False
    
    def __post_init__(self):
        if self.output_resolutions is None:
            self.output_resolutions = [72, 300]


@dataclass
class SeparationResult:
    """Result of color separation process."""
    success: bool
    original_colors: List[Dict]
    filtered_colors: List[Dict]
    kept_colors: int
    garment_reveal_coverage: float
    pantone_mappings: List[Dict]
    separation_layers: List[Dict]
    halftone_layers: Optional[Dict]
    white_base_layer: Optional[Dict]
    metadata: Dict
    errors: List[str]


class SpotColorSeparator:
    """
    Main orchestrator for spot color separation.
    
    Complete pipeline:
    1. Extract dominant colors from design
    2. Map to Pantone + Magna inks
    3. Filter based on garment color
    4. Create separation layers
    5. Apply halftone processing
    """
    
    def __init__(self, config: Optional[SeparationConfig] = None):
        """
        Initialize the separator.
        
        Args:
            config: Configuration options
        """
        self.config = config or SeparationConfig()
        
        self.color_mode = self.config.color_mode
        self.print_method = self.config.print_method
        
        self.clustering_engine = ColorClusteringEngine(
            max_clusters=self.config.max_colors,
            min_coverage_threshold=self.config.min_coverage_threshold,
            similarity_threshold=30
        )
        
        self.color_matcher = ColorMatchingEngine()
        
        self.garment_filter = GarmentColorFilter(
            similarity_threshold=self.config.similarity_threshold,
            include_garment_layer=True,
            color_matcher=self.color_matcher
        )
        
        self.layer_separator = LayerSeparator(
            edge_refinement=True,
            add_registration_marks=True
        )
        
        self.white_base_generator = WhiteBaseGenerator(dpi=300)
        
        self.halftone_processor = HalftoneLayerProcessor(
            output_resolutions=self.config.output_resolutions or [72, 300],
            print_method=self.print_method,
            color_mode=self.color_mode.value  # v2.0: pass color_mode for knockout auto-detect
        )
    
    def separate(
        self,
        image_path: str,
        garment_color: Optional[str] = None,
        output_dir: str = "./output"
    ) -> SeparationResult:
        """
        Perform complete color separation.
        
        Supports two modes:
        - Spot mode: K-means → Pantone → spot color separation + choke + trapping
        - Process mode: CMYK process for DTG/DTF (no spot separation)
        
        Args:
            image_path: Path to design image
            garment_color: Hex color of garment (optional)
            output_dir: Output directory
            
        Returns:
            SeparationResult object
        """
        errors = []
        start_time = datetime.now()
        
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        garment = garment_color or self.config.garment_color or "#FFFFFF"
        
        print(f"\n{'='*60}")
        if self.color_mode == ColorMode.SPOT:
            print(f"SPOT COLOR Separation Pipeline ({self.print_method.value})")
        else:
            print(f"PROCESS COLOR Separation Pipeline ({self.print_method.value})")
        print(f"{'='*60}")
        print(f"Input: {image_path}")
        print(f"Garment: {garment}")
        print(f"Mode: {self.color_mode.value}")
        print(f"Method: {self.print_method.value}")
        
        try:
            if self.color_mode == ColorMode.SPOT:
                return self._separate_spot(
                    image_path, garment, output_path, 
                    start_time, errors
                )
            else:
                return self._separate_process(
                    image_path, garment, output_path, 
                    start_time, errors
                )
            
        except Exception as e:
            errors.append(str(e))
            print(f"\nERROR: {e}")
            import traceback
            traceback.print_exc()
            
            return SeparationResult(
                success=False,
                original_colors=[],
                filtered_colors=[],
                kept_colors=0,
                garment_reveal_coverage=0,
                pantone_mappings=[],
                separation_layers=[],
                halftone_layers=None,
                white_base_layer=None,
                metadata={},
                errors=errors
            )
    
    def _separate_spot(
        self,
        image_path: str,
        garment: str,
        output_path: Path,
        start_time: datetime,
        errors: List[str]
    ) -> SeparationResult:
        """Spot-color separation for screen printing."""
        
        print(f"\n[1/5] Extracting dominant colors...")
        clusters = self.clustering_engine.extract_colors(
            image_path, 
            self.config.max_colors
        )
        
        if not clusters:
            return SeparationResult(
                success=False,
                original_colors=[],
                filtered_colors=[],
                kept_colors=0,
                garment_reveal_coverage=0,
                pantone_mappings=[],
                separation_layers=[],
                halftone_layers=None,
                white_base_layer=None,
                metadata={},
                errors=["No colors detected in image"]
            )
        
        original_colors = [c.to_dict() for c in clusters]
        print(f"   Found {len(clusters)} color clusters")
        
        print(f"\n[2/5] Mapping to Pantone + Magna...")
        pantone_mappings = []
        color_categories = []
        
        for cluster in clusters:
            mapping = self.color_matcher.map_cluster_to_pantone(
                cluster.rgb,
                include_magna=True
            )
            pantone_mappings.append(mapping)
            
            if mapping.get("best_match"):
                color_categories.append(
                    mapping["best_match"].get("category", "neutral")
                )
            else:
                color_categories.append("neutral")
        
        print(f"   Mapped {len(pantone_mappings)} colors to Pantone")
        
        print(f"\n[3/5] Filtering based on garment color...")
        filtered_colors, filter_metadata = self.garment_filter.filter_colors(
            clusters, 
            garment
        )
        
        filtered_color_dicts = [fc.to_dict() for fc in filtered_colors]
        
        kept_count = sum(
            1 for fc in filtered_colors 
            if not fc.filtered
        )
        garment_reveal = sum(
            fc.coverage for fc in filtered_colors 
            if fc.action.value == "garment_reveal"
        )
        
        print(f"   Kept: {kept_count} colors")
        print(f"   Garment reveal: {garment_reveal*100:.1f}%")
        
        # --- White Base Generation (Spot Mode) ---
        white_base_layer = None
        if (not self.config.skip_white_base and 
            self.white_base_generator.needs_white_base(garment)):
            
            print(f"\n[3.5/5] Generating white base (spot mode)...")
            
            # Load image and create masks for kept colors
            image = self.layer_separator.load_image(image_path)
            kept_colors_list = [
                fc for fc in filtered_colors 
                if fc.action.value == "keep"
            ]
            
            if kept_colors_list:
                color_masks = []
                for fc in kept_colors_list:
                    mask = self.layer_separator.create_color_mask(
                        image, fc.rgb, tolerance=50
                    )
                    color_masks.append(mask)
                
                # Union of all spot masks
                raw_white_base = self.white_base_generator.generate_white_base_spot(
                    color_masks
                )
                
                # Apply choke for screen print
                choked_wb, wb_meta = self.white_base_generator.apply_white_base_choke(
                    raw_white_base,
                    choke_px=self.config.choke_px,
                    color_mode="spot"
                )
                
                # Save white base layer
                wb_path = output_path / "separations" / "layer_00_white_base.png"
                wb_path.parent.mkdir(parents=True, exist_ok=True)
                from PIL import Image as PILImage
                PILImage.fromarray(choked_wb, mode='L').save(wb_path)
                
                white_base_layer = {
                    "layer": 0,
                    "filename": "layer_00_white_base.png",
                    "path": str(wb_path),
                    "type": "white_base",
                    **wb_meta
                }
                
                print(f"   White base: {wb_meta['original_area']} px → {wb_meta['choked_area']} px")
        
        print(f"\n[4/5] Creating separation layers...")
        layer_result = self.layer_separator.create_all_layers(
            image_path,
            filtered_colors,
            str(output_path / "separations")
        )
        
        # Prepend white base to layer list
        if white_base_layer:
            layer_result["layers"].insert(0, white_base_layer)
            layer_result["total_layers"] += 1
        
        print(f"   Created {layer_result['total_layers']} layers")
        
        # --- Trapping (Spot Mode Only) ---
        if self.config.trap_px > 0 and self.color_mode == ColorMode.SPOT:
            print(f"\n[4.5/5] Applying color trapping ({self.config.trap_px}px)...")
            self.layer_separator.apply_trapping_to_layers(
                layer_result["layers"],
                trap_radius_px=self.config.trap_px,
                skip_white_base=True
            )
            print("   Trapping applied")
        
        halftone_result = None
        if self.config.include_halftone:
            print(f"\n[5/5] Applying halftone processing...")
            halftone_result = self.halftone_processor.process_all_layers(
                layer_result["layers"],
                str(output_path / "halftone"),
                color_categories,
                original_image_path=image_path
            )
            print(f"   Processed {halftone_result['total_layers']} layers")
        else:
            print(f"\n[5/5] Skipping halftone (disabled)")
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        metadata = {
            "input_image": image_path,
            "garment_color": garment,
            "color_mode": self.color_mode.value,
            "print_method": self.print_method.value,
            "processing_time_seconds": round(duration, 2),
            "timestamp": end_time.isoformat(),
            "config": asdict(self.config),
            "filter_metadata": filter_metadata,
            "layer_result": layer_result,
            "halftone_result": halftone_result,
            "white_base_layer": white_base_layer
        }
        
        metadata_path = output_path / "separation_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"\n{'='*60}")
        print(f"COMPLETE in {duration:.2f}s")
        print(f"{'='*60}")
        print(f"Output directory: {output_path}")
        
        return SeparationResult(
            success=True,
            original_colors=original_colors,
            filtered_colors=filtered_color_dicts,
            kept_colors=kept_count,
            garment_reveal_coverage=round(garment_reveal * 100, 2),
            pantone_mappings=pantone_mappings,
            separation_layers=layer_result["layers"],
            halftone_layers=halftone_result,
            white_base_layer=white_base_layer,
            metadata=metadata,
            errors=errors
        )
    
    def _separate_process(
        self,
        image_path: str,
        garment: str,
        output_path: Path,
        start_time: datetime,
        errors: List[str]
    ) -> SeparationResult:
        """Process-color separation for DTG/DTF."""
        
        print(f"\n[1/3] Loading image for process-color separation...")
        from PIL import Image as PILImage
        img = PILImage.open(image_path)
        if img.mode != 'RGBA':
            # Convert to RGBA for alpha handling
            img = img.convert('RGBA')
        image_array = np.array(img)
        
        print(f"   Image size: {img.size}, Mode: {img.mode}")
        
        # --- White Base Generation (Process Mode) ---
        white_base_layer = None
        if (not self.config.skip_white_base and 
            self.white_base_generator.needs_white_base(garment)):
            
            print(f"\n[2/3] Generating white base (process mode)...")
            
            raw_white_base = self.white_base_generator.generate_white_base_process(
                image_array
            )
            
            # Process mode: NO choke
            choked_wb, wb_meta = self.white_base_generator.apply_white_base_choke(
                raw_white_base,
                choke_px=self.config.choke_px,
                color_mode="process"
            )
            
            # Save white base layer
            wb_path = output_path / "separations" / "layer_00_white_base.png"
            wb_path.parent.mkdir(parents=True, exist_ok=True)
            PILImage.fromarray(choked_wb, mode='L').save(wb_path)
            
            white_base_layer = {
                "layer": 0,
                "filename": "layer_00_white_base.png",
                "path": str(wb_path),
                "type": "white_base",
                **wb_meta
            }
            
            print(f"   White base area: {wb_meta['original_area']} px")
        
        print(f"\n[3/3] Creating CMYK separation layers...")
        
        # For process mode, we create CMYK separation layers
        # This is a simplified version - in production, use proper CMYK conversion
        cmyk_layers = self._create_cmyk_layers(image_array, output_path)
        
        print(f"   Created {len(cmyk_layers)} CMYK layers")
        
        # Prepend white base if exists
        if white_base_layer:
            cmyk_layers.insert(0, white_base_layer)
        
        layer_result = {
            "layers": cmyk_layers,
            "total_layers": len(cmyk_layers),
            "output_directory": str(output_path / "separations"),
            "preview_path": str(output_path / "separations" / "combined_preview.png")
        }
        
        halftone_result = None
        if self.config.include_halftone:
            print(f"\n[3.5/3] Applying halftone processing...")
            halftone_result = self.halftone_processor.process_all_layers(
                cmyk_layers,
                str(output_path / "halftone"),
                ["neutral"] * len(cmyk_layers),
                original_image_path=image_path
            )
            print(f"   Processed {halftone_result['total_layers']} layers")
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        metadata = {
            "input_image": image_path,
            "garment_color": garment,
            "color_mode": self.color_mode.value,
            "print_method": self.print_method.value,
            "processing_time_seconds": round(duration, 2),
            "timestamp": end_time.isoformat(),
            "config": asdict(self.config),
            "layer_result": layer_result,
            "halftone_result": halftone_result,
            "white_base_layer": white_base_layer
        }
        
        metadata_path = output_path / "separation_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"\n{'='*60}")
        print(f"COMPLETE in {duration:.2f}s")
        print(f"{'='*60}")
        print(f"Output directory: {output_path}")
        
        return SeparationResult(
            success=True,
            original_colors=[],
            filtered_colors=[],
            kept_colors=0,
            garment_reveal_coverage=0,
            pantone_mappings=[],
            separation_layers=cmyk_layers,
            halftone_layers=halftone_result,
            white_base_layer=white_base_layer,
            metadata=metadata,
            errors=errors
        )
    
    def _create_cmyk_layers(
        self,
        image_array: np.ndarray,
        output_path: Path
    ) -> List[Dict]:
        """
        Create simplified CMYK separation layers for DTG/DTF.
        
        Note: This is a basic implementation. In production, use proper
        ICC profile-based CMYK conversion for accurate color reproduction.
        """
        from PIL import Image as PILImage
        
        # Extract RGB channels
        if image_array.shape[2] == 4:
            rgb = image_array[:, :, :3]
            alpha = image_array[:, :, 3]
        else:
            rgb = image_array
            alpha = np.ones(rgb.shape[:2], dtype=np.uint8) * 255
        
        # Simple CMYK conversion (inverted RGB)
        r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
        
        # Key (black)
        k = 255 - np.maximum.reduce([r, g, b])
        k = (k * (alpha / 255)).astype(np.uint8)
        
        # C, M, Y
        c = ((255 - r) * (alpha / 255)).astype(np.uint8)
        m = ((255 - g) * (alpha / 255)).astype(np.uint8)
        y = ((255 - b) * (alpha / 255)).astype(np.uint8)
        
        layers = []
        channels = [
            ("c", c, "Cyan"),
            ("m", m, "Magenta"),
            ("y", y, "Yellow"),
            ("k", k, "Black")
        ]
        
        for i, (code, data, name) in enumerate(channels):
            layer_filename = f"layer_{i+1:02d}_{code}_{name.lower()}.png"
            layer_path = output_path / "separations" / layer_filename
            
            PILImage.fromarray(data, mode='L').save(layer_path)
            
            layers.append({
                "layer": i + 1,
                "filename": layer_filename,
                "path": str(layer_path),
                "channel": name,
                "type": "cmyk"
            })
        
        return layers
    
    def separate_batch(
        self,
        image_paths: List[str],
        garment_color: Optional[str] = None,
        output_base_dir: str = "./output"
    ) -> List[SeparationResult]:
        """
        Process multiple images.
        
        Args:
            image_paths: List of image paths
            garment_color: Garment color (applied to all)
            output_base_dir: Base output directory
            
        Returns:
            List of SeparationResult objects
        """
        results = []
        
        for i, image_path in enumerate(image_paths):
            print(f"\n\nProcessing image {i + 1}/{len(image_paths)}")
            print("=" * 60)
            
            image_name = Path(image_path).stem
            output_dir = Path(output_base_dir) / image_name
            
            result = self.separate(
                image_path=image_path,
                garment_color=garment_color,
                output_dir=str(output_dir)
            )
            
            results.append(result)
        
        return results


def main():
    """Test the complete pipeline."""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python spot_color_separator.py <image_path> [garment_color] [mode]")
        print("Example: python spot_color_separator.py design.png #1A1A1A spot")
        print("         python spot_color_separator.py design.png #1A1A1A process")
        sys.exit(1)
    
    image_path = sys.argv[1]
    garment_color = sys.argv[2] if len(sys.argv) > 2 else "#1A1A1A"
    mode = sys.argv[3] if len(sys.argv) > 3 else "spot"
    
    color_mode = ColorMode.SPOT if mode == "spot" else ColorMode.PROCESS
    print_method = PrintMethod.SCREEN if mode == "spot" else PrintMethod.DTG
    
    config = SeparationConfig(
        max_colors=6,
        garment_color=garment_color,
        include_halftone=True,
        color_mode=color_mode,
        print_method=print_method
    )
    
    separator = SpotColorSeparator(config)
    
    result = separator.separate(
        image_path=image_path,
        garment_color=garment_color,
        output_dir=f"./color_separation_output_{mode}"
    )
    
    print(f"\n\nSUMMARY")
    print("=" * 60)
    print(f"Success: {result.success}")
    print(f"Mode: {mode}")
    print(f"Method: {print_method.value}")
    print(f"Original colors: {len(result.original_colors)}")
    print(f"Kept colors: {result.kept_colors}")
    print(f"Garment reveal: {result.garment_reveal_coverage}%")
    print(f"Separation layers: {len(result.separation_layers)}")
    print(f"White base: {result.white_base_layer is not None}")
    print(f"Errors: {len(result.errors)}")
    
    if result.errors:
        print("\nErrors:")
        for error in result.errors:
            print(f"  - {error}")


if __name__ == "__main__":
    main()
