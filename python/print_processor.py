#!/usr/bin/env python3
"""
Print Processor - Server-side image processing for screen printing
Generates multi-page TIFF files with color separation and halftones
"""

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import argparse
import json
from datetime import datetime
from typing import List, Dict, Tuple
import io

# Print specifications
A2_WIDTH_MM = 420
A2_HEIGHT_MM = 594
DPI = 300
MARGIN_MM = 10
FOOTER_HEIGHT_MM = 8
MAX_DESIGN_WIDTH_MM = 380
MAX_DESIGN_HEIGHT_MM = 550
HALFTONE_LPI = 45
HALFTONE_ANGLE = 45

# Color clusters for screen printing
COLOR_CLUSTERS = [
    {
        "name": "White Base",
        "pantone": "Process White",
        "hex": "#FFFFFF",
        "is_base": True,
    },
    {"name": "Process Black", "pantone": "Process Black", "hex": "#000000"},
    {"name": "PMS 485 C Red", "pantone": "PMS 485 C", "hex": "#DA291C"},
    {"name": "PMS 116 C Yellow", "pantone": "PMS 116 C", "hex": "#FFCD00"},
    {"name": "PMS 300 C Blue", "pantone": "PMS 300 C", "hex": "#0066CC"},
    {"name": "PMS 350 C Green", "pantone": "PMS 350 C", "hex": "#2D5F2D"},
    {"name": "PMS 259 C Purple", "pantone": "PMS 259 C", "hex": "#6B2D5C"},
    {"name": "PMS 152 C Orange", "pantone": "PMS 152 C", "hex": "#FF6B35"},
]


def mm_to_pixels(mm: float, dpi: int = DPI) -> int:
    """Convert millimeters to pixels"""
    return int((mm * dpi) / 25.4)


def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))


def create_registration_mark(size: int = 40) -> np.ndarray:
    """Create registration mark pattern"""
    mark = np.ones((size, size, 3), dtype=np.uint8) * 255
    center = size // 2

    # Draw cross
    cv2.line(mark, (0, center), (size, center), (0, 0, 0), 2)
    cv2.line(mark, (center, 0), (center, size), (0, 0, 0), 2)

    # Draw circle
    cv2.circle(mark, (center, center), size // 4, (0, 0, 0), 2)

    return mark


def add_registration_marks(canvas: np.ndarray, margin_px: int) -> np.ndarray:
    """Add registration marks to canvas corners"""
    h, w = canvas.shape[:2]
    mark_size = 40
    mark_offset = margin_px - 10

    mark = create_registration_mark(mark_size)

    # Four corners
    positions = [
        (mark_offset, mark_offset),  # Top-left
        (w - mark_offset - mark_size, mark_offset),  # Top-right
        (mark_offset, h - mark_offset - mark_size),  # Bottom-left
        (w - mark_offset - mark_size, h - mark_offset - mark_size),  # Bottom-right
    ]

    for x, y in positions:
        canvas[y : y + mark_size, x : x + mark_size] = mark

    return canvas


def add_footer_text(
    canvas: np.ndarray,
    customer_name: str,
    design_name: str,
    order_number: str,
    color_info: str,
) -> np.ndarray:
    """Add footer text to canvas"""
    h, w = canvas.shape[:2]
    margin_px = mm_to_pixels(MARGIN_MM)
    footer_y = h - margin_px - 20

    # Convert to PIL for text rendering
    pil_img = Image.fromarray(canvas)
    draw = ImageDraw.Draw(pil_img)

    # Use default font (in production, specify font path)
    try:
        font = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24
        )
    except:
        font = ImageFont.load_default()

    footer_text = f"{customer_name} | {design_name} | {order_number} | {color_info}"
    draw.text((margin_px + 20, footer_y), footer_text, fill=(0, 0, 0), font=font)

    return np.array(pil_img)


def generate_halftone(
    image: np.ndarray, lpi: int = HALFTONE_LPI, angle: int = HALFTONE_ANGLE
) -> np.ndarray:
    """Generate halftone pattern using ordered dithering"""
    # Convert to grayscale if needed
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image

    # Bayer matrix for ordered dithering (8x8)
    bayer = np.array(
        [
            [0, 48, 12, 60, 3, 51, 15, 63],
            [32, 16, 44, 28, 35, 19, 47, 31],
            [8, 56, 4, 52, 11, 59, 7, 55],
            [40, 24, 36, 20, 43, 27, 39, 23],
            [2, 50, 14, 62, 1, 49, 13, 61],
            [34, 18, 46, 30, 33, 17, 45, 29],
            [10, 58, 6, 54, 9, 57, 5, 53],
            [42, 26, 38, 22, 41, 25, 37, 21],
        ]
    )

    # Normalize Bayer matrix to 0-255 range
    bayer = (bayer / 64) * 255

    # Calculate dot size
    dot_size = int(DPI / lpi)

    # Create output
    output = np.zeros_like(gray)
    h, w = gray.shape

    # Apply dithering
    for y in range(h):
        for x in range(w):
            # Get Bayer threshold
            bx = (x // (dot_size // 8)) % 8
            by = (y // (dot_size // 8)) % 8
            threshold = bayer[by, bx]

            # Apply threshold
            output[y, x] = 0 if gray[y, x] < threshold else 255

    return output


def extract_color_channel(
    image: np.ndarray, target_rgb: Tuple[int, int, int], tolerance: int = 30
) -> np.ndarray:
    """Extract color channel from image"""
    # Convert to RGB if needed
    if len(image.shape) == 3:
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    else:
        rgb = image

    # Create mask for target color
    lower = np.array([max(0, c - tolerance) for c in target_rgb])
    upper = np.array([min(255, c + tolerance) for c in target_rgb])
    mask = cv2.inRange(rgb, lower, upper)

    # Convert mask to grayscale (inverted - ink areas are dark)
    gray = 255 - mask

    return gray


def create_print_canvas() -> Tuple[np.ndarray, Dict]:
    """Create A2 canvas with margins"""
    width_px = mm_to_pixels(A2_WIDTH_MM)
    height_px = mm_to_pixels(A2_HEIGHT_MM)
    margin_px = mm_to_pixels(MARGIN_MM)

    # Create white canvas
    canvas = np.ones((height_px, width_px, 3), dtype=np.uint8) * 255

    # Calculate design area
    design_area = {
        "x": margin_px,
        "y": margin_px,
        "width": mm_to_pixels(MAX_DESIGN_WIDTH_MM),
        "height": mm_to_pixels(MAX_DESIGN_HEIGHT_MM),
    }

    return canvas, design_area


def generate_composite_page(
    image_path: str,
    customer_name: str,
    design_name: str,
    order_number: str,
    design_position: Dict[str, float],
    design_size: Dict[str, float],
) -> np.ndarray:
    """Generate composite page (full color preview)"""
    canvas, design_area = create_print_canvas()

    # Load design image
    design = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
    if design is None:
        raise ValueError(f"Could not load image: {image_path}")

    # Calculate position and size
    x = int(design_area["x"] + (design_position["x"] / 100) * design_area["width"])
    y = int(design_area["y"] + (design_position["y"] / 100) * design_area["height"])
    w = int((design_size["width"] / 100) * design_area["width"])
    h = int((design_size["height"] / 100) * design_area["height"])

    # Resize design
    design_resized = cv2.resize(design, (w, h))

    # Place on canvas
    canvas[y : y + h, x : x + w] = design_resized

    # Add registration marks
    margin_px = mm_to_pixels(MARGIN_MM)
    canvas = add_registration_marks(canvas, margin_px)

    # Add footer
    canvas = add_footer_text(
        canvas, customer_name, design_name, order_number, "COMPOSITE"
    )

    return canvas


def generate_separation_page(
    image_path: str,
    color: Dict,
    customer_name: str,
    design_name: str,
    order_number: str,
    design_position: Dict[str, float],
    design_size: Dict[str, float],
) -> np.ndarray:
    """Generate color separation page"""
    canvas, design_area = create_print_canvas()

    # Load design image
    design = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
    if design is None:
        raise ValueError(f"Could not load image: {image_path}")

    # Extract color channel
    target_rgb = hex_to_rgb(color["hex"])
    channel = extract_color_channel(design, target_rgb)

    # Apply halftone
    halftone = generate_halftone(channel)

    # Calculate position and size
    x = int(design_area["x"] + (design_position["x"] / 100) * design_area["width"])
    y = int(design_area["y"] + (design_position["y"] / 100) * design_area["height"])
    w = int((design_size["width"] / 100) * design_area["width"])
    h = int((design_size["height"] / 100) * design_area["height"])

    # Resize halftone
    halftone_resized = cv2.resize(halftone, (w, h))

    # Convert to 3-channel
    halftone_3ch = cv2.cvtColor(halftone_resized, cv2.COLOR_GRAY2BGR)

    # Place on canvas
    canvas[y : y + h, x : x + w] = halftone_3ch

    # Add registration marks
    margin_px = mm_to_pixels(MARGIN_MM)
    canvas = add_registration_marks(canvas, margin_px)

    # Add footer
    color_info = f"{color['pantone']} {color['name']}".upper()
    canvas = add_footer_text(
        canvas, customer_name, design_name, order_number, color_info
    )

    return canvas


def generate_print_ready_file(
    image_path: str,
    customer_name: str,
    design_name: str,
    order_number: str,
    colors: List[Dict],
    design_position: Dict[str, float],
    design_size: Dict[str, float],
    output_path: str,
) -> str:
    """Generate complete print-ready multi-page TIFF file"""
    pages = []

    # Page 1: Composite
    print("Generating composite page...")
    composite = generate_composite_page(
        image_path,
        customer_name,
        design_name,
        order_number,
        design_position,
        design_size,
    )
    pages.append(composite)

    # Pages 2-N: Color separations
    for i, color in enumerate(colors):
        print(
            f"Generating separation page {i + 2}/{len(colors) + 1} for {color['name']}..."
        )
        separation = generate_separation_page(
            image_path,
            color,
            customer_name,
            design_name,
            order_number,
            design_position,
            design_size,
        )
        pages.append(separation)

    # Save as multi-page TIFF
    print(f"Saving to {output_path}...")

    # Convert to PIL images
    pil_pages = [
        Image.fromarray(cv2.cvtColor(page, cv2.COLOR_BGR2RGB)) for page in pages
    ]

    # Save first page
    pil_pages[0].save(
        output_path,
        save_all=True,
        append_images=pil_pages[1:],
        resolution=DPI,
        compression="tiff_lzw",
    )

    return output_path


def main():
    parser = argparse.ArgumentParser(description="Generate print-ready TIFF files")
    parser.add_argument("--image", required=True, help="Path to input image")
    parser.add_argument("--customer", required=True, help="Customer name")
    parser.add_argument("--design", required=True, help="Design name")
    parser.add_argument("--order", required=True, help="Order number")
    parser.add_argument("--colors", required=True, help="JSON array of color objects")
    parser.add_argument(
        "--position", default='{"x": 0, "y": 0}', help="Design position JSON"
    )
    parser.add_argument(
        "--size", default='{"width": 100, "height": 100}', help="Design size JSON"
    )
    parser.add_argument("--output", required=True, help="Output file path")

    args = parser.parse_args()

    # Parse JSON arguments
    colors = json.loads(args.colors)
    position = json.loads(args.position)
    size = json.loads(args.size)

    # Generate file
    output_path = generate_print_ready_file(
        args.image,
        args.customer,
        args.design,
        args.order,
        colors,
        position,
        size,
        args.output,
    )

    print(f"Successfully generated: {output_path}")


if __name__ == "__main__":
    main()
