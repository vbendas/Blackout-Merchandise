"""
Halftone Layers Integration v2.0

Applies halftone processing to each separation layer.
Integrates elliptical halftone engine, knockout engine, and PSD export.

Key Features:
- Elliptical halftone dots (1.5:1 ratio) for screen printing standard
- Spot color knockout (no overlap between spot colors)
- Multi-layer PSD output with named layers
- Respects transparent areas (skips halftoning empty space)
- Generates individual color previews + consolidated composite
- Outputs at correct print size (38cm x 52cm at 300 DPI = 4488x6142 px)
"""

import sys
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
import json

import numpy as np
from PIL import Image


sys.path.insert(0, str(Path(__file__).parent.parent.parent / "mockup-generator" / "src"))

try:
    from halftone_processor import HalftoneProcessor
    HALFTONE_AVAILABLE = True
except ImportError:
    HALFTONE_AVAILABLE = False

# Import v2.0 engines
try:
    from src.elliptical_halftone import apply_elliptical_halftone
    from src.knockout_engine import create_knockout_masks, verify_knockout
    from src.psd_exporter import PSDExporter, PSDLayer
except ImportError:
    # Fallback for direct script execution
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from src.elliptical_halftone import apply_elliptical_halftone
    from src.knockout_engine import create_knockout_masks, verify_knockout
    from src.psd_exporter import PSDExporter, PSDLayer


# Print area dimensions
PRINT_WIDTH_CM = 38
PRINT_HEIGHT_CM = 52
PRINT_DPI = 300

# Calculate pixel dimensions
PRINT_WIDTH_PX = int((PRINT_WIDTH_CM / 2.54) * PRINT_DPI)  # ~4488 px
PRINT_HEIGHT_PX = int((PRINT_HEIGHT_CM / 2.54) * PRINT_DPI)  # ~6142 px


@dataclass
class LayerHalftoneSettings:
    """Settings for halftoning a specific layer."""
    layer_index: int
    color_name: str
    lpi: int = 55
    dot_shape: str = "ellipse"  # v2.0: default to ellipse
    angle: float = 7.5
    method: str = "elliptical"  # v2.0: default to elliptical


class HalftoneLayerProcessor:
    """
    Applies halftone processing to separation layers.
    
    Features:
    - Elliptical halftone dots (screen printing standard)
    - Spot color knockout (no overlap)
    - Multi-layer PSD output
    - Respects transparent areas (no halftone on empty space)
    - Individual color previews + consolidated composite
    - Output at correct print size
    - Per-color LPI settings
    - Angle variation per layer
    """
    
    # Screen print LPI by color category
    DEFAULT_LPI_BY_COLOR_SCREEN = {
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
    
    # DTG/DTF LPI (uniform, coarser halftones)
    DEFAULT_LPI_DTG = 30
    DEFAULT_LPI_DTF = 30
    
    DEFAULT_ANGLES = [7.5, 37.5, 67.5, 82.5, 52.5, 22.5, 57.5, 77.5]
    
    def __init__(
        self,
        default_lpi: int = 55,
        default_method: str = "elliptical",  # v2.0: elliptical default
        output_resolutions: List[int] = None,
        color_matcher=None,
        print_method: str = "screen",
        target_width_px: int = PRINT_WIDTH_PX,
        target_height_px: int = PRINT_HEIGHT_PX,
        color_mode: str = "spot"  # v2.0: spot or process
    ):
        """
        Initialize the halftone processor.
        
        Args:
            default_lpi: Default lines per inch
            default_method: Default halftone method ('elliptical' or 'circular')
            output_resolutions: List of output DPI values
            color_matcher: Optional color matcher for auto-LPI
            print_method: Print method ('dtg', 'screen', 'dtf')
            target_width_px: Target output width in pixels
            target_height_px: Target output height in pixels
            color_mode: Color separation mode ('spot' or 'process')
        """
        self.default_lpi = default_lpi
        self.default_method = default_method
        self.output_resolutions = output_resolutions or [72, 300]
        self.color_matcher = color_matcher
        self.print_method = print_method.lower()
        self.target_width = target_width_px
        self.target_height = target_height_px
        self.color_mode = color_mode
        
        if HALFTONE_AVAILABLE and default_method == "circular":
            self.halftone_processor = HalftoneProcessor()
        else:
            self.halftone_processor = None
        
        # v2.0: PSD exporter
        self.psd_exporter = PSDExporter(dpi=PRINT_DPI)
    
    def get_lpi_for_color(self, color_category: str = "neutral") -> int:
        """Get optimal LPI for a color category based on print method."""
        if self.print_method in ("dtg", "dtf"):
            return self.DEFAULT_LPI_DTG if self.print_method == "dtg" else self.DEFAULT_LPI_DTF
        
        return self.DEFAULT_LPI_BY_COLOR_SCREEN.get(
            color_category.lower(), 
            self.default_lpi
        )
    
    def get_angle_for_layer(self, layer_index: int) -> float:
        """Get halftone angle for a layer."""
        return self.DEFAULT_ANGLES[layer_index % len(self.DEFAULT_ANGLES)]
    
    def get_settings_for_layer(
        self,
        layer_index: int,
        color_category: str = "neutral"
    ) -> LayerHalftoneSettings:
        """Get halftone settings for a layer."""
        dot_shape = "ellipse" if self.default_method == "elliptical" else "round"
        return LayerHalftoneSettings(
            layer_index=layer_index,
            color_name=color_category,
            lpi=self.get_lpi_for_color(color_category),
            angle=self.get_angle_for_layer(layer_index),
            method=self.default_method,
            dot_shape=dot_shape
        )
    
    def resize_to_print_size(self, img: Image.Image) -> Image.Image:
        """Resize image to target print dimensions while maintaining aspect ratio."""
        w, h = img.size
        scale_w = self.target_width / w
        scale_h = self.target_height / h
        scale = min(scale_w, scale_h)
        
        new_w = int(w * scale)
        new_h = int(h * scale)
        
        return img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    def apply_halftone_to_layer(
        self,
        layer_path: str,
        settings: LayerHalftoneSettings,
        output_dir: str,
        color_label: str = None,
        print_color: Tuple[int, int, int] = (128, 128, 128),
        original_alpha: np.ndarray = None,
        dot_shape: str = "ellipse",  # v2.0: explicit dot shape override
        knockout: bool = False,       # v2.0: apply knockout
        knockout_mask: np.ndarray = None  # v2.0: pre-computed knockout mask
    ) -> Dict:
        """
        Apply halftone processing to a single layer.
        
        v2.0 additions:
        - dot_shape: "ellipse" (default) or "round"
        - knockout: Apply knockout mask before halftone
        - knockout_mask: Pre-computed mask from knockout engine
        
        Respects transparent areas - only halftones where content exists.
        """
        layer_img = Image.open(layer_path)
        
        # Convert to RGBA to handle transparency
        if layer_img.mode != 'RGBA':
            layer_img = layer_img.convert('RGBA')
        
        layer_array = np.array(layer_img)
        
        # Extract alpha channel (transparency)
        if layer_array.shape[2] == 4:
            rgb = layer_array[:, :, :3]
            alpha = layer_array[:, :, 3]
        else:
            rgb = layer_array
            alpha = np.ones(rgb.shape[:2], dtype=np.uint8) * 255
        
        # Use original image alpha if provided (more accurate)
        if original_alpha is not None:
            if original_alpha.shape != alpha.shape:
                orig_alpha_img = Image.fromarray(original_alpha, mode='L')
                orig_alpha_img = orig_alpha_img.resize(
                    (alpha.shape[1], alpha.shape[0]), Image.Resampling.LANCZOS
                )
                original_alpha = np.array(orig_alpha_img)
            alpha = np.minimum(alpha, original_alpha)
        
        # v2.0: Apply knockout mask if provided
        if knockout and knockout_mask is not None:
            if knockout_mask.shape != alpha.shape:
                km_img = Image.fromarray(knockout_mask, mode='L')
                km_img = km_img.resize(
                    (alpha.shape[1], alpha.shape[0]), Image.Resampling.LANCZOS
                )
                knockout_mask = np.array(km_img)
            # Where knockout mask is 0, set alpha to 0 (no ink)
            alpha[knockout_mask == 0] = 0
        
        # Create a mask of non-transparent areas
        content_mask = alpha > 10
        
        outputs = {}
        
        for dpi in self.output_resolutions:
            # Determine LPI based on DPI
            if dpi <= 72:
                lpi = max(30, settings.lpi - 15)
            else:
                lpi = settings.lpi
            
            # Convert to grayscale for halftoning
            gray = np.mean(rgb, axis=2).astype(np.uint8)
            
            # v2.0: Use elliptical halftone engine
            if dot_shape == "ellipse" or self.default_method == "elliptical":
                halftone_array = apply_elliptical_halftone(
                    gray,
                    lpi=lpi,
                    dpi=dpi,
                    angle=settings.angle,
                    ellipse_ratio=1.5,
                    preserve_alpha=True,
                    alpha_channel=alpha
                )
            elif self.halftone_processor:
                # Legacy: use old halftone processor (circular)
                gray_img = Image.fromarray(gray, mode='L')
                halftone_img = self.halftone_processor.process_for_resolution(
                    gray_img, dpi, settings.method
                )
                halftone_array = np.array(halftone_img)
            else:
                # Legacy fallback
                halftone_array = self._fallback_halftone(gray, dpi)
            
            # Apply halftone only to content areas, keep transparent areas
            result = np.zeros_like(halftone_array)
            result[content_mask] = halftone_array[content_mask]
            
            # Create output image with transparency
            output_rgba = np.zeros((result.shape[0], result.shape[1], 4), dtype=np.uint8)
            output_rgba[:, :, 0] = result  # R
            output_rgba[:, :, 1] = result  # G
            output_rgba[:, :, 2] = result  # B
            output_rgba[:, :, 3] = alpha   # Alpha
            
            output_img = Image.fromarray(output_rgba, mode='RGBA')
            
            # Resize to print size
            output_img = self.resize_to_print_size(output_img)
            
            # Save
            dpi_dir = Path(output_dir) / f"dpi_{dpi}"
            dpi_dir.mkdir(parents=True, exist_ok=True)
            
            if color_label:
                safe_label = color_label.replace("#", "").replace(" ", "_")
                filename = f"halftone_{safe_label}_{dpi}dpi.png"
            else:
                filename = f"halftone_layer_{settings.layer_index + 1:02d}_{dpi}dpi.png"
            
            output_path = dpi_dir / filename
            output_img.save(output_path)
            
            outputs[f"dpi_{dpi}"] = {
                "path": str(output_path),
                "filename": filename,
                "dpi": dpi,
                "lpi": lpi,
                "size": output_img.size
            }
            
            # Generate individual color preview
            self._create_individual_preview(
                output_img,
                print_color,
                color_label or f"Layer_{settings.layer_index + 1}",
                str(dpi_dir / f"preview_{safe_label if color_label else f'layer_{settings.layer_index + 1}'}_{dpi}dpi.png")
            )
        
        return outputs
    
    def _fallback_halftone(self, layer_array: np.ndarray, target_dpi: int) -> np.ndarray:
        """Legacy fallback — uses elliptical halftone instead of nearest-neighbor."""
        return apply_elliptical_halftone(
            layer_array,
            lpi=55 if target_dpi >= 300 else 30,
            dpi=target_dpi,
            angle=45.0,
            ellipse_ratio=1.5,
            preserve_alpha=False
        )
    
    def _create_individual_preview(
        self,
        halftone_img: Image.Image,
        color: Tuple[int, int, int],
        label: str,
        output_path: str
    ):
        """Create a colored preview of a single halftone layer."""
        img_array = np.array(halftone_img)
        
        if img_array.shape[2] == 4:
            gray = img_array[:, :, 0]
            alpha = img_array[:, :, 3]
        else:
            gray = img_array[:, :, 0]
            alpha = np.ones_like(gray) * 255
        
        # Create colored preview
        preview = np.zeros((gray.shape[0], gray.shape[1], 4), dtype=np.uint8)
        
        intensity = gray.astype(float) / 255.0
        for i, c in enumerate(color):
            preview[:, :, i] = (intensity * c).astype(np.uint8)
        
        preview[:, :, 3] = alpha
        
        preview_img = Image.fromarray(preview, mode='RGBA')
        preview_img.save(output_path)
    
    def get_layer_color_label(self, layer: Dict) -> tuple:
        """Extract color label and RGB color for a layer."""
        layer_type = layer.get("type", "")
        channel = layer.get("channel", "")
        
        # White base
        if layer_type == "white_base":
            return "W", (255, 255, 255)
        
        # CMYK channels
        if layer_type == "cmyk" or channel:
            channel_lower = channel.lower() if channel else ""
            if "cyan" in channel_lower or channel_lower == "c":
                return "C", (0, 180, 220)
            elif "magenta" in channel_lower or channel_lower == "m":
                return "M", (220, 0, 180)
            elif "yellow" in channel_lower or channel_lower == "y":
                return "Y", (255, 220, 0)
            elif "black" in channel_lower or channel_lower == "k":
                return "K", (30, 30, 30)
        
        # Spot colors - use hex color if available
        original_color = layer.get("original_color", "")
        rgb = layer.get("rgb")
        
        if rgb and len(rgb) == 3:
            label = original_color.replace("#", "") if original_color else f"L{layer.get('layer', 0)}"
            return label, tuple(rgb)
        
        return f"L{layer.get('layer', 0)}", (128, 128, 128)
    
    def create_consolidated_preview(
        self,
        layer_data: List[Tuple[str, Tuple[int, int, int], str]],
        output_path: str
    ) -> str:
        """
        Create a consolidated preview showing all colors together.
        
        Args:
            layer_data: List of (image_path, color, label) tuples
            output_path: Where to save the composite
        """
        if not layer_data:
            return None
        
        first_img = Image.open(layer_data[0][0])
        w, h = first_img.size
        
        composite = Image.new('RGB', (w, h), (255, 255, 255))
        
        for path, color, label in layer_data:
            if not Path(path).exists():
                continue
            
            img = Image.open(path)
            if img.size != (w, h):
                img = img.resize((w, h), Image.Resampling.LANCZOS)
            
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            img_array = np.array(img)
            gray = img_array[:, :, 0]
            alpha = img_array[:, :, 3]
            
            colored = np.zeros((h, w, 3), dtype=np.uint8)
            intensity = gray.astype(float) / 255.0
            
            for i, c in enumerate(color):
                colored[:, :, i] = (intensity * c).astype(np.uint8)
            
            colored_img = Image.fromarray(colored, mode='RGB')
            mask = Image.fromarray(alpha, mode='L')
            composite.paste(colored_img, (0, 0), mask)
        
        composite.save(output_path)
        
        # Create thumbnail
        thumb_path = str(output_path).replace(".png", "_thumb.png")
        thumb_w = min(800, w)
        thumb_h = int(thumb_w * h / w)
        composite.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS).save(thumb_path)
        
        return output_path
    
    def _apply_knockout(
        self,
        layer_masks: List[Tuple[str, np.ndarray]],
        feather_px: float = 0.5
    ) -> Tuple[List[np.ndarray], Dict]:
        """
        Apply spot color knockout to layer masks.
        
        Args:
            layer_masks: List of (label, grayscale_mask) tuples
            feather_px: Feather amount at knockout edges
        
        Returns:
            Tuple of (knocked_out_masks, knockout_metadata)
        """
        if not layer_masks or self.color_mode != "spot":
            return [m for _, m in layer_masks], {"knockout_applied": False}
        
        masks = [m for _, m in layer_masks]
        labels = [l for l, _ in layer_masks]
        
        knocked_out, metadata = create_knockout_masks(
            masks,
            labels=labels,
            feather_px=feather_px
        )
        
        # Verify knockout
        is_valid = verify_knockout(masks, knocked_out)
        metadata["verified"] = is_valid
        
        if not is_valid:
            print("   WARNING: Knockout verification failed")
        
        return knocked_out, metadata
    
    def _generate_psd(
        self,
        original_image_path: str,
        print_preview_pairs: List[Dict],
        output_dir: Path,
        width: int = PRINT_WIDTH_PX,
        height: int = PRINT_HEIGHT_PX
    ) -> Optional[str]:
        """
        Generate multi-layer PSD with print and preview layers.
        
        Args:
            original_image_path: Path to original design image
            print_preview_pairs: List of dicts with 'label', 'print_path', 'preview_path'
            output_dir: Output directory
            width: Target width
            height: Target height
        
        Returns:
            Path to PSD file, or None on failure
        """
        try:
            # Load original image
            original_image = None
            if original_image_path and Path(original_image_path).exists():
                orig_img = Image.open(original_image_path)
                if orig_img.mode != 'RGB':
                    orig_img = orig_img.convert('RGB')
                original_image = np.array(orig_img)
            
            # Collect print and preview layers
            print_layers = []
            preview_layers = []
            
            for pair in print_preview_pairs:
                label = pair["label"]
                print_path = pair["print_path"]
                preview_path = pair["preview_path"]
                
                # Load print layer
                print_data = None
                if print_path and Path(print_path).exists():
                    p_img = Image.open(print_path)
                    if p_img.mode != 'L':
                        p_img = p_img.convert('L')
                    print_data = np.array(p_img)
                
                # Load preview layer
                preview_data = None
                if preview_path and Path(preview_path).exists():
                    pv_img = Image.open(preview_path)
                    if pv_img.mode == 'RGBA':
                        pv_img = pv_img.convert('RGB')
                    elif pv_img.mode != 'RGB':
                        pv_img = pv_img.convert('RGB')
                    preview_data = np.array(pv_img)
                
                if print_data is not None and preview_data is not None:
                    print_layers.append((label, print_data))
                    preview_layers.append((label, preview_data))
            
            if not print_layers:
                print("   WARNING: No print/preview pairs for PSD")
                return None
            
            # Generate PSD
            psd_path = output_dir / "print_ready.psd"
            print(f"\n   Generating print_ready.psd ({len(print_layers)} color layers)...")
            
            result = self.psd_exporter.create_print_ready_psd(
                original_image=original_image,
                print_layers=print_layers,
                preview_layers=preview_layers,
                output_path=str(psd_path),
                width=width,
                height=height
            )
            
            file_size = Path(result).stat().st_size
            print(f"   PSD saved: {result} ({file_size / 1024 / 1024:.1f} MB)")
            
            return result
            
        except Exception as e:
            print(f"   ERROR: PSD generation failed: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def process_all_layers(
        self,
        layers: List[Dict],
        output_dir: str,
        color_categories: List[str] = None,
        original_image_path: str = None,
        apply_knockout: bool = None  # v2.0: auto-detect from color_mode
    ) -> Dict:
        """
        Process all layers with halftone and generate previews.
        
        v2.0 additions:
        - Spot color knockout before halftone
        - Multi-layer PSD output
        - New output structure with individual_layers/
        
        Args:
            layers: List of layer dictionaries
            output_dir: Output directory
            color_categories: List of color categories
            original_image_path: Path to original image for transparency mask
            apply_knockout: Override knockout behavior (default: auto from color_mode)
        
        Returns:
            Dictionary with processed layers and preview paths
        """
        output_path = Path(output_dir)
        
        # v2.0: Auto-detect knockout from color mode
        if apply_knockout is None:
            apply_knockout = self.color_mode == "spot"
        
        results = {
            "layers": [],
            "total_layers": 0,
            "output_directory": str(output_path),
            "individual_previews": [],
            "consolidated_preview": None,
            "psd_path": None,          # v2.0
            "knockout_metadata": None   # v2.0
        }
        
        if color_categories is None:
            color_categories = ["neutral"] * len(layers)
        
        # Load original image alpha if available
        original_alpha = None
        if original_image_path and Path(original_image_path).exists():
            orig_img = Image.open(original_image_path)
            if orig_img.mode == 'RGBA':
                original_alpha = np.array(orig_img.split()[3])
            orig_img.close()
        
        # ---------------------------------------------------------------
        # v2.0 STEP 1: Collect layer masks for knockout (spot mode only)
        # ---------------------------------------------------------------
        layer_masks_for_knockout = []
        layer_indices_for_knockout = []
        
        if apply_knockout:
            for i, layer in enumerate(layers):
                if layer.get("layer") == "garment":
                    continue
                
                layer_path = layer.get("path")
                if not layer_path or not Path(layer_path).exists():
                    continue
                
                # Load mask
                mask_img = Image.open(layer_path)
                if mask_img.mode != 'L':
                    mask_img = mask_img.convert('L')
                mask = np.array(mask_img)
                
                color_label, _ = self.get_layer_color_label(layer)
                layer_masks_for_knockout.append((color_label, mask))
                layer_indices_for_knockout.append(i)
        
        # Apply knockout
        knockout_masks = None
        if apply_knockout and layer_masks_for_knockout:
            print(f"\nApplying spot color knockout ({len(layer_masks_for_knockout)} layers)...")
            knockout_masks, knockout_meta = self._apply_knockout(layer_masks_for_knockout)
            results["knockout_metadata"] = knockout_meta
            
            for lm in knockout_meta.get("layers", []):
                print(f"   {lm['label']}: reduced {lm['reduction_percent']}%")
        
        # ---------------------------------------------------------------
        # STEP 2: Apply halftone to each layer
        # ---------------------------------------------------------------
        consolidated_data = []
        knockout_idx = 0
        
        for i, layer in enumerate(layers):
            if layer.get("layer") == "garment":
                continue
            
            layer_path = layer.get("path")
            if not layer_path or not Path(layer_path).exists():
                continue
            
            category = color_categories[i] if i < len(color_categories) else "neutral"
            settings = self.get_settings_for_layer(i, category)
            
            color_label, rgb_color = self.get_layer_color_label(layer)
            
            print(f"Processing layer {i + 1}: {layer.get('filename')} ({color_label})")
            
            # v2.0: Get knockout mask for this layer if applicable
            k_mask = None
            if knockout_masks is not None and i in layer_indices_for_knockout:
                k_idx = layer_indices_for_knockout.index(i)
                k_mask = knockout_masks[k_idx]
            
            outputs = self.apply_halftone_to_layer(
                layer_path,
                settings,
                output_path,
                color_label=color_label,
                print_color=rgb_color,
                original_alpha=original_alpha,
                dot_shape=settings.dot_shape,
                knockout=apply_knockout,
                knockout_mask=k_mask
            )
            
            # Track for consolidated preview (use 300 DPI version)
            if "dpi_300" in outputs:
                consolidated_data.append((
                    outputs["dpi_300"]["path"],
                    rgb_color,
                    color_label
                ))
                results["individual_previews"].append({
                    "label": color_label,
                    "color": rgb_color,
                    "path": outputs["dpi_300"]["path"].replace("halftone_", "preview_")
                })
            
            results["layers"].append({
                "layer": i + 1,
                "label": color_label,
                "print_color": rgb_color,
                "original_filename": layer.get("filename"),
                "halftone_outputs": outputs,
                "settings": {
                    "lpi": settings.lpi,
                    "angle": settings.angle,
                    "method": settings.method,
                    "dot_shape": settings.dot_shape  # v2.0
                }
            })
            
            results["total_layers"] += 1
        
        # ---------------------------------------------------------------
        # STEP 3: Generate consolidated preview
        # ---------------------------------------------------------------
        if consolidated_data:
            composite_path = output_path / "consolidated_preview.png"
            print(f"\nGenerating consolidated preview...")
            composite_result = self.create_consolidated_preview(
                consolidated_data,
                str(composite_path)
            )
            if composite_result:
                results["consolidated_preview"] = composite_result
                print(f"   Saved: {composite_result}")
        
        # ---------------------------------------------------------------
        # v2.0 STEP 4: Generate multi-layer PSD
        # ---------------------------------------------------------------
        print_preview_pairs = []
        for layer_result in results["layers"]:
            halftone_outputs = layer_result.get("halftone_outputs", {})
            if "dpi_300" in halftone_outputs:
                print_path = halftone_outputs["dpi_300"]["path"]
                preview_path = print_path.replace("halftone_", "preview_")
                print_preview_pairs.append({
                    "label": layer_result["label"],
                    "print_path": print_path,
                    "preview_path": preview_path
                })
        
        if print_preview_pairs:
            psd_result = self._generate_psd(
                original_image_path=original_image_path,
                print_preview_pairs=print_preview_pairs,
                output_dir=output_path,
                width=self.target_width,
                height=self.target_height
            )
            if psd_result:
                results["psd_path"] = psd_result
        
        # ---------------------------------------------------------------
        # STEP 5: Save metadata
        # ---------------------------------------------------------------
        metadata_path = output_path / "halftone_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        results["metadata_path"] = str(metadata_path)
        
        return results


def main():
    """Test the halftone layer processor."""
    print("Halftone Layer Processor v2.0 - Test")
    print("=" * 60)
    
    processor = HalftoneLayerProcessor(
        default_lpi=55,
        output_resolutions=[72, 300]
    )
    
    print("HalftoneLayerProcessor initialized")
    print(f"  - Halftone available: {HALFTONE_AVAILABLE}")
    print(f"  - Default LPI: {processor.default_lpi}")
    print(f"  - Default method: {processor.default_method}")
    print(f"  - Output resolutions: {processor.output_resolutions}")
    print(f"  - Target size: {processor.target_width}x{processor.target_height}px")
    
    print("\nDefault LPI by color (screen):")
    for color, lpi in processor.DEFAULT_LPI_BY_COLOR_SCREEN.items():
        print(f"  {color}: {lpi} LPI")
    
    print("\nDefault angles:")
    for i, angle in enumerate(processor.DEFAULT_ANGLES):
        print(f"  Layer {i + 1}: {angle}°")
    
    print(f"\nv2.0 Features:")
    print(f"  - Elliptical halftone: YES")
    print(f"  - Spot knockout: YES")
    print(f"  - PSD export: YES")


if __name__ == "__main__":
    main()
