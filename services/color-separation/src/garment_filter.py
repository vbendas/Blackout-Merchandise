"""
Garment Color Filtering

Filters out colors that are too similar to the garment color to avoid
unnecessary separations. Smart handling for dark-on-dark, light-on-light.
"""

import numpy as np
from PIL import Image
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from enum import Enum

from src.color_clustering import ColorCluster
from src.color_matching import ColorMatchingEngine


class FilterAction(Enum):
    """Action to take for a filtered color."""
    KEEP = "keep"
    GARMENT_REVEAL = "garment_reveal"
    REMOVE = "remove"


@dataclass
class FilteredColor:
    """Represents a color after garment filtering."""
    original_cluster: ColorCluster
    filtered: bool
    action: FilterAction
    similarity_score: float
    reason: str
    
    @property
    def rgb(self) -> Tuple[int, int, int]:
        return self.original_cluster.rgb
    
    @property
    def hex(self) -> str:
        return self.original_cluster.hex
    
    @property
    def coverage(self) -> float:
        return self.original_cluster.coverage
    
    def to_dict(self) -> Dict:
        return {
            "rgb": self.rgb,
            "hex": self.hex,
            "coverage": self.coverage,
            "filtered": self.filtered,
            "action": self.action.value,
            "similarity_score": round(self.similarity_score, 2),
            "reason": self.reason
        }


class GarmentColorFilter:
    """
    Filters colors based on similarity to garment color.
    
    Key features:
    - Configurable similarity threshold
    - Special handling for black/white garments
    - Creates "garment reveal" layer instead of printing dark-on-dark
    """
    
    def __init__(
        self,
        similarity_threshold: float = 35.0,
        luminance_threshold: float = 15.0,
        include_garment_layer: bool = True,
        color_matcher: Optional[ColorMatchingEngine] = None
    ):
        """
        Initialize the garment filter.
        
        Args:
            similarity_threshold: RGB distance below which colors are filtered
            luminance_threshold: Max luminance difference for "too similar"
            include_garment_layer: Create garment reveal layer instead of removing
            color_matcher: Optional ColorMatchingEngine for LAB-based matching
        """
        self.similarity_threshold = similarity_threshold
        self.luminance_threshold = luminance_threshold
        self.include_garment_layer = include_garment_layer
        self.color_matcher = color_matcher or ColorMatchingEngine()
    
    def hex_to_rgb(self, hex_color: str) -> Tuple[int, int, int]:
        """Convert hex string to RGB tuple."""
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    
    def rgb_to_hex(self, rgb: Tuple[int, int, int]) -> str:
        """Convert RGB tuple to hex string."""
        return '#{:02x}{:02x}{:02x}'.format(*rgb)
    
    def calculate_luminance(self, rgb: Tuple[int, int, int]) -> float:
        """Calculate relative luminance (perceived brightness)."""
        r, g, b = [x / 255.0 for x in rgb]
        r = r / 12.92 if r <= 0.03928 else ((r + 0.055) / 1.055) ** 2.4
        g = g / 12.92 if g <= 0.03928 else ((g + 0.055) / 1.055) ** 2.4
        b = b / 12.92 if b <= 0.03928 else ((b + 0.055) / 1.055) ** 2.4
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
    
    def is_dark(self, rgb: Tuple[int, int, int]) -> bool:
        """Check if color is considered dark."""
        luminance = self.calculate_luminance(rgb)
        return luminance < 0.18
    
    def is_light(self, rgb: Tuple[int, int, int]) -> bool:
        """Check if color is considered light."""
        luminance = self.calculate_luminance(rgb)
        return luminance > 0.72
    
    def is_neutral(self, rgb: Tuple[int, int, int]) -> bool:
        """Check if color is neutral (gray, black, white)."""
        r, g, b = rgb
        return max(r, g, b) - min(r, g, b) < 20
    
    def rgb_color_distance(
        self, 
        rgb1: Tuple[int, int, int], 
        rgb2: Tuple[int, int, int]
    ) -> float:
        """Calculate Euclidean distance between two RGB colors."""
        return np.sqrt(sum((a - b) ** 2 for a, b in zip(rgb1, rgb2)))
    
    def calculate_similarity(
        self, 
        color_rgb: Tuple[int, int, int], 
        garment_rgb: Tuple[int, int, int]
    ) -> float:
        """
        Calculate similarity score between color and garment.
        
        Returns a score from 0 (identical) to 100 (opposite).
        """
        rgb_distance = self.rgb_color_distance(color_rgb, garment_rgb)
        
        color_lum = self.calculate_luminance(color_rgb)
        garment_lum = self.calculate_luminance(garment_rgb)
        lum_diff = abs(color_lum - garment_lum) * 100
        
        if self.color_matcher:
            lab1 = self.color_matcher.rgb_to_lab(color_rgb)
            lab2 = self.color_matcher.rgb_to_lab(garment_rgb)
            lab_distance = self.color_matcher.ciede2000_distance(lab1, lab2)
            
            combined_score = (
                (rgb_distance / 441.0) * 50 + 
                (lab_distance / 100) * 30 +
                (lum_diff / 100) * 20
            )
            return combined_score * 100
        
        combined_score = (
            (rgb_distance / 441.0) * 60 +
            (lum_diff / 100) * 40
        )
        
        return combined_score * 100
    
    def determine_action(
        self,
        color_rgb: Tuple[int, int, int],
        garment_rgb: Tuple[int, int, int],
        similarity_score: float
    ) -> Tuple[FilterAction, str]:
        """
        Determine what action to take for a color based on garment.
        
        Args:
            color_rgb: The color to evaluate
            garment_rgb: The garment color
            similarity_score: Pre-calculated similarity score
            
        Returns:
            Tuple of (FilterAction, reason)
        """
        color_is_dark = self.is_dark(color_rgb)
        color_is_light = self.is_light(color_rgb)
        garment_is_dark = self.is_dark(garment_rgb)
        garment_is_light = self.is_light(garment_rgb)
        
        if similarity_score < self.similarity_threshold:
            if self.include_garment_layer:
                if garment_is_dark and color_is_dark:
                    return (
                        FilterAction.GARMENT_REVEAL,
                        "Dark color on dark garment - use garment reveal"
                    )
                elif garment_is_light and color_is_light:
                    return (
                        FilterAction.GARMENT_REVEAL,
                        "Light color on light garment - use garment reveal"
                    )
                else:
                    return (
                        FilterAction.GARMENT_REVEAL,
                        "Color too similar to garment"
                    )
            else:
                return (
                    FilterAction.REMOVE,
                    "Color too similar to garment"
                )
        
        if garment_is_dark and color_is_dark:
            return (
                FilterAction.GARMENT_REVEAL,
                "Dark on dark - better to reveal garment"
            )
        
        if garment_is_light and color_is_light and self.is_neutral(color_rgb):
            return (
                FilterAction.GARMENT_REVEAL,
                "Light neutral on light garment"
            )
        
        return (
            FilterAction.KEEP,
            "Color distinct from garment"
        )
    
    def filter_colors(
        self,
        clusters: List[ColorCluster],
        garment_color: str
    ) -> Tuple[List[FilteredColor], Dict]:
        """
        Filter color clusters based on garment color.
        
        Args:
            clusters: List of ColorCluster objects from clustering
            garment_color: Hex color of the garment (e.g., "#1A1A1A" for black)
            
        Returns:
            Tuple of (filtered_colors, metadata)
        """
        garment_rgb = self.hex_to_rgb(garment_color)
        
        filtered_colors = []
        garment_reveal_coverage = 0.0
        kept_colors = []
        
        for cluster in clusters:
            similarity_score = self.calculate_similarity(cluster.rgb, garment_rgb)
            
            action, reason = self.determine_action(
                cluster.rgb, 
                garment_rgb, 
                similarity_score
            )
            
            filtered = FilteredColor(
                original_cluster=cluster,
                filtered=action != FilterAction.KEEP,
                action=action,
                similarity_score=similarity_score,
                reason=reason
            )
            
            filtered_colors.append(filtered)
            
            if action == FilterAction.GARMENT_REVEAL:
                garment_reveal_coverage += cluster.coverage
            elif action == FilterAction.KEEP:
                kept_colors.append(cluster)
        
        metadata = {
            "garment_color": {
                "hex": garment_color,
                "rgb": garment_rgb,
                "is_dark": self.is_dark(garment_rgb),
                "is_light": self.is_light(garment_rgb)
            },
            "original_clusters": len(clusters),
            "kept_colors": len(kept_colors),
            "garment_reveal_coverage": round(garment_reveal_coverage * 100, 2),
            "total_coverage_kept": round(
                sum(c.coverage for c in kept_colors) * 100, 2
            ),
            "recommendation": self._get_print_recommendation(
                garment_rgb, kept_colors, garment_reveal_coverage
            )
        }
        
        return filtered_colors, metadata
    
    def _get_print_recommendation(
        self,
        garment_rgb: Tuple[int, int, int],
        kept_colors: List[ColorCluster],
        garment_reveal_coverage: float
    ) -> str:
        """Generate print recommendation based on analysis."""
        garment_is_dark = self.is_dark(garment_rgb)
        
        if garment_is_dark:
            recommendation = "Black garment: "
            if garment_reveal_coverage > 0.3:
                recommendation += (
                    "Use underbase white + colors. "
                    f"Garment reveal covers {garment_reveal_coverage*100:.0f}% "
                    "- reduces ink usage."
                )
            else:
                recommendation += "Use white underbase for vibrant colors."
        else:
            recommendation = "Light garment: "
            if garment_reveal_coverage > 0.3:
                recommendation += (
                    f"Garment reveal covers {garment_reveal_coverage*100:.0f}% "
                    "- print directly on garment."
                )
            else:
                recommendation += "Direct print - no underbase needed."
        
        if len(kept_colors) > 6:
            recommendation += f" Note: {len(kept_colors)} colors - consider reducing."
        
        return recommendation
    
    def create_garment_layer(
        self,
        filtered_colors: List[FilteredColor],
        original_image_path: str,
        output_path: str
    ) -> str:
        """
        Create a garment reveal layer showing where to show fabric.
        
        Args:
            filtered_colors: List of FilteredColor with GARMENT_REVEAL action
            original_image_path: Path to original design image
            output_path: Path to save garment layer
            
        Returns:
            Path to saved garment layer
        """
        img = Image.open(original_image_path)
        
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        pixels = np.array(img)
        
        garment_rgb_values = []
        for fc in filtered_colors:
            if fc.action == FilterAction.GARMENT_REVEAL:
                garment_rgb_values.append(fc.original_cluster.rgb)
        
        if not garment_rgb_values:
            print("No garment reveal colors to process")
            return None
        
        garment_layer = np.zeros(pixels.shape[:2], dtype=np.uint8)
        
        from src.color_clustering import ColorClusteringEngine
        engine = ColorClusteringEngine(max_clusters=len(garment_rgb_values))
        cluster_indices = engine.extract_colors_from_array(pixels)
        
        for fc in filtered_colors:
            if fc.action == FilterAction.GARMENT_REVEAL:
                target_color = fc.original_cluster.rgb
                
                for y in range(pixels.shape[0]):
                    for x in range(pixels.shape[1]):
                        pixel = tuple(pixels[y, x])
                        dist = self.rgb_color_distance(pixel, target_color)
                        if dist < 50:
                            garment_layer[y, x] = 255
        
        garment_img = Image.fromarray(garment_layer, mode='L')
        garment_img.save(output_path)
        
        return output_path


def main():
    """Test the garment color filter."""
    from src.color_clustering import ColorClusteringEngine
    
    engine = ColorClusteringEngine(max_clusters=6)
    
    print("Testing Garment Color Filter")
    print("=" * 60)
    
    test_garment = "#1A1A1A"  # Black t-shirt
    
    mock_clusters = [
        ColorCluster(rgb=(26, 26, 46), hex="#1A1A2E", coverage=0.32, pixel_count=32000, cluster_id=0),
        ColorCluster(rgb=(244, 228, 193), hex="#F4E4C1", coverage=0.25, pixel_count=25000, cluster_id=1),
        ColorCluster(rgb=(45, 90, 61), hex="#2D5A3D", coverage=0.18, pixel_count=18000, cluster_id=2),
        ColorCluster(rgb=(139, 69, 19), hex="#8B4513", coverage=0.12, pixel_count=12000, cluster_id=3),
        ColorCluster(rgb=(255, 215, 0), hex="#FFD700", coverage=0.08, pixel_count=8000, cluster_id=4),
        ColorCluster(rgb=(255, 255, 255), hex="#FFFFFF", coverage=0.05, pixel_count=5000, cluster_id=5),
    ]
    
    garment_filter = GarmentColorFilter(
        similarity_threshold=35.0,
        include_garment_layer=True
    )
    
    filtered, metadata = garment_filter.filter_colors(mock_clusters, test_garment)
    
    print(f"\nGarment Color: {test_garment}")
    print(f"Is Dark: {metadata['garment_color']['is_dark']}")
    print(f"\nOriginal Colors: {metadata['original_clusters']}")
    print(f"Kept Colors: {metadata['kept_colors']}")
    print(f"Garment Reveal Coverage: {metadata['garment_reveal_coverage']}%")
    
    print("\n" + "-" * 60)
    print("Filtered Results:")
    print("-" * 60)
    
    for fc in filtered:
        status = "KEEP" if not fc.filtered else fc.action.value.upper()
        print(f"\n{fc.hex} ({fc.rgb})")
        print(f"  Coverage: {fc.coverage*100:.1f}%")
        print(f"  Action: {status}")
        print(f"  Reason: {fc.reason}")
        print(f"  Similarity: {fc.similarity_score:.1f}")
    
    print("\n" + "=" * 60)
    print("Recommendation:")
    print("=" * 60)
    print(metadata['recommendation'])


if __name__ == "__main__":
    main()
