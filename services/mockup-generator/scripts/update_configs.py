#!/usr/bin/env python3
"""Update all config.json files with detailed product information."""

import json
import os
from pathlib import Path

TEMPLATES_DIR = Path(__file__).resolve().parents[1] / "templates" / "stanley-stella"
DATA_DIR = Path(__file__).resolve().parents[1] / "data"

# Print area estimates by category
PRINT_AREAS = {
    "t-shirts": {
        "chest": {"x": 150, "y": 180, "width": 500, "height": 600, "max_width": 400, "max_height": 500},
        "center": {"x": 200, "y": 250, "width": 400, "height": 500, "max_width": 350, "max_height": 450}
    },
    "sweatshirts": {
        "chest": {"x": 180, "y": 200, "width": 520, "height": 620, "max_width": 420, "max_height": 520},
        "center": {"x": 230, "y": 270, "width": 420, "height": 520, "max_width": 370, "max_height": 470}
    },
    "hoodies": {
        "chest": {"x": 200, "y": 220, "width": 500, "height": 580, "max_width": 400, "max_height": 480},
        "center": {"x": 250, "y": 290, "width": 400, "height": 480, "max_width": 350, "max_height": 430}
    },
    "jackets": {
        "chest": {"x": 160, "y": 180, "width": 540, "height": 640, "max_width": 440, "max_height": 540},
        "center": {"x": 210, "y": 250, "width": 440, "height": 540, "max_width": 390, "max_height": 490}
    },
    "polos": {
        "chest": {"x": 180, "y": 200, "width": 460, "height": 520, "max_width": 360, "max_height": 420},
        "center": {"x": 230, "y": 270, "width": 360, "height": 420, "max_width": 310, "max_height": 370}
    },
    "bags": {
        "center": {"x": 100, "y": 80, "width": 600, "height": 500, "max_width": 500, "max_height": 400}
    },
    "accessories": {
        "center": {"x": 100, "y": 80, "width": 400, "height": 400, "max_width": 350, "max_height": 350}
    },
    "baby": {
        "chest": {"x": 100, "y": 120, "width": 300, "height": 350, "max_width": 250, "max_height": 300},
        "center": {"x": 130, "y": 150, "width": 250, "height": 300, "max_width": 200, "max_height": 250}
    },
    "pants": {
        "chest": {"x": 180, "y": 200, "width": 440, "height": 500, "max_width": 350, "max_height": 400},
        "center": {"x": 200, "y": 250, "width": 400, "height": 450, "max_width": 320, "max_height": 380}
    },
    "shorts": {
        "chest": {"x": 150, "y": 150, "width": 400, "height": 350, "max_width": 320, "max_height": 280},
        "center": {"x": 180, "y": 180, "width": 350, "height": 300, "max_width": 280, "max_height": 250}
    },
    "tanks": {
        "chest": {"x": 120, "y": 150, "width": 400, "height": 450, "max_width": 320, "max_height": 380},
        "center": {"x": 160, "y": 200, "width": 350, "height": 400, "max_width": 280, "max_height": 340}
    },
    "beanies": {
        "center": {"x": 50, "y": 30, "width": 300, "height": 200, "max_width": 250, "max_height": 150}
    }
}

# Safe zone estimates by category
SAFE_ZONES = {
    "t-shirts": {"x": 180, "y": 200, "width": 440, "height": 500},
    "sweatshirts": {"x": 210, "y": 230, "width": 460, "height": 540},
    "hoodies": {"x": 230, "y": 250, "width": 440, "height": 500},
    "jackets": {"x": 190, "y": 210, "width": 480, "height": 560},
    "polos": {"x": 210, "y": 230, "width": 400, "height": 440},
    "bags": {"x": 120, "y": 100, "width": 560, "height": 460},
    "accessories": {"x": 120, "y": 100, "width": 360, "height": 360},
    "baby": {"x": 120, "y": 140, "width": 260, "height": 300},
    "pants": {"x": 200, "y": 230, "width": 400, "height": 420},
    "shorts": {"x": 170, "y": 170, "width": 360, "height": 300},
    "tanks": {"x": 150, "y": 180, "width": 360, "height": 400},
    "beanies": {"x": 70, "y": 50, "width": 260, "height": 160}
}

# Descriptions by category
DESCRIPTIONS = {
    "t-shirts": "Premium cotton t-shirt for everyday wear",
    "sweatshirts": "Medium-weight crewneck sweatshirt for layering",
    "hoodies": "Heavyweight hoodie for ultimate comfort",
    "jackets": "Lightweight performance jacket for all-weather wear",
    "polos": "Classic polo shirt with premium finish",
    "bags": "Durable bag for everyday use",
    "accessories": "Versatile accessory for any outfit",
    "baby": "Soft and comfortable baby garment",
    "pants": "Comfortable pants for everyday wear",
    "shorts": "Lightweight shorts for warm weather",
    "tanks": "Sleeveless top for layering or summer wear",
    "beanies": "Knitted beanie for cold weather"
}

# Default compositions
COMPOSITIONS = {
    "cotton": "100% organic cotton",
    "cotton_light": "100% organic cotton",
    "cotton_heavy": "100% organic cotton",
    "french_terry": "80% cotton / 20% polyester",
    "fleece": "80% cotton / 20% polyester",
    "polyester": "100% recycled polyester",
    "tri-blend": "50% polyester / 25% cotton / 25% rayon"
}


def get_fabric_type(gsm: int, name: str = "") -> str:
    """Determine fabric type from GSM and product name."""
    name_lower = name.lower()
    
    if "polyester" in name_lower or "dry" in name_lower:
        return "polyester"
    if "heather" in name_lower or "tri-blend" in name_lower:
        return "tri-blend"
    
    if gsm <= 170:
        return "cotton_light"
    elif gsm <= 220:
        return "cotton"
    elif gsm <= 280:
        return "cotton_heavy"
    elif gsm <= 350:
        return "french_terry"
    else:
        return "fleece"


def load_products():
    """Load products.json data."""
    with open(DATA_DIR / "products.json") as f:
        data = json.load(f)
    return {p["sku"]: p for p in data["products"]}


def load_colors():
    """Load color-reference.json data."""
    with open(DATA_DIR / "color-reference.json") as f:
        return json.load(f)


def get_category_from_path(path: Path) -> str:
    """Extract category from folder path."""
    parts = path.parts
    if "stanley-stella" in parts:
        idx = parts.index("stanley-stella")
        if idx + 1 < len(parts):
            return parts[idx + 1]
    return "t-shirts"


def get_product_name(sku: str, products: dict) -> str:
    """Get product name from SKU."""
    if sku in products:
        return products[sku].get("name", "")
    return ""


def get_product_sizes(sku: str, products: dict) -> list:
    """Get product sizes from SKU."""
    if sku in products:
        return products[sku].get("sizes", ["XS", "S", "M", "L", "XL", "XXL"])
    return ["XS", "S", "M", "L", "XL", "XXL"]


def get_product_gsm(sku: str, products: dict) -> int:
    """Get product GSM from SKU."""
    if sku in products:
        return products[sku].get("gsm", 180)
    return 180


def get_product_fit(sku: str, products: dict) -> str:
    """Get product fit from SKU."""
    if sku in products:
        return products[sku].get("fit", "Medium Fit")
    return "Medium Fit"


def update_config(config_path: Path, products: dict, color_ref: dict):
    """Update a single config.json file."""
    with open(config_path) as f:
        config = json.load(f)
    
    sku = config.get("sku", "")
    category = config.get("category", get_category_from_path(config_path))
    name = config.get("name", get_product_name(sku, products))
    gsm = config.get("gsm", get_product_gsm(sku, products))
    fit = config.get("fit", get_product_fit(sku, products))
    sizes = get_product_sizes(sku, products)
    
    # Determine fabric type
    fabric_type = config.get("fabric_type", get_fabric_type(gsm, name))
    
    # Get composition
    composition = COMPOSITIONS.get(fabric_type, "100% organic cotton")
    
    # Get description
    description = DESCRIPTIONS.get(category, "Premium garment for everyday wear")
    
    # Get print area and safe zone for category
    print_area = PRINT_AREAS.get(category, PRINT_AREAS["t-shirts"])
    safe_zone = SAFE_ZONES.get(category, SAFE_ZONES["t-shirts"])
    
    # Update colors with hex codes and availability
    updated_colors = {}
    for color_id, color_data in config.get("colors", {}).items():
        hex_code = color_ref.get(color_id, {}).get("hex", "#FFFFFF")
        # Determine availability based on front image presence
        color_folder = config_path.parent / f"{color_id}_{color_data.get('name', '').replace(' ', '')}"
        if not color_folder.exists():
            # Try to find folder with just the color code
            for folder in config_path.parent.iterdir():
                if folder.is_dir() and folder.name.startswith(color_id + "_"):
                    color_folder = folder
                    break
        
        has_front = color_data.get("has_front", True)
        has_back = color_data.get("has_back", True)
        has_detail = color_data.get("has_detail", False)
        
        updated_colors[color_id] = {
            "name": color_data.get("name", color_ref.get(color_id, {}).get("name", f"Color {color_id}")),
            "hex": hex_code,
            "available": has_front or has_back,
            "has_front": has_front,
            "has_back": has_back,
            "has_detail": has_detail
        }
    
    # Build updated config
    updated_config = {
        "sku": sku,
        "name": name,
        "category": category,
        "description": description,
        "fabric_type": fabric_type,
        "gsm": gsm,
        "fit": fit,
        "sizes": sizes,
        "composition": composition,
        "print_area": print_area,
        "safe_zone": safe_zone,
        "colors": updated_colors
    }
    
    # Write updated config
    with open(config_path, "w") as f:
        json.dump(updated_config, f, indent=2)
    
    print(f"Updated: {config_path.relative_to(TEMPLATES_DIR)} ({sku})")


def main():
    """Main function to update all config files."""
    products = load_products()
    color_ref = load_colors()
    
    # Find all config.json files
    config_files = list(TEMPLATES_DIR.rglob("config.json"))
    
    print(f"Found {len(config_files)} config files")
    
    for config_path in sorted(config_files):
        try:
            update_config(config_path, products, color_ref)
        except Exception as e:
            print(f"Error updating {config_path}: {e}")
    
    print("Done!")


if __name__ == "__main__":
    main()
