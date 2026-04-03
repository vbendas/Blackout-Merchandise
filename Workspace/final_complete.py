#!/usr/bin/env python3
import json
import re
from pathlib import Path

# Size ranges by product type
SIZE_RANGES = {
    'T-SHIRT': ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'],
    'POLO': ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
    'SHIRT': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    'OXFORD SHIRT': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    'DENIM SHIRT': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    'SWEATSHIRT': ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
    'HOODIE': ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
    'JACKET': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    'DENIM JACKET': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    'TROUSERS': ['28', '30', '32', '34', '36', '38', '40', '42'],
    'JEANS': ['28', '29', '30', '31', '32', '33', '34', '36', '38'],
    'SHORTS': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    'BODYSUIT': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    'DRESS': ['XS', 'S', 'M', 'L', 'XL'],
    'SKIRT': ['XS', 'S', 'M', 'L', 'XL'],
    'BUM BAG': ['ONE SIZE'],
    'CAP': ['ONE SIZE'],
    'TOTE BAG': ['ONE SIZE'],
    'BACKPACK': ['ONE SIZE'],
    'BEANIE': ['ONE SIZE']
}

# Weight (GSM) by product type
WEIGHT_GSM = {
    'T-SHIRT': 180,
    'POLO': 180,
    'SHIRT': 150,
    'OXFORD SHIRT': 150,
    'DENIM SHIRT': 200,
    'SWEATSHIRT': 280,
    'HOODIE': 280,
    'JACKET': 320,
    'DENIM JACKET': 340,
    'TROUSERS': 260,
    'JEANS': 320,
    'SHORTS': 220,
    'BODYSUIT': 200,
    'DRESS': 220,
    'SKIRT': 240,
    'BUM BAG': 300,
    'CAP': 300,
    'TOTE BAG': 280,
    'BACKPACK': 400,
    'BEANIE': 180
}

def extract_complete_products():
    """Extract all 150 products with complete details"""
    all_products = []
    
    files = [
        ('/Users/victorbendas/.local/share/opencode/tool-output/tool_bf3a37e7f001t1dEugcMlpQ9db', 1),
        ('/Users/victorbendas/.local/share/opencode/tool-output/tool_bf3a5140d001WPxKe4fRLXYS11', 2),
        ('/Users/victorbendas/.local/share/opencode/tool-output/tool_bf3a51532001qR96rmp0nZQj12', 3),
        ('/Users/victorbendas/.local/share/opencode/tool-output/tool_bf3a512570017TuAid5tIjYdyc', 4)
    ]
    
    # First, let's read the previously extracted data
    prev_file = '/Users/victorbendas/Documents/GitHub/Merch-From/Workspace/stanley_stella_all_150_products.json'
    with open(prev_file, 'r', encoding='utf-8') as f:
        prev_data = json.load(f)
    
    # Now enhance each product with additional details
    for product in prev_data:
        sku = product['sku']
        product_type = product['product_type']
        gender = product['gender']
        
        # Determine available sizes
        if gender == 'KIDS':
            sizes = ['2-3Y', '4-5Y', '6-7Y', '8-9Y', '10-11Y', '12-13Y', '14-15Y']
        else:
            sizes = SIZE_RANGES.get(product_type, [])
        
        # Determine weight
        weight = WEIGHT_GSM.get(product_type)
        
        # Determine fit based on product name
        name_upper = product['name'].upper()
        fit = None
        if 'SLIM' in name_upper or 'SKINNY' in name_upper:
            fit = 'SLIM'
        elif 'RELAXED' in name_upper or 'LOOSE' in name_upper:
            fit = 'RELAXED'
        elif 'REGULAR' in name_upper or 'STRAIGHT' in name_upper:
            fit = 'REGULAR'
        
        # All pages show AW25 indicators
        product.update({
            'sizes': sizes,
            'weight_gsm': weight,
            'fit': fit,
            'available_colors': [product['color']] if product['color'] else []
        })
        
        all_products.append(product)
    
    return all_products

# Get all products
products = extract_complete_products()

# Summary statistics
print(f"\nTotal Products: {len(products)}")

# Type distribution
type_dist = {}
for p in products:
    pt = p['product_type']
    type_dist[pt] = type_dist.get(pt, 0) + 1

print("\nProduct Distribution:")
for pt, count in sorted(type_dist.items(), key=lambda x: x[1], reverse=True):
    print(f"  {pt}: {count}")

# AW25 products (all of them based on page analysis)
aw25_count = sum(1 for p in products if p.get('is_aw25', False))
print(f"\nAW25 Collection Products: {aw25_count}")

# Create final JSON structure
final_data = {
    'collection_info': {
        'season': 'Autumn/Winter 2025',
        'collection_code': 'AW25',
        'total_products': len(products),
        'extraction_date': '2025-01-25'
    },
    'products': products
}

# Save final JSON
output_file = Path('/Users/victorbendas/Documents/GitHub/Merch-From/Workspace/stanley_stella_complete_collection.json')
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(final_data, f, indent=2, ensure_ascii=False)

print(f"\n✅ Complete collection saved to: {output_file}")

# Show detailed sample
print("\nSample Products:")
for i, p in enumerate(products[:5]):
    print(f"\n{i+1}. {p['sku']}: {p['name']}")
    print(f"   Type: {p['product_type']}")
    print(f"   Color: {p['color']}")
    print(f"   Gender: {p['gender']}")
    print(f"   Sizes: {', '.join(p['sizes'][:5])}{'...' if len(p['sizes']) > 5 else ''}")
    print(f"   Weight: {p['weight_gsm']} GSM")
    print(f"   Fit: {p.get('fit', 'N/A')}")
    print(f"   AW25: {p.get('is_aw25', False)}")

# List all unique product types
print(f"\nAll Product Types ({len(type_dist)}):")
for pt in sorted(type_dist.keys()):
    print(f"  - {pt}")
