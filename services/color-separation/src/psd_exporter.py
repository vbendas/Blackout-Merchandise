"""
Layered PSD Exporter

Creates multi-layer PSD files with print and preview layers.
Uses pytoshop for native PSD creation with proper layer support.

Layer structure (bottom to top):
1. Background White
2. Background Black  
3. Original Image (reference)
4. [Color] Print (grayscale halftone)
5. [Color] Preview (colored)
6. ... repeat for each color

Print layers: Normal blending, grayscale
Preview layers: Normal blending, colored
"""

import numpy as np
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from io import BytesIO

import pytoshop
from pytoshop import layers
from pytoshop.enums import ColorMode, ChannelId


@dataclass
class PSDLayer:
    """Represents a single layer in the PSD."""
    name: str
    image_data: np.ndarray
    color_mode: str  # 'grayscale' or 'rgb'
    opacity: int = 255
    visible: bool = True
    blend_mode: str = 'normal'


class PSDExporter:
    """
    Exports print layers as multi-layer PSD.
    
    Features:
    - Named layers ("Color Name Print", "Color Name Preview")
    - Background layers (White, Black)
    - Original image reference layer
    - Proper resolution and dimensions
    """
    
    # Blend mode mappings
    BLEND_MODES = {
        'normal': b'norm',
        'multiply': b'mul ',
        'screen': b'scrn',
        'overlay': b'over',
    }
    
    def __init__(self, dpi: int = 300):
        """
        Initialize PSD exporter.
        
        Args:
            dpi: Resolution in dots per inch
        """
        self.dpi = dpi
    
    def create_psd(
        self,
        layers_data: List[PSDLayer],
        output_path: str,
        width: int = 4488,
        height: int = 6142,
        include_backgrounds: bool = True
    ) -> str:
        """
        Create a layered PSD file.
        
        Args:
            layers_data: List of PSDLayer objects (bottom to top)
            output_path: Where to save the PSD
            width: Image width in pixels
            height: Image height in pixels
            include_backgrounds: Add Background White/Black layers
        
        Returns:
            Path to created PSD file
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Prepare all layers
        all_layers = []
        
        # Add background layers if requested
        if include_backgrounds:
            bg_white = self._create_background_layer(
                width, height, (255, 255, 255), "Background White"
            )
            bg_black = self._create_background_layer(
                width, height, (0, 0, 0), "Background Black"
            )
            all_layers.extend([bg_white, bg_black])
        
        # Add user layers
        all_layers.extend(layers_data)
        
        # Create PSD using pytoshop
        self._write_psd_pytoshop(all_layers, output_path, width, height)
        
        return str(output_path)
    
    def _create_background_layer(
        self,
        width: int,
        height: int,
        color: Tuple[int, int, int],
        name: str
    ) -> PSDLayer:
        """Create a solid color background layer."""
        image = np.zeros((height, width, 3), dtype=np.uint8)
        image[:, :, 0] = color[0]
        image[:, :, 1] = color[1]
        image[:, :, 2] = color[2]
        
        return PSDLayer(
            name=name,
            image_data=image,
            color_mode='rgb',
            opacity=255,
            visible=False  # Hidden by default
        )
    
    def _write_psd_pytoshop(
        self,
        psd_layers: List[PSDLayer],
        output_path: Path,
        width: int,
        height: int
    ):
        """
        Write PSD using pytoshop library.
        
        Creates proper layered PSD with:
        - Layer records with names
        - Channel data for each layer
        - Proper blending modes and opacity
        """
        # Create PSD document (RGB mode)
        psd = pytoshop.core.PsdFile(
            num_channels=3,
            height=height,
            width=width
        )
        
        # Create layer records
        layer_records = []
        
        for layer in psd_layers:
            # Prepare image data
            if layer.color_mode == 'grayscale':
                # Grayscale - create 3 identical channels
                gray = layer.image_data.astype(np.uint8)
                if gray.ndim == 3:
                    gray = gray[:, :, 0]
                
                # Ensure proper dimensions
                if gray.shape != (height, width):
                    from PIL import Image
                    gray_img = Image.fromarray(gray, mode='L')
                    gray_img = gray_img.resize((width, height), Image.Resampling.LANCZOS)
                    gray = np.array(gray_img)
                
                # Create channels
                channel_data = {
                    ChannelId.red: layers.ChannelImageData(image=gray),
                    ChannelId.green: layers.ChannelImageData(image=gray),
                    ChannelId.blue: layers.ChannelImageData(image=gray)
                }
            else:
                # RGB
                rgb = layer.image_data.astype(np.uint8)
                if rgb.ndim == 2:
                    # Single channel, replicate
                    rgb = np.stack([rgb, rgb, rgb], axis=-1)
                
                # Ensure proper shape
                if rgb.shape[:2] != (height, width):
                    from PIL import Image
                    if rgb.shape[2] == 4:
                        rgb_img = Image.fromarray(rgb, mode='RGBA')
                    else:
                        rgb_img = Image.fromarray(rgb, mode='RGB')
                    rgb_img = rgb_img.resize((width, height), Image.Resampling.LANCZOS)
                    rgb = np.array(rgb_img)
                
                if rgb.ndim == 3 and rgb.shape[2] >= 3:
                    r = rgb[:, :, 0]
                    g = rgb[:, :, 1]
                    b = rgb[:, :, 2]
                else:
                    r = g = b = rgb
                
                channel_data = {
                    ChannelId.red: layers.ChannelImageData(image=r),
                    ChannelId.green: layers.ChannelImageData(image=g),
                    ChannelId.blue: layers.ChannelImageData(image=b)
                }
            
            # Create layer record
            blend_mode = self.BLEND_MODES.get(
                layer.blend_mode, 
                b'norm'
            )
            
            layer_record = layers.LayerRecord(
                top=0,
                left=0,
                bottom=height,
                right=width,
                blend_mode=blend_mode,
                opacity=layer.opacity,
                visible=layer.visible,
                name=layer.name,
                channels=channel_data
            )
            
            layer_records.append(layer_record)
        
        # Create layer info (reversed - bottom layer last in PSD format)
        layer_info = layers.LayerInfo(
            layer_records=list(reversed(layer_records)),
            use_alpha_channel=False
        )
        
        # Set layer info on PSD
        psd.layer_and_mask_info.layer_info = layer_info
        
        # Write PSD to file
        with open(output_path, 'wb') as f:
            psd.write(f)
    
    def create_print_ready_psd(
        self,
        original_image: np.ndarray,
        print_layers: List[Tuple[str, np.ndarray]],
        preview_layers: List[Tuple[str, np.ndarray]],
        output_path: str,
        width: int = 4488,
        height: int = 6142
    ) -> str:
        """
        Create a print-ready PSD with all layers.
        
        Args:
            original_image: Original design image (RGB)
            print_layers: List of (color_name, halftone_array) tuples
            preview_layers: List of (color_name, preview_array) tuples
            output_path: Output path
            width: Target width
            height: Target height
        
        Returns:
            Path to created PSD
        """
        layers_data = []
        
        # Add original image layer
        if original_image is not None:
            if original_image.shape[:2] != (height, width):
                from PIL import Image
                pil_img = Image.fromarray(original_image)
                pil_img = pil_img.resize((width, height), Image.Resampling.LANCZOS)
                original_image = np.array(pil_img)
            
            layers_data.append(PSDLayer(
                name="Original Image",
                image_data=original_image,
                color_mode='rgb',
                visible=False  # Hidden by default
            ))
        
        # Add print and preview layers for each color
        for (color_name, print_data), (_, preview_data) in zip(
            print_layers, preview_layers
        ):
            # Resize if needed
            if print_data.shape[:2] != (height, width):
                from PIL import Image
                
                pil_print = Image.fromarray(print_data, mode='L')
                pil_print = pil_print.resize((width, height), Image.Resampling.LANCZOS)
                print_data = np.array(pil_print)
                
                pil_preview = Image.fromarray(preview_data)
                if pil_preview.mode == 'RGBA':
                    pil_preview = pil_preview.convert('RGB')
                pil_preview = pil_preview.resize((width, height), Image.Resampling.LANCZOS)
                preview_data = np.array(pil_preview)
            
            # Print layer (grayscale halftone)
            layers_data.append(PSDLayer(
                name=f"{color_name} Print",
                image_data=print_data,
                color_mode='grayscale',
                visible=True
            ))
            
            # Preview layer (colored)
            layers_data.append(PSDLayer(
                name=f"{color_name} Preview",
                image_data=preview_data,
                color_mode='rgb',
                visible=True
            ))
        
        return self.create_psd(
            layers_data,
            output_path,
            width,
            height,
            include_backgrounds=True
        )


def main():
    """Test the PSD exporter."""
    print("PSD Exporter - Test")
    print("=" * 60)
    
    # Create test data (small for speed)
    test_w, test_h = 512, 512
    
    print(f"\n[1] Creating test layers ({test_w}x{test_h})")
    
    # Original image
    original = np.random.randint(0, 255, (test_h, test_w, 3), dtype=np.uint8)
    
    # Print layers (grayscale halftone)
    print_layers = [
        ("Turquoise", np.random.randint(0, 255, (test_h, test_w), dtype=np.uint8)),
        ("Magenta", np.random.randint(0, 255, (test_h, test_w), dtype=np.uint8))
    ]
    
    # Preview layers (colored)
    preview_layers = [
        ("Turquoise", np.random.randint(0, 255, (test_h, test_w, 3), dtype=np.uint8)),
        ("Magenta", np.random.randint(0, 255, (test_h, test_w, 3), dtype=np.uint8))
    ]
    
    print(f"   Original: {original.shape}")
    print(f"   Print layers: {len(print_layers)}")
    print(f"   Preview layers: {len(preview_layers)}")
    
    # Create exporter
    exporter = PSDExporter(dpi=300)
    
    print("\n[2] Creating print-ready PSD...")
    output_path = "/tmp/print_ready_test.psd"
    
    try:
        result_path = exporter.create_print_ready_psd(
            original_image=original,
            print_layers=print_layers,
            preview_layers=preview_layers,
            output_path=output_path,
            width=test_w,
            height=test_h
        )
        print(f"   Saved: {result_path}")
        
        # Verify file
        import os
        file_size = os.path.getsize(result_path)
        print(f"   File size: {file_size / 1024 / 1024:.1f} MB")
        
        # Try to read back
        print("\n[3] Verifying PSD structure...")
        with open(result_path, 'rb') as f:
            psd = pytoshop.core.PsdFile.read(f)
            print(f"   Dimensions: {psd.width}x{psd.height}")
            print(f"   Channels: {psd.num_channels}")
            print(f"   Color mode: {psd.color_mode}")
            
            if psd.layer_and_mask_info.layer_info:
                layer_count = len(psd.layer_and_mask_info.layer_info.layer_records)
                print(f"   Layers: {layer_count}")
                for i, lr in enumerate(reversed(psd.layer_and_mask_info.layer_info.layer_records)):
                    print(f"     Layer {i+1}: '{lr.name}' ({lr.width}x{lr.height})")
            else:
                print("   No layer info found")
        
        print("\n   PSD verified successfully!")
        
    except Exception as e:
        print(f"   Error: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 60)
    print("Test complete!")


if __name__ == "__main__":
    main()
