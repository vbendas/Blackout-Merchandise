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

from src.color_clustering import ColorClusteringEngine, ColorCluster
from src.color_matching import ColorMatchingEngine
from src.garment_filter import GarmentColorFilter, FilteredColor
from src.layer_separator import LayerSeparator
from src.halftone_layers import HalftoneLayerProcessor


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
        
        self.halftone_processor = HalftoneLayerProcessor(
            output_resolutions=self.config.output_resolutions or [72, 300]
        )
    
    def separate(
        self,
        image_path: str,
        garment_color: Optional[str] = None,
        output_dir: str = "./output"
    ) -> SeparationResult:
        """
        Perform complete color separation.
        
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
        print(f"Spot Color Separation Pipeline")
        print(f"{'='*60}")
        print(f"Input: {image_path}")
        print(f"Garment: {garment}")
        print(f"Max colors: {self.config.max_colors}")
        
        try:
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
            
            print(f"\n[4/5] Creating separation layers...")
            layer_result = self.layer_separator.create_all_layers(
                image_path,
                filtered_colors,
                str(output_path / "separations")
            )
            
            print(f"   Created {layer_result['total_layers']} layers")
            
            halftone_result = None
            if self.config.include_halftone:
                print(f"\n[5/5] Applying halftone processing...")
                halftone_result = self.halftone_processor.process_all_layers(
                    layer_result["layers"],
                    str(output_path / "halftone"),
                    color_categories
                )
                print(f"   Processed {halftone_result['total_layers']} layers")
            else:
                print(f"\n[5/5] Skipping halftone (disabled)")
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            metadata = {
                "input_image": image_path,
                "garment_color": garment,
                "processing_time_seconds": round(duration, 2),
                "timestamp": end_time.isoformat(),
                "config": asdict(self.config),
                "filter_metadata": filter_metadata,
                "layer_result": layer_result,
                "halftone_result": halftone_result
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
                metadata=metadata,
                errors=errors
            )
            
        except Exception as e:
            errors.append(str(e))
            print(f"\nERROR: {e}")
            
            return SeparationResult(
                success=False,
                original_colors=[],
                filtered_colors=[],
                kept_colors=0,
                garment_reveal_coverage=0,
                pantone_mappings=[],
                separation_layers=[],
                halftone_layers=None,
                metadata={},
                errors=errors
            )
    
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
        print("Usage: python spot_color_separator.py <image_path> [garment_color]")
        print("Example: python spot_color_separator.py design.png #1A1A1A")
        sys.exit(1)
    
    image_path = sys.argv[1]
    garment_color = sys.argv[2] if len(sys.argv) > 2 else "#1A1A1A"
    
    config = SeparationConfig(
        max_colors=6,
        garment_color=garment_color,
        include_halftone=True
    )
    
    separator = SpotColorSeparator(config)
    
    result = separator.separate(
        image_path=image_path,
        garment_color=garment_color,
        output_dir="./color_separation_output"
    )
    
    print(f"\n\nSUMMARY")
    print("=" * 60)
    print(f"Success: {result.success}")
    print(f"Original colors: {len(result.original_colors)}")
    print(f"Kept colors: {result.kept_colors}")
    print(f"Garment reveal: {result.garment_reveal_coverage}%")
    print(f"Separation layers: {len(result.separation_layers)}")
    print(f"Errors: {len(result.errors)}")
    
    if result.errors:
        print("\nErrors:")
        for error in result.errors:
            print(f"  - {error}")


if __name__ == "__main__":
    main()
