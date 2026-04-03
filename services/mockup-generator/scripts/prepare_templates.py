"""
Template Preparation Script

Processes Stanley Stella mockup images to extract template configuration.
Based on CTDave001's automated_mockups placeholder detection logic.

Usage:
    python scripts/prepare_templates.py --input ./raw_mockups --output ./templates

Requirements:
    - Raw mockups with colored placeholder boxes (red #FF0000)
    - Clean blank versions of same mockups
"""

import argparse
import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image


def detect_placeholder_box(
    image_path: str,
    target_color: Tuple[int, int, int] = (255, 0, 0),  # Red
    tolerance: int = 30
) -> Optional[Dict]:
    """
    Detect colored placeholder box in mockup image
    
    Based on CTDave001's color detection algorithm
    
    Args:
        image_path: Path to image with placeholder box
        target_color: RGB color to detect (default: red)
        tolerance: Color matching tolerance (0-255)
    
    Returns:
        Dict with position, size, rotation or None if not found
    """
    # Load image
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not load image: {image_path}")
    
    # Convert to RGB
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Create color range
    lower_bound = np.array([max(0, c - tolerance) for c in target_color])
    upper_bound = np.array([min(255, c + tolerance) for c in target_color])
    
    # Create mask for target color
    mask = cv2.inRange(img_rgb, lower_bound, upper_bound)
    
    # Find contours
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        return None
    
    # Find largest contour (assuming it's the placeholder box)
    largest_contour = max(contours, key=cv2.contourArea)
    
    # Get minimum area rectangle (handles rotation)
    rect = cv2.minAreaRect(largest_contour)
    center, size, angle = rect
    
    # Convert to dict
    return {
        "center_x": float(center[0]),
        "center_y": float(center[1]),
        "width": float(size[0]),
        "height": float(size[1]),
        "rotation": float(angle),
        "area": float(cv2.contourArea(largest_contour))
    }


def create_template_config(
    product_name: str,
    sku: str,
    category: str,
    placeholder_data: Dict,
    available_views: List[str],
    fabric_type: str = "cotton"
) -> Dict:
    """
    Create template configuration from placeholder detection data
    
    Args:
        product_name: Human-readable product name
        sku: Product SKU
        category: Product category (t-shirts, hoodies, etc.)
        placeholder_data: Data from detect_placeholder_box
        available_views: List of available views
        fabric_type: Default fabric type
    
    Returns:
        Template configuration dict
    """
    # Calculate print area from placeholder
    center_x = placeholder_data["center_x"]
    center_y = placeholder_data["center_y"]
    width = placeholder_data["width"]
    height = placeholder_data["height"]
    rotation = placeholder_data["rotation"]
    
    # Calculate top-left corner
    x = int(center_x - width / 2)
    y = int(center_y - height / 2)
    
    # Calculate safe zone (10% margin inside print area)
    safe_margin = 0.1
    safe_x = int(x + width * safe_margin)
    safe_y = int(y + height * safe_margin)
    safe_width = int(width * (1 - 2 * safe_margin))
    safe_height = int(height * (1 - 2 * safe_margin))
    
    return {
        "sku": sku,
        "name": product_name,
        "category": category,
        "product_type": category.rstrip('s'),  # t-shirts -> t-shirt
        "placement": "front_chest",  # Default, can be customized
        "print_area": {
            "x": x,
            "y": y,
            "width": int(width),
            "height": int(height)
        },
        "safe_zone": {
            "x": safe_x,
            "y": safe_y,
            "width": safe_width,
            "height": safe_height
        },
        "fabric_type": fabric_type,
        "available_views": available_views,
        "rotation": rotation,
        "detection_confidence": placeholder_data["area"] / (width * height)
    }


def process_product(
    product_dir: Path,
    output_dir: Path,
    target_color: Tuple[int, int, int] = (255, 0, 0),
    tolerance: int = 30
) -> bool:
    """
    Process a single product directory
    
    Args:
        product_dir: Directory containing raw mockups
        output_dir: Directory to write template files
        target_color: Color of placeholder box
        tolerance: Detection tolerance
    
    Returns:
        True if successful
    """
    product_name = product_dir.name
    print(f"Processing {product_name}...")
    
    # Find raw mockup with placeholder
    box_mockups = list(product_dir.glob("*box*.png")) + list(product_dir.glob("*placeholder*.png"))
    if not box_mockups:
        print(f"  Warning: No placeholder mockup found for {product_name}")
        return False
    
    # Use first box mockup for detection
    box_mockup_path = box_mockups[0]
    
    try:
        # Detect placeholder
        placeholder_data = detect_placeholder_box(
            str(box_mockup_path),
            target_color=target_color,
            tolerance=tolerance
        )
        
        if placeholder_data is None:
            print(f"  Warning: Could not detect placeholder in {box_mockup_path}")
            return False
        
        print(f"  Detected placeholder: {placeholder_data['width']:.0f}x{placeholder_data['height']:.0f} at ({placeholder_data['center_x']:.0f}, {placeholder_data['center_y']:.0f})")
        
        # Determine SKU from directory name or metadata
        sku = product_name.upper().replace("-", "_")
        
        # Determine category from parent directory
        category = product_dir.parent.name
        
        # Find all available views
        available_views = []
        for view_file in product_dir.glob("*.png"):
            view_name = view_file.stem.replace("_blank", "").replace("_clean", "")
            if view_name not in ["box", "placeholder"]:
                available_views.append(view_name)
        
        if not available_views:
            available_views = ["flat"]
        
        # Create config
        config = create_template_config(
            product_name=product_name.replace("-", " ").title(),
            sku=sku,
            category=category,
            placeholder_data=placeholder_data,
            available_views=available_views
        )
        
        # Create output directory structure
        template_dir = output_dir / category / product_name
        template_dir.mkdir(parents=True, exist_ok=True)
        (template_dir / "blank").mkdir(exist_ok=True)
        (template_dir / "mask").mkdir(exist_ok=True)
        
        # Write config
        config_path = template_dir / "config.json"
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)
        
        print(f"  Created config: {config_path}")
        
        # Copy clean/blank mockups
        for view in available_views:
            view_files = list(product_dir.glob(f"*{view}*.png"))
            view_files = [f for f in view_files if "box" not in f.name and "placeholder" not in f.name]
            
            if view_files:
                # Copy first matching file as blank
                src = view_files[0]
                dst = template_dir / "blank" / f"{view}.png"
                
                # Load and save with PIL to ensure consistency
                img = Image.open(src)
                img.save(dst)
                print(f"  Copied blank: {dst}")
        
        # Create mask (white box where design goes)
        mask = Image.new('L', (int(placeholder_data["width"]), int(placeholder_data["height"])), 255)
        mask_path = template_dir / "mask" / "flat.png"
        mask.save(mask_path)
        print(f"  Created mask: {mask_path}")
        
        return True
        
    except Exception as e:
        print(f"  Error processing {product_name}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Process Stanley Stella mockups into templates"
    )
    parser.add_argument(
        "--input", "-i",
        required=True,
        help="Input directory with raw mockups"
    )
    parser.add_argument(
        "--output", "-o",
        required=True,
        help="Output directory for templates"
    )
    parser.add_argument(
        "--color", "-c",
        default="#FF0000",
        help="Placeholder box color (hex, default: #FF0000)"
    )
    parser.add_argument(
        "--tolerance", "-t",
        type=int,
        default=30,
        help="Color detection tolerance (default: 30)"
    )
    
    args = parser.parse_args()
    
    # Parse color
    color_hex = args.color.lstrip('#')
    target_color = tuple(int(color_hex[i:i+2], 16) for i in (0, 2, 4))
    
    input_dir = Path(args.input)
    output_dir = Path(args.output)
    
    if not input_dir.exists():
        print(f"Error: Input directory not found: {input_dir}")
        return 1
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Processing mockups from {input_dir}")
    print(f"Outputting templates to {output_dir}")
    print(f"Target color: {target_color}, Tolerance: {args.tolerance}")
    print()
    
    # Process all products
    success_count = 0
    total_count = 0
    
    for category_dir in input_dir.iterdir():
        if not category_dir.is_dir():
            continue
        
        print(f"\nCategory: {category_dir.name}")
        print("=" * 50)
        
        for product_dir in category_dir.iterdir():
            if not product_dir.is_dir():
                continue
            
            total_count += 1
            if process_product(product_dir, output_dir, target_color, args.tolerance):
                success_count += 1
    
    print()
    print("=" * 50)
    print(f"Processing complete: {success_count}/{total_count} products successful")
    
    return 0 if success_count == total_count else 1


if __name__ == "__main__":
    exit(main())
