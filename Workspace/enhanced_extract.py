#!/usr/bin/env python3
import json
import re
from pathlib import Path

# Common size ranges for Stanley/Stella
COMMON_SIZES = {
    'T-SHIRT': ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'],
    'POLO': ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
    'SHIRT': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    'SWEATSHIRT': ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
    'HOODIE': ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
    'JACKET': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    'TROUSERS': ['28', '30', '32', '34', '36', '38', '40', '42'],
    'JEANS': ['28', '29', '30', '31', '32', '33', '34', '36', '38'],
    'SHORTS': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    'KIDS': ['2-3Y', '4-5Y', '6-7Y', '8-9Y', '10-11Y', '12-13Y', '14-15Y']
}

# Common GSM weights by product type
WEIGHT_MAP = {
    'T-SHIRT': 180,
    'POLO': 180,
    'SHIRT': 150,
    'SWEATSHIRT': 280,
    'HOODIE': 280,
    'JACKET': 320,
    'TROUSERS': 260,
    'JEANS': 320,
    'SHORTS': 220,
    'KIDS': 160
}

def extract_all_products():
    """Extract all products with enhanced details"""
    all_products = []
    
    files = [
        ('/Users/victorbendas/.local/share/opencode/tool-output/tool_bf3a37e7f001t1dEugcMlpQ9db', 1),
        ('/Users/victorbendas/.local/share/opencode/tool-output/tool_bf3a5140d001WPxKe4fRLXYS11', 2),
        ('/Users/victorbendas/.local/share/opencode/tool-output/tool_bf3a51532001qR96rmp0nZQj12', 3),
        ('/Users/victorbendas/.local/share/opencode/tool-output/tool_bf3a512570017TuAid5tIjYdyc', 4)
    ]
    
    # All products appear to be from AW25 collection based on page detection
    # Let's verify this more carefully
    collection_info = {}
    
    for file_path, page_num in files:
        with open(file_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Check for specific AW25 indicators
        collection_pattern = r'(AW25|Autumn\s*Winter\s*2025|Fall\s*Winter\s*2025|New\s*Collection[^<]*)'
        collection_matches = re.findall(collection_pattern, html_content, re.IGNORECASE)
        
        # Extract season/collection info
        season_pattern = r'(season|collection)[^<]*(AW\d+|Autumn|Winter|Fall|Summer|Spring)'
        season_matches = re.findall(season_pattern, html_content, re.IGNORECASE)
        
        collection_info[page_num] = {
            'aw25_indicators': collection_matches,
            'season_info': season_matches
        }
        
        # Find all products
        product_pattern = r'<div class="product-card item product product-item "[^>]*data-sku="(ST[^"]+)"[^>]*>.*?</a>.*?</div></li>'
        products = re.finditer(product_pattern, html_content, re.DOTALL)
        
        for product_match in products:
            sku = re.search(r'data-sku="(ST[^"]+)"', product_match.group()).group(1)
            
            # Extract the full product block
            block_start = product_match.start()
            block_end = html_content.find('</li>', block_start)
            if block_end == -1:
                continue
            block = html_content[block_start:block_end + 5]
            
            # Extract URL
            url_match = re.search(r'href="([^"]+)"', block)
            url = url_match.group(1) if url_match else ''
            
            # Extract image details
            img_pattern = r'src="([^"]+TechnicalNames/[^"]+)".*?(?:data-img="([^"]+)")?.*?(?:data-hover-img="([^"]+)")?'
            img_matches = re.search(img_pattern, block)
            
            # Extract alt/title
            alt_match = re.search(r'alt="([^"]+)"', block)
            title_match = re.search(r'title="([^"]+)"', block)
            
            alt_text = alt_match.group(1) if alt_match else ''
            title_text = title_match.group(1) if title_match else ''
            
            # Use title as primary source
            text_to_parse = title_text.replace('&#x20;', ' ')
            
            # Parse product information
            parts = text_to_parse.split(' - ')
            
            product_name = parts[0].strip() if len(parts) > 0 else ''
            color = parts[1].strip() if len(parts) > 1 else ''
            
            # Determine product type
            type_part = parts[2].upper() if len(parts) > 2 else ''
            product_type = 'UNKNOWN'
            
            type_mapping = {
                'TEE-SHIRTS': 'T-SHIRT',
                'POLOS': 'POLO',
                'OXFORD SHIRTS': 'OXFORD SHIRT',
                'DENIM SHIRTS': 'DENIM SHIRT',
                'SHIRTS': 'SHIRT',
                'SWEATSHIRTS': 'SWEATSHIRT',
                'HOODIES': 'HOODIE',
                'JACKETS': 'JACKET',
                'TROUSERS': 'TROUSERS',
                'JEANS': 'JEANS',
                'SHORTS': 'SHORTS',
                'BODYSUITS': 'BODYSUIT',
                'DRESSES': 'DRESS',
                'SKIRTS': 'SKIRT',
                'BUM BAGS': 'BUM BAG',
                'CAPS': 'CAP',
                'TOTES': 'TOTE BAG',
                'BACKPACKS': 'BACKPACK',
                'BEANIES': 'BEANIE'
            }
            
            for key, value in type_mapping.items():
                if key in type_part:
                    product_type = value
                    break
            
            # Gender detection
            gender_part = parts[3].upper() if len(parts) > 3 else ''
            gender = 'UNISEX'
            
            if 'MEN' in gender_part:
                gender = 'MEN'
            elif 'WOMEN' in gender_part:
                gender = 'WOMEN'
            elif 'KIDS' in gender_part:
                gender = 'KIDS'
            elif 'UNISEX' in gender_part:
                gender = 'UNISEX'
            
            # Determine available colors from the collection (simplified)
            colors = [color] if color else []
            
            # Determine available sizes (based on product type and gender)
            if gender == 'KIDS':
                sizes = COMMON_SIZES.get('KIDS', [])
            else:
                sizes = COMMON_SIZES.get(product_type, [])
            
            # Determine weight (GSM)
            weight = WEIGHT_MAP.get(product_type)
            
            # Determine fit (if applicable)
            fit = None
            if 'SLIM' in product_name.upper():
                fit = 'SLIM'
            elif 'RELAXED' in product_name.upper():
                fit = 'RELAXED'
            elif 'REGULAR' in product_name.upper():
                fit = 'REGULAR'
            
            # Check if this is specifically AW25
            is_aw25 = bool(collection_matches or season_matches)
            
            # Get proper image URL
            image_url = ''
            if img_matches:
                image_url = img_matches.group(1)
                # Fix relative URLs
                if image_url.startswith('packshot'):
                    image_url = re.search(r'src="([^"]+)"', block).group(1)
            
            product = {
                'name': product_name,
                'sku': sku,
                'url': url,
                'product_type': product_type,
                'colors': colors,
                'color': color,
                'sizes': sizes,
                'weight_gsm': weight,
                'fit': fit,
                'gender': gender,
                'image_url': image_url,
                'is_aw25': is_aw25,
                'page': page_num,
                'collection': 'AW25' if is_aw25 else 'REGULAR'
            }
            
            all_products.append(product)
    
    return all_products, collection_info

# Extract all products
products, collection_info = extract_all_products()

print(f"\nCollection Information by Page:")
for page, info in collection_info.items():
    print(f"  Page {page}: AW25 indicators = {bool(info['aw25_indicators'])}, Season info = {info['season_info']}")

# Product statistics
print(f"\nTotal products extracted: {len(products)}")

# Type distribution
type_counts = {}
for p in products:
    pt = p['product_type']
    type_counts[pt] = type_counts.get(pt, 0) + 1

print("\nProduct Types:")
for pt, count in sorted(type_counts.items(), key=lambda x: x[1], reverse=True)[:15]:
    print(f"  {pt}: {count}")

# AW25 verification
aw25_count = sum(1 for p in products if p['is_aw25'])
print(f"\nAW25 Products: {aw25_count}/{len(products)}")

# Save enhanced JSON
output_file = Path('/Users/victorbendas/Documents/GitHub/Merch-From/Workspace/stanley_stella_complete_enhanced.json')
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump({
        'total_products': len(products),
        'aw25_products': aw25_count,
        'collection_info': collection_info,
        'products': products
    }, f, indent=2, ensure_ascii=False)

print(f"\nSaved enhanced data to: {output_file}")

# Sample display
print("\nSample products:")
for p in products[:5]:
    print(f"\n  {p['sku']}: {p['name']}")
    print(f"    Type: {p['product_type']}")
    print(f"    Color: {p['color']}")
    print(f"    Gender: {p['gender']}")
    print(f"    Sizes: {p['sizes'][:5]}{'...' if len(p['sizes']) > 5 else ''}")
    print(f"    Weight: {p['weight_gsm']} GSM")
    print(f"    AW25: {p['is_aw25']}")
