"""
Texture Manager for fabric texture overlays

Manages loading and application of fabric textures to mockups
"""

import json
from pathlib import Path
from typing import Dict, Optional

from PIL import Image


class TextureConfig:
    """Configuration for a fabric texture"""
    
    def __init__(self, data: dict):
        self.file = data["file"]
        self.blend = data["blend"]
        self.opacity = data["opacity"]
        self.description = data.get("description", "")
        self.usage = data.get("usage", [])


class TextureManager:
    """
    Manages fabric textures for mockup generation
    
    Handles loading, caching, and application of fabric textures
    """
    
    def __init__(self, textures_dir: str = "./assets/textures"):
        self.textures_dir = Path(textures_dir)
        self._config: Dict[str, TextureConfig] = {}
        self._cache: Dict[str, Image.Image] = {}
        self._load_config()
    
    def _load_config(self):
        """Load texture configuration"""
        config_path = self.textures_dir / "texture_config.json"
        
        if not config_path.exists():
            # Create default config if not exists
            self._create_default_config()
            return
        
        with open(config_path) as f:
            config_data = json.load(f)
        
        for fabric_type, data in config_data.items():
            self._config[fabric_type] = TextureConfig(data)
    
    def _create_default_config(self):
        """Create default texture configuration"""
        default_config = {
            "cotton": {
                "file": "cotton_weave.jpg",
                "blend": "overlay",
                "opacity": 0.12,
                "description": "Standard cotton weave texture",
                "usage": ["t-shirts", "hoodies", "sweatshirts"]
            },
            "polyester": {
                "file": "polyester_weave.jpg",
                "blend": "overlay",
                "opacity": 0.10,
                "description": "Smooth polyester texture",
                "usage": ["t-shirts", "hoodies", "sportswear"]
            },
            "canvas": {
                "file": "canvas_weave.jpg",
                "blend": "overlay",
                "opacity": 0.15,
                "description": "Heavy canvas weave texture",
                "usage": ["tote-bags", "posters"]
            },
            "tri_blend": {
                "file": "tri_blend_weave.jpg",
                "blend": "overlay",
                "opacity": 0.08,
                "description": "Soft tri-blend texture",
                "usage": ["t-shirts", "premium-apparel"]
            }
        }
        
        config_path = self.textures_dir / "texture_config.json"
        with open(config_path, 'w') as f:
            json.dump(default_config, f, indent=2)
        
        for fabric_type, data in default_config.items():
            self._config[fabric_type] = TextureConfig(data)
    
    def load_texture(self, fabric_type: str) -> Optional[Image.Image]:
        """
        Load a fabric texture
        
        Args:
            fabric_type: Type of fabric (cotton, polyester, canvas, tri_blend)
        
        Returns:
            PIL Image or None if not found
        """
        # Return cached texture if available
        if fabric_type in self._cache:
            return self._cache[fabric_type]
        
        if fabric_type not in self._config:
            return None
        
        config = self._config[fabric_type]
        texture_path = self.textures_dir / config.file
        
        if not texture_path.exists():
            # Return None if texture file doesn't exist yet
            return None
        
        # Load and cache texture
        texture = Image.open(texture_path).convert("RGBA")
        self._cache[fabric_type] = texture
        
        return texture
    
    def apply_texture(
        self,
        image: Image.Image,
        fabric_type: str,
        resize_to_fit: bool = True
    ) -> Image.Image:
        """
        Apply fabric texture to an image
        
        Args:
            image: PIL Image to apply texture to
            fabric_type: Type of fabric texture
            resize_to_fit: Whether to resize texture to match image size
        
        Returns:
            Image with texture applied
        """
        texture = self.load_texture(fabric_type)
        
        if texture is None:
            # Return original image if texture not available
            return image
        
        config = self._config[fabric_type]
        
        # Resize texture to match image if needed
        if resize_to_fit and texture.size != image.size:
            texture = texture.resize(image.size, Image.Resampling.LANCZOS)
        
        # Apply texture with specified blend mode and opacity
        if config.blend == "overlay":
            # Create overlay with opacity
            texture_rgba = texture.copy()
            texture_rgba.putalpha(int(255 * config.opacity))
            
            # Composite
            result = Image.alpha_composite(
                image.convert("RGBA"),
                texture_rgba
            )
            return result
        
        elif config.blend == "multiply":
            # Multiply blend mode
            return Image.blend(
                image,
                ImageChops.multiply(image, texture),
                config.opacity
            )
        
        else:
            # Default: simple blend
            return Image.blend(image, texture, config.opacity)
    
    def get_available_textures(self) -> list:
        """Get list of available fabric types"""
        return list(self._config.keys())
    
    def get_texture_info(self, fabric_type: str) -> Optional[dict]:
        """Get information about a texture"""
        if fabric_type not in self._config:
            return None
        
        config = self._config[fabric_type]
        return {
            "type": fabric_type,
            "file": config.file,
            "blend": config.blend,
            "opacity": config.opacity,
            "description": config.description,
            "usage": config.usage,
            "available": (self.textures_dir / config.file).exists()
        }
    
    def clear_cache(self):
        """Clear the texture cache"""
        self._cache.clear()


# Import ImageChops for multiply blend
from PIL import ImageChops
