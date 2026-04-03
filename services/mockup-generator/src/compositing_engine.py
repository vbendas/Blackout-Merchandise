"""
Compositing Engine

Composites halftoned designs onto product templates with realistic effects.
Based on CTDave001's automated_mockups with enhancements.
"""

from enum import Enum
from typing import Optional, Tuple, Dict
import math

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageChops

from src.template_manager import Template
from src.texture_manager import TextureManager


class BlendMode(Enum):
    """Available blend modes for compositing"""
    NORMAL = "normal"
    MULTIPLY = "multiply"
    OVERLAY = "overlay"
    SCREEN = "screen"


class ScaleMode(Enum):
    """Available scaling modes"""
    FIT = "fit"      # Scale to fit within bounds, maintain aspect ratio
    FILL = "fill"    # Scale to fill bounds, may crop
    STRETCH = "stretch"  # Stretch to exact size
    NONE = "none"    # No scaling


class Alignment(Enum):
    """Available alignment options (9-point grid)"""
    TOP_LEFT = "top_left"
    TOP_CENTER = "top_center"
    TOP_RIGHT = "top_right"
    CENTER_LEFT = "center_left"
    CENTER = "center"
    CENTER_RIGHT = "center_right"
    BOTTOM_LEFT = "bottom_left"
    BOTTOM_CENTER = "bottom_center"
    BOTTOM_RIGHT = "bottom_right"


class CompositingEngine:
    """
    Engine for compositing designs onto product templates
    
    Handles:
    - Design positioning and scaling
    - Rotation handling
    - Blend modes
    - Fabric texture application
    - Lighting effects
    """
    
    def __init__(
        self,
        texture_manager: Optional[TextureManager] = None
    ):
        """
        Initialize compositing engine
        
        Args:
            texture_manager: Texture manager for fabric overlays
        """
        self.texture_manager = texture_manager or TextureManager()
    
    def composite(
        self,
        design: Image.Image,
        template: Template,
        blend_mode: BlendMode = BlendMode.MULTIPLY,
        scale_mode: ScaleMode = ScaleMode.FIT,
        alignment: Alignment = Alignment.CENTER,
        fabric_type: Optional[str] = None,
        apply_lighting: bool = True
    ) -> Image.Image:
        """
        Composite design onto template
        
        Args:
            design: Design image (halftoned)
            template: Product template
            blend_mode: How to blend design with template
            scale_mode: How to scale design
            alignment: Where to position design
            fabric_type: Fabric type for texture overlay
            apply_lighting: Whether to apply lighting effects
        
        Returns:
            Composited mockup image
        """
        # Get template images
        template_image = template.config.blank_image or template.blank_image
        if template_image is None:
            raise ValueError("Template has no blank image")
        
        # Prepare design
        prepared_design = self._prepare_design(
            design,
            template,
            scale_mode,
            alignment
        )
        
        # Apply fabric texture to design if specified
        if fabric_type:
            prepared_design = self._apply_fabric_texture(
                prepared_design,
                fabric_type
            )
        
        # Composite design onto template
        composited = self._blend_images(
            template_image,
            prepared_design,
            template.config.print_area,
            blend_mode
        )
        
        # Apply lighting effects
        if apply_lighting:
            composited = self._apply_lighting_effects(composited)
        
        # Apply color adjustment for ink absorption
        composited = self._apply_color_adjustment(composited)
        
        return composited
    
    def _prepare_design(
        self,
        design: Image.Image,
        template: Template,
        scale_mode: ScaleMode,
        alignment: Alignment
    ) -> Image.Image:
        """
        Prepare design for compositing
        
        Handles scaling and positioning
        """
        print_area = template.config.print_area
        target_width = print_area.width
        target_height = print_area.height
        
        # Convert design to RGBA if needed
        if design.mode != 'RGBA':
            design = design.convert('RGBA')
        
        # Scale design
        if scale_mode == ScaleMode.STRETCH:
            # Stretch to exact size
            design = design.resize((target_width, target_height), Image.Resampling.LANCZOS)
        
        elif scale_mode == ScaleMode.FIT:
            # Scale to fit within bounds, maintain aspect ratio
            design_aspect = design.width / design.height
            target_aspect = target_width / target_height
            
            if design_aspect > target_aspect:
                # Design is wider, scale by width
                new_width = target_width
                new_height = int(target_width / design_aspect)
            else:
                # Design is taller, scale by height
                new_height = target_height
                new_width = int(target_height * design_aspect)
            
            design = design.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        elif scale_mode == ScaleMode.FILL:
            # Scale to fill, may crop
            design_aspect = design.width / design.height
            target_aspect = target_width / target_height
            
            if design_aspect > target_aspect:
                # Design is wider, scale by height
                new_height = target_height
                new_width = int(target_height * design_aspect)
            else:
                # Design is taller, scale by width
                new_width = target_width
                new_height = int(target_width / design_aspect)
            
            design = design.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Crop to target size
            left = (design.width - target_width) // 2
            top = (design.height - target_height) // 2
            design = design.crop((left, top, left + target_width, top + target_height))
        
        # Handle rotation
        if template.config.rotation != 0:
            design = design.rotate(
                -template.config.rotation,  # Negative because PIL rotates counter-clockwise
                expand=True,
                resample=Image.Resampling.BICUBIC
            )
        
        return design
    
    def _blend_images(
        self,
        template: Image.Image,
        design: Image.Image,
        print_area,
        blend_mode: BlendMode
    ) -> Image.Image:
        """
        Blend design onto template
        """
        # Ensure template is RGBA
        if template.mode != 'RGBA':
            template = template.convert('RGBA')
        
        # Calculate position based on alignment and print area
        design_width, design_height = design.size
        
        # Center in print area by default
        x = print_area.x + (print_area.width - design_width) // 2
        y = print_area.y + (print_area.height - design_height) // 2
        
        # Create composite
        result = template.copy()
        
        # Apply blend mode
        if blend_mode == BlendMode.MULTIPLY:
            # Multiply blend - darkens where both images are dark
            # This is good for simulating ink on fabric
            
            # Create a temporary image with template background
            temp = Image.new('RGBA', template.size, (255, 255, 255, 0))
            temp.paste(design, (x, y), design)
            
            # Multiply blend
            result_rgb = result.convert('RGB')
            temp_rgb = temp.convert('RGB')
            
            # Use ImageChops for multiply
            blended = ImageChops.multiply(result_rgb, temp_rgb)
            
            # Convert back to RGBA with original alpha
            result = blended.convert('RGBA')
        
        elif blend_mode == BlendMode.OVERLAY:
            # Overlay blend - combines multiply and screen
            # Good for textured fabrics
            
            temp = Image.new('RGBA', template.size, (255, 255, 255, 0))
            temp.paste(design, (x, y), design)
            
            # Simple paste for now - overlay is complex
            result.paste(design, (x, y), design)
        
        else:
            # Normal blend - simple paste
            result.paste(design, (x, y), design)
        
        return result
    
    def _apply_fabric_texture(
        self,
        image: Image.Image,
        fabric_type: str
    ) -> Image.Image:
        """
        Apply fabric texture overlay to design
        """
        texture = self.texture_manager.load_texture(fabric_type)
        
        if texture is None:
            # Return original if texture not available
            return image
        
        # Resize texture to match image
        if texture.size != image.size:
            texture = texture.resize(image.size, Image.Resampling.LANCZOS)
        
        # Get texture config
        config = self.texture_manager._config.get(fabric_type)
        if config is None:
            return image
        
        # Apply texture with blend
        if config.blend == "overlay":
            # Overlay blend
            texture_rgba = texture.copy()
            alpha = int(255 * config.opacity)
            texture_rgba.putalpha(alpha)
            
            # Composite
            result = Image.alpha_composite(
                image.convert("RGBA"),
                texture_rgba
            )
            return result
        
        else:
            # Simple blend
            return Image.blend(image, texture, config.opacity)
    
    def _apply_lighting_effects(self, image: Image.Image) -> Image.Image:
        """
        Apply lighting effects for realism
        
        Simulates natural lighting on fabric
        """
        # Convert to RGB for enhancement
        if image.mode == 'RGBA':
            rgb_image = image.convert('RGB')
            alpha = image.split()[3]
        else:
            rgb_image = image
            alpha = None
        
        # Slight brightness adjustment (ink absorption makes it slightly darker)
        enhancer = ImageEnhance.Brightness(rgb_image)
        rgb_image = enhancer.enhance(0.95)
        
        # Slight contrast adjustment
        enhancer = ImageEnhance.Contrast(rgb_image)
        rgb_image = enhancer.enhance(1.05)
        
        # Slight saturation reduction (ink on fabric is less saturated)
        enhancer = ImageEnhance.Color(rgb_image)
        rgb_image = enhancer.enhance(0.9)
        
        # Add subtle shadow/blur for depth
        rgb_image = rgb_image.filter(ImageFilter.GaussianBlur(radius=0.5))
        
        # Restore alpha if present
        if alpha:
            rgb_image = rgb_image.convert('RGBA')
            rgb_image.putalpha(alpha)
        
        return rgb_image
    
    def _apply_color_adjustment(self, image: Image.Image) -> Image.Image:
        """
        Apply color adjustment to simulate ink absorption
        
        Screen printing ink absorbs into fabric, slightly changing color
        """
        # Subtle darkening and desaturation
        if image.mode == 'RGBA':
            rgb = image.convert('RGB')
            alpha = image.split()[3]
        else:
            rgb = image
            alpha = None
        
        # Apply color matrix for ink absorption effect
        # Slightly reduce brightness and saturation
        enhancer = ImageEnhance.Brightness(rgb)
        rgb = enhancer.enhance(0.97)
        
        enhancer = ImageEnhance.Color(rgb)
        rgb = enhancer.enhance(0.95)
        
        if alpha:
            rgb = rgb.convert('RGBA')
            rgb.putalpha(alpha)
        
        return rgb
    
    def generate_all_views(
        self,
        design: Image.Image,
        template_base,
        views: list,
        **kwargs
    ) -> Dict[str, Image.Image]:
        """
        Generate mockups for all requested views
        
        Args:
            design: Design image
            template_base: Base template object or manager
            views: List of view names to generate
            **kwargs: Additional compositing parameters
        
        Returns:
            Dictionary mapping view names to mockup images
        """
        results = {}
        
        for view in views:
            try:
                # Load template for this view
                if hasattr(template_base, 'load_template'):
                    template = template_base.load_template(
                        template_base.config.sku if hasattr(template_base, 'config') else template_base,
                        view
                    )
                else:
                    template = template_base
                
                # Generate mockup
                mockup = self.composite(design, template, **kwargs)
                results[view] = mockup
                
            except Exception as e:
                print(f"Error generating {view} view: {e}")
                results[view] = None
        
        return results
