# Template Directory Structure

This directory contains product templates for mockup generation.

## Structure

```
templates/
└── stanley-stella/
    ├── t-shirts/
    │   ├── creator/
    │   │   ├── config.json          # Template configuration
    │   │   ├── blank/               # Clean product images
    │   │   │   ├── flat.png
    │   │   │   └── worn.png
    │   │   └── mask/                # Printable area masks
    │   │       └── flat.png
    │   └── changer/
    │       └── ...
    ├── hoodies/
    │   ├── connector/
    │   └── cultor/
    └── sweatshirts/
        └── changer/
```

## Adding New Products

1. Create directory: `templates/stanley-stella/{category}/{product-name}/`

2. Create subdirectories:
   - `blank/` - Clean product mockups (no placeholder boxes)
   - `mask/` - Masks defining printable areas

3. Create `config.json`:
```json
{
  "sku": "PRODUCT_SKU",
  "name": "Product Name",
  "category": "category-name",
  "product_type": "product-type",
  "placement": "front_chest",
  "print_area": {
    "x": 350,
    "y": 300,
    "width": 500,
    "height": 600
  },
  "safe_zone": {
    "x": 400,
    "y": 350,
    "width": 400,
    "height": 500
  },
  "fabric_type": "cotton",
  "available_views": ["flat", "worn", "closeup"]
}
```

4. Add images to `blank/` directory for each view

## Using the Preparation Script

Instead of manual setup, use the preparation script:

```bash
python scripts/prepare_templates.py \
  --input ./raw_mockups \
  --output ./templates/stanley-stella
```

Requirements for preparation script:
- Raw mockups with colored placeholder boxes (red #FF0000)
- Clean/blank versions of same mockups
- Organized by category/product

## Config.json Fields

- **sku**: Product SKU (e.g., STTU755_CREATOR_BLACK)
- **name**: Human-readable product name
- **category**: Product category (t-shirts, hoodies, etc.)
- **product_type**: Type of product (t-shirt, hoodie, etc.)
- **placement**: Default placement area (front_chest, back_full, etc.)
- **print_area**: Coordinates and size of printable area (x, y, width, height)
- **safe_zone**: Safe zone within print area with margins
- **fabric_type**: Default fabric type (cotton, polyester, canvas, tri_blend)
- **available_views**: List of available view angles (flat, worn, closeup)
- **rotation**: Rotation angle if placement is angled (degrees)

## Notes

- Images should be PNG format with transparency
- Recommended resolution: 3000x4000px minimum
- Masks should be grayscale (white = printable, black = not printable)
- Template files are proprietary - do not commit to public repositories
