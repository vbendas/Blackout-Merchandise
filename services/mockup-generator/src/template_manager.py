"""
Template Manager for loading and caching product templates
"""

import json
import os
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from pathlib import Path

from PIL import Image


@dataclass
class PrintArea:
    """Printable area on template"""
    x: int
    y: int
    width: int
    height: int


@dataclass
class SafeZone:
    """Safe zone within print area"""
    x: int
    y: int
    width: int
    height: int


@dataclass
class TemplateConfig:
    """Template configuration"""
    sku: str
    name: str
    category: str
    product_type: str
    placement: str
    print_area: PrintArea
    safe_zone: SafeZone
    fabric_type: str
    available_views: List[str]
    rotation: float = 0.0


@dataclass
class Template:
    """Loaded template with images and config"""
    config: TemplateConfig
    blank_image: Optional[Image.Image] = None
    mask_image: Optional[Image.Image] = None


class TemplateManager:
    """
    Manages product templates for mockup generation
    
    Handles loading, caching, and validation of templates
    """
    
    def __init__(self, templates_dir: str = "./templates/stanley-stella"):
        self.templates_dir = Path(templates_dir)
        self._cache: Dict[str, Template] = {}
        self._index: Dict[str, Dict] = {}
        self._build_index()
    
    def _build_index(self):
        """Build index of all available templates"""
        if not self.templates_dir.exists():
            return
        
        for category_dir in self.templates_dir.iterdir():
            if not category_dir.is_dir():
                continue
            
            category = category_dir.name
            self._index[category] = {}
            
            for product_dir in category_dir.iterdir():
                if not product_dir.is_dir():
                    continue
                
                config_path = product_dir / "config.json"
                if config_path.exists():
                    with open(config_path) as f:
                        config = json.load(f)
                        self._index[category][product_dir.name] = config
    
    def list_categories(self) -> List[str]:
        """List all available product categories"""
        return list(self._index.keys())
    
    def list_products(self, category: Optional[str] = None) -> List[Dict]:
        """
        List all products, optionally filtered by category
        
        Returns list of product info dicts with sku, name, category
        """
        products = []
        
        categories = [category] if category else self.list_categories()
        
        for cat in categories:
            if cat not in self._index:
                continue
            
            for product_name, config in self._index[cat].items():
                products.append({
                    "sku": config.get("sku", ""),
                    "name": config.get("name", product_name),
                    "category": cat,
                    "available_views": config.get("available_views", []),
                    "fabric_types": config.get("fabric_types", ["cotton"])
                })
        
        return products
    
    def load_template(self, sku: str, view: str = "flat") -> Template:
        """
        Load a template by SKU and view
        
        Args:
            sku: Product SKU (e.g., STTU755_CREATOR_BLACK)
            view: View type (flat, worn, closeup)
        
        Returns:
            Template object with loaded images
        
        Raises:
            FileNotFoundError: If template not found
        """
        cache_key = f"{sku}_{view}"
        
        # Return cached template if available
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        # Find template directory
        template_dir = self._find_template_dir(sku)
        if not template_dir:
            raise FileNotFoundError(f"Template not found for SKU: {sku}")
        
        # Load config
        config_path = template_dir / "config.json"
        with open(config_path) as f:
            config_data = json.load(f)
        
        # Build TemplateConfig
        print_area_data = config_data.get("print_area", {})
        safe_zone_data = config_data.get("safe_zone", {})
        
        config = TemplateConfig(
            sku=config_data.get("sku", sku),
            name=config_data.get("name", ""),
            category=config_data.get("category", ""),
            product_type=config_data.get("product_type", ""),
            placement=config_data.get("placement", "front_chest"),
            print_area=PrintArea(
                x=print_area_data.get("x", 0),
                y=print_area_data.get("y", 0),
                width=print_area_data.get("width", 100),
                height=print_area_data.get("height", 100)
            ),
            safe_zone=SafeZone(
                x=safe_zone_data.get("x", 0),
                y=safe_zone_data.get("y", 0),
                width=safe_zone_data.get("width", 100),
                height=safe_zone_data.get("height", 100)
            ),
            fabric_type=config_data.get("fabric_type", "cotton"),
            available_views=config_data.get("available_views", ["flat"]),
            rotation=config_data.get("rotation", 0.0)
        )
        
        # Load images
        blank_path = template_dir / "blank" / f"{view}.png"
        mask_path = template_dir / "mask" / f"{view}.png"
        
        blank_image = None
        mask_image = None
        
        if blank_path.exists():
            blank_image = Image.open(blank_path).convert("RGBA")
        
        if mask_path.exists():
            mask_image = Image.open(mask_path).convert("L")
        
        template = Template(
            config=config,
            blank_image=blank_image,
            mask_image=mask_image
        )
        
        # Cache the template
        self._cache[cache_key] = template
        
        return template
    
    def _find_template_dir(self, sku: str) -> Optional[Path]:
        """Find template directory by SKU"""
        for category, products in self._index.items():
            for product_name, config in products.items():
                if config.get("sku") == sku:
                    return self.templates_dir / category / product_name
        return None
    
    def get_available_views(self, sku: str) -> List[str]:
        """Get available views for a product SKU"""
        for category, products in self._index.items():
            for product_name, config in products.items():
                if config.get("sku") == sku:
                    return config.get("available_views", ["flat"])
        return []
    
    def get_template_by_sku(self, sku: str) -> Optional[Dict]:
        """Get template config by SKU"""
        for category, products in self._index.items():
            for product_name, config in products.items():
                if config.get("sku") == sku:
                    return {
                        "sku": config.get("sku", ""),
                        "name": config.get("name", product_name),
                        "category": category,
                        "available_views": config.get("available_views", ["flat"]),
                        "available_placements": config.get("placements", ["front_chest"]),
                        "fabric_types": config.get("fabric_types", ["cotton"]),
                        "thumbnail_url": config.get("thumbnail_url")
                    }
        return None
    
    def validate_design_size(self, sku: str, design_width: int, design_height: int) -> Tuple[bool, str]:
        """
        Validate that design fits in template print area
        
        Returns:
            (is_valid, message)
        """
        try:
            template = self.load_template(sku)
            safe_zone = template.config.safe_zone
            
            if design_width > safe_zone.width or design_height > safe_zone.height:
                return False, f"Design ({design_width}x{design_height}) exceeds safe zone ({safe_zone.width}x{safe_zone.height})"
            
            return True, "Design fits within safe zone"
        except Exception as e:
            return False, str(e)
    
    def clear_cache(self):
        """Clear the template cache"""
        self._cache.clear()
    
    def reload_index(self):
        """Reload template index (useful after adding new templates)"""
        self._index.clear()
        self._cache.clear()
        self._build_index()
