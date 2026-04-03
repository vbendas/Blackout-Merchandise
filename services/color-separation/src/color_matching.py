"""
Color Matching & Pantone Mapping

Implements Delta E color distance algorithms and Pantone color mapping.
"""

import json
import math
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from pathlib import Path


@dataclass
class PantoneColor:
    """Represents a Pantone color with RGB values."""
    name: str
    pantone: str
    hex: str
    rgb: Tuple[int, int, int]
    category: str
    magna_base: str
    magna_pigment: Optional[str]
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'PantoneColor':
        return cls(
            name=data['name'],
            pantone=data['pantone'],
            hex=data['hex'],
            rgb=tuple(data['rgb']),
            category=data['category'],
            magna_base=data.get('magna_base', 'HB Opaque'),
            magna_pigment=data.get('magna_pigment')
        )


@dataclass
class ColorMatch:
    """Represents a matched Pantone color."""
    pantone_color: PantoneColor
    distance: float
    distance_cie76: float
    distance_cie94: float
    distance_ciede2000: float
    
    def to_dict(self) -> Dict:
        return {
            "pantone": self.pantone_color.pantone,
            "name": self.pantone_color.name,
            "hex": self.pantone_color.hex,
            "rgb": self.pantone_color.rgb,
            "category": self.pantone_color.category,
            "magna_base": self.pantone_color.magna_base,
            "magna_pigment": self.pantone_color.magna_pigment,
            "distance": round(self.distance, 2),
            "distance_cie76": round(self.distance_cie76, 2),
            "distance_cie94": round(self.distance_cie94, 2),
            "distance_ciede2000": round(self.distance_ciede2000, 2)
        }


class ColorMatchingEngine:
    """
    Color matching engine using Delta E algorithms.
    
    Supports:
    - Euclidean distance (fast)
    - CIE76 (simple Delta E)
    - CIE94 (improved)
    - CIEDE2000 (most accurate)
    """
    
    def __init__(self, pantone_db_path: Optional[str] = None):
        """
        Initialize the color matching engine.
        
        Args:
            pantone_db_path: Path to Pantone JSON database
        """
        if pantone_db_path is None:
            base_path = Path(__file__).parent.parent
            pantone_db_path = base_path / "data" / "pantone-db.json"
        
        self.pantone_colors: List[PantoneColor] = []
        self._load_pantone_db(pantone_db_path)
    
    def _load_pantone_db(self, path: str):
        """Load Pantone color database from JSON."""
        with open(path, 'r') as f:
            data = json.load(f)
        
        self.pantone_colors = [
            PantoneColor.from_dict(c) 
            for c in data['colors']
        ]
    
    def rgb_to_xyz(self, rgb: Tuple[int, int, int]) -> Tuple[float, float, float]:
        """Convert RGB to XYZ color space."""
        r, g, b = [x / 255.0 for x in rgb]
        
        r = ((r + 0.055) / 1.055) ** 2.4 if r > 0.04045 else r / 12.92
        g = ((g + 0.055) / 1.055) ** 2.4 if g > 0.04045 else g / 12.92
        b = ((b + 0.055) / 1.055) ** 2.4 if b > 0.04045 else b / 12.92
        
        r *= 100
        g *= 100
        b *= 100
        
        x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375
        y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750
        z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041
        
        return (x, y, z)
    
    def xyz_to_lab(self, xyz: Tuple[float, float, float]) -> Tuple[float, float, float]:
        """Convert XYZ to LAB color space."""
        x, y, z = xyz
        
        xn, yn, zn = 95.047, 100.000, 108.883
        
        x /= xn
        y /= yn
        z /= zn
        
        epsilon = 0.008856
        kappa = 903.3
        
        fx = x ** (1/3) if x > epsilon else (kappa * x + 16) / 116
        fy = y ** (1/3) if y > epsilon else (kappa * y + 16) / 116
        fz = z ** (1/3) if z > epsilon else (kappa * z + 16) / 116
        
        L = 116 * fy - 16
        a = 500 * (fx - fy)
        b_val = 200 * (fy - fz)
        
        return (L, a, b_val)
    
    def rgb_to_lab(self, rgb: Tuple[int, int, int]) -> Tuple[float, float, float]:
        """Convert RGB directly to LAB."""
        xyz = self.rgb_to_xyz(rgb)
        return self.xyz_to_lab(xyz)
    
    def euclidean_distance(
        self, 
        rgb1: Tuple[int, int, int], 
        rgb2: Tuple[int, int, int]
    ) -> float:
        """Calculate simple Euclidean distance in RGB space."""
        return math.sqrt(sum((a - b) ** 2 for a, b in zip(rgb1, rgb2)))
    
    def cie76_distance(self, lab1: Tuple[float, float, float], lab2: Tuple[float, float, float]) -> float:
        """Calculate CIE76 Delta E (simple Euclidean in LAB space)."""
        L1, a1, b1 = lab1
        L2, a2, b2 = lab2
        return math.sqrt((L1 - L2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2)
    
    def cie94_distance(
        self, 
        lab1: Tuple[float, float, float], 
        lab2: Tuple[float, float, float],
        kL: float = 1.0,
        kC: float = 1.0,
        kH: float = 1.0
    ) -> float:
        """Calculate CIE94 Delta E."""
        L1, a1, b1 = lab1
        L2, a2, b2 = lab2
        
        C1 = math.sqrt(a1 ** 2 + b1 ** 2)
        C2 = math.sqrt(a2 ** 2 + b2 ** 2)
        Cab = abs(C1 - C2)
        
        deltaL = L1 - L2
        deltaa = a1 - a2
        deltab = b1 - b2
        
        HH = math.sqrt(deltaa ** 2 + deltab ** 2) if (deltaa ** 2 + deltab ** 2) > 0 else 0
        
        SL = 1
        SC = 1 + 0.045 * C1
        SH = 1 + 0.015 * C1
        
        return math.sqrt(
            (deltaL / (kL * SL)) ** 2 +
            (Cab / (kC * SC)) ** 2 +
            (HH / (kH * SH)) ** 2
        )
    
    def ciede2000_distance(
        self, 
        lab1: Tuple[float, float, float], 
        lab2: Tuple[float, float, float]
    ) -> float:
        """
        Calculate CIEDE2000 Delta E (most accurate).
        
        This is an approximation of the full CIEDE2000 formula.
        """
        L1, a1, b1 = lab1
        L2, a2, b2 = lab2
        
        kL = kC = kH = 1.0
        
        C1 = math.sqrt(a1 ** 2 + b1 ** 2)
        C2 = math.sqrt(a2 ** 2 + b2 ** 2)
        Cab = (C1 + C2) / 2
        
        G = 0.5 * (1 - math.sqrt(Cab ** 7 / (Cab ** 7 + 25 ** 7)))
        
        a1p = a1 * (1 + G)
        a2p = a2 * (1 + G)
        
        C1p = math.sqrt(a1p ** 2 + b1 ** 2)
        C2p = math.sqrt(a2p ** 2 + b2 ** 2)
        
        h1p = math.atan2(b1, a1p) * 180 / math.pi
        if h1p < 0:
            h1p += 360
        
        h2p = math.atan2(b2, a2p) * 180 / math.pi
        if h2p < 0:
            h2p += 360
        
        deltaLp = L2 - L1
        deltaCp = C2p - C1p
        
        deltahp = C1p * C2p * (h2p - h1p)
        if C1p * C2p == 0:
            deltahp = 0
        elif abs(h2p - h1p) <= 180:
            deltahp = h2p - h1p
        elif h2p - h1p > 180:
            deltahp = h2p - h1p - 360
        else:
            deltahp = h2p - h1p + 360
        
        deltaH = 2 * math.sqrt(C1p * C2p) * math.sin(deltahp * math.pi / 360)
        
        Lp = (L1 + L2) / 2
        Cp = (C1p + C2p) / 2
        
        if abs(h1p - h2p) <= 180:
            Hp = (h1p + h2p) / 2
        elif abs(h1p - h2p) > 180 and (h1p + h2p) < 360:
            Hp = (h1p + h2p + 360) / 2
        else:
            Hp = (h1p + h2p - 360) / 2
        
        T = 1 - 0.17 * math.cos((Hp - 30) * math.pi / 180) + \
            0.24 * math.cos((2 * Hp) * math.pi / 180) + \
            0.32 * math.cos((3 * Hp + 6) * math.pi / 180) - \
            0.20 * math.cos((4 * Hp - 63) * math.pi / 180)
        
        deltaTheta = 30 * math.exp(-((Hp - 275) / 25) ** 2)
        
        RC = 2 * math.sqrt(Cp ** 7 / (Cp ** 7 + 25 ** 7))
        
        SL = 1 + (0.015 * (Lp - 50) ** 2) / math.sqrt(20 + (Lp - 50) ** 2)
        SC = 1 + 0.045 * Cp
        SH = 1 + 0.015 * Cp * T
        RT = -math.sin(deltaTheta * math.pi / 180) * RC
        
        deltaE = math.sqrt(
            (deltaLp / (kL * SL)) ** 2 +
            (deltaCp / (kC * SC)) ** 2 +
            (deltaH / (kH * SH)) ** 2 +
            RT * (deltaCp / (kC * SC)) * (deltaH / (kH * SH))
        )
        
        return max(0, deltaE)
    
    def find_closest_pantone(
        self, 
        rgb: Tuple[int, int, int],
        top_n: int = 1,
        exclude_categories: Optional[List[str]] = None
    ) -> List[ColorMatch]:
        """
        Find closest Pantone colors to given RGB.
        
        Args:
            rgb: Target RGB color
            top_n: Number of matches to return
            exclude_categories: Categories to exclude (e.g., ['fluorescent'])
            
        Returns:
            List of ColorMatch objects sorted by distance
        """
        if exclude_categories is None:
            exclude_categories = []
        
        target_lab = self.rgb_to_lab(rgb)
        
        matches = []
        
        for pantone in self.pantone_colors:
            if pantone.category in exclude_categories:
                continue
            
            pantone_lab = self.rgb_to_lab(pantone.rgb)
            
            dist_euclidean = self.euclidean_distance(rgb, pantone.rgb)
            dist_cie76 = self.cie76_distance(target_lab, pantone_lab)
            dist_cie94 = self.cie94_distance(target_lab, pantone_lab)
            dist_ciede2000 = self.ciede2000_distance(target_lab, pantone_lab)
            
            match = ColorMatch(
                pantone_color=pantone,
                distance=dist_euclidean,
                distance_cie76=dist_cie76,
                distance_cie94=dist_cie94,
                distance_ciede2000=dist_ciede2000
            )
            matches.append(match)
        
        matches.sort(key=lambda m: m.distance_ciede2000)
        
        return matches[:top_n]
    
    def map_cluster_to_pantone(
        self,
        cluster_rgb: Tuple[int, int, int],
        include_magna: bool = True
    ) -> Dict:
        """
        Map a color cluster to Pantone with Magna ink recipe.
        
        Args:
            cluster_rgb: RGB tuple of the cluster color
            include_magna: Include Magna ink recipe
            
        Returns:
            Dictionary with color mapping info
        """
        matches = self.find_closest_pantone(cluster_rgb, top_n=3)
        
        if not matches:
            return {
                "error": "No matching Pantone found",
                "rgb": cluster_rgb
            }
        
        best_match = matches[0]
        
        result = {
            "original_color": {
                "rgb": cluster_rgb,
                "hex": '#{:02x}{:02x}{:02x}'.format(*cluster_rgb)
            },
            "best_match": best_match.to_dict(),
            "alternatives": [m.to_dict() for m in matches[1:3]]
        }
        
        if include_magna and best_match.pantone_color.magna_pigment:
            result["magna_recipe"] = {
                "base": best_match.pantone_color.magna_base,
                "pigment": best_match.pantone_color.magna_pigment,
                "description": f"{best_match.pantone_color.magna_base} + {best_match.pantone_color.magna_pigment}"
            }
        elif include_magna:
            result["magna_recipe"] = {
                "base": best_match.pantone_color.magna_base,
                "pigment": "Mix to match Pantone",
                "description": f"Mix {best_match.pantone_color.magna_base} to match {best_match.pantone_color.pantone}"
            }
        
        return result
    
    def get_colors_by_category(self, category: str) -> List[PantoneColor]:
        """Get all Pantone colors in a category."""
        return [c for c in self.pantone_colors if c.category == category]
    
    def get_metallic_colors(self) -> List[PantoneColor]:
        """Get all metallic Pantone colors (Gold, Silver, Bronze)."""
        return self.get_colors_by_category("metallic")
    
    def get_neutral_colors(self) -> List[PantoneColor]:
        """Get all neutral Pantone colors (whites, creams, grays, blacks)."""
        neutral_categories = ["white", "black", "gray", "neutral"]
        return [c for c in self.pantone_colors if c.category in neutral_categories]


def main():
    """Test the color matching engine."""
    engine = ColorMatchingEngine()
    
    test_colors = [
        (220, 20, 60),    # Crimson red
        (0, 128, 0),      # Green
        (0, 0, 139),      # Dark blue
        (255, 215, 0),    # Gold
    ]
    
    for rgb in test_colors:
        print(f"\n{'='*60}")
        print(f"Testing RGB: {rgb}")
        print('='*60)
        
        result = engine.map_cluster_to_pantone(rgb)
        
        print(f"Original: {result['original_color']['hex']}")
        print(f"Best Match: {result['best_match']['pantone']}")
        print(f"  Name: {result['best_match']['name']}")
        print(f"  CIEDE2000 Distance: {result['best_match']['distance_ciede2000']}")
        
        if 'magna_recipe' in result:
            print(f"  Magna Recipe: {result['magna_recipe']['description']}")


if __name__ == "__main__":
    main()
